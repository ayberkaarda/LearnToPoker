// Generic poker hand state machine. Pure-ish: every function returns a NEW state (deep-cloned).
// Drives Texas Hold'em, Omaha, Five-Card Draw and Seven-Card Stud via variant configs.

import { createRng, newShuffledDeck } from './deck.js';
import { bestOf, bestOmaha, evaluate5, describeHand } from './evaluator.js';
import {
  LIMIT,
  newRound,
  legalActions,
  applyAction,
  computePots,
  inHand,
  canAct,
  commit,
  nextActor,
  playersWhoCanAct,
  totalPot,
} from './betting.js';
import { getVariant } from './variants/index.js';

export const PHASE = {
  IDLE: 'idle',
  BLINDS: 'blinds',
  DEAL: 'deal',
  BETTING: 'betting',
  DRAW: 'draw',
  SHOWDOWN: 'showdown',
  COMPLETE: 'complete',
};

const SUIT_ORDER = { c: 0, d: 1, h: 2, s: 3 };

function clone(state) {
  return structuredClone(state);
}

export function createGame({ variantId, players, startingStack = 1000, seed = Date.now() % 2147483647 }) {
  const variant = getVariant(variantId);
  if (players.length < 2) throw new Error('need 2+ players');
  if (players.length > variant.maxPlayers) throw new Error('too many players');
  return {
    variantId,
    variant,
    seed,
    rngCalls: 0,
    handNumber: 0,
    dealerIdx: players.length - 1,
    players: players.map((p, i) => ({
      id: i,
      name: p.name,
      isHuman: !!p.isHuman,
      personality: p.personality || { aggression: 0.5, looseness: 0.5 },
      stack: p.stack ?? startingStack,
      cards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      sittingOut: false,
      lastAction: null,
      discardCount: null,
    })),
    deck: [],
    board: [],
    phase: PHASE.IDLE,
    streetIdx: -1,
    betting: null,
    awaiting: null,
    drawQueue: [],
    log: [],
    result: null,
  };
}

// ----- RNG that survives cloning: we re-create from seed + call count -----
function rngFor(state) {
  const rng = createRng(state.seed + state.handNumber * 7919);
  for (let i = 0; i < state.rngCalls; i++) rng();
  return () => {
    state.rngCalls += 1;
    return rng();
  };
}

function pushLog(state, entry) {
  state.log.push({ hand: state.handNumber, street: currentStreet(state)?.name ?? null, ...entry });
}

export function currentStreet(state) {
  return state.variant.streets[state.streetIdx] || null;
}

function seatAfter(state, idx, pred = () => true) {
  const n = state.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (idx + k) % n;
    if (pred(state.players[i])) return i;
  }
  return -1;
}

function activePlayers(state) {
  return state.players.filter(inHand).length;
}

/** Begin a new hand. Returns new state in BLINDS phase. */
export function startHand(prev) {
  const state = clone(prev);
  state.handNumber += 1;
  state.rngCalls = 0;
  // players with 0 chips sit out (rebuy handled by UI)
  for (const p of state.players) {
    p.sittingOut = p.stack <= 0;
    p.cards = [];
    p.bet = 0;
    p.totalBet = 0;
    p.folded = false;
    p.allIn = false;
    p.lastAction = null;
    p.discardCount = null;
  }
  const n = state.players.length;
  const seated = state.players.filter((p) => !p.sittingOut).length;
  if (seated < 2) throw new Error('not enough players with chips');
  state.dealerIdx = seatAfter(state, state.dealerIdx, (p) => !p.sittingOut);
  state.deck = newShuffledDeck(rngFor(state));
  state.board = [];
  state.streetIdx = -1;
  state.betting = null;
  state.awaiting = null;
  state.drawQueue = [];
  state.result = null;
  state.log = [];
  state.phase = PHASE.BLINDS;
  pushLog(state, { type: 'handStart', dealerIdx: state.dealerIdx, hand: state.handNumber });
  return state;
}

function postBlinds(state) {
  const v = state.variant;
  const n = state.players.length;
  const seated = (p) => !p.sittingOut;
  if (v.ante) {
    for (const p of state.players) {
      if (!seated(p)) continue;
      const amt = commit(p, v.ante);
      pushLog(state, { type: 'ante', playerIdx: p.id, amount: amt });
    }
    for (const p of state.players) p.bet = 0; // antes go straight to the pot, not the round bet
  }
  state.sbIdx = -1;
  state.bbIdx = -1;
  if (v.blinds) {
    const headsUp = state.players.filter(seated).length === 2;
    const sbIdx = headsUp ? state.dealerIdx : seatAfter(state, state.dealerIdx, seated);
    const bbIdx = seatAfter(state, sbIdx, seated);
    const sbAmt = commit(state.players[sbIdx], v.blinds.sb);
    pushLog(state, { type: 'blind', kind: 'sb', playerIdx: sbIdx, amount: sbAmt });
    const bbAmt = commit(state.players[bbIdx], v.blinds.bb);
    pushLog(state, { type: 'blind', kind: 'bb', playerIdx: bbIdx, amount: bbAmt });
    state.sbIdx = sbIdx;
    state.bbIdx = bbIdx;
  }
  state.phase = PHASE.DEAL;
  state.streetIdx = 0;
}

function dealCard(state, faceUp = false) {
  const c = state.deck.pop();
  return { ...c, faceUp };
}

function dealStreet(state) {
  const street = currentStreet(state);
  const deal = street.deal;
  const n = state.players.length;
  if (deal?.hole) {
    for (let k = 0; k < deal.hole; k++) {
      for (let s = 1; s <= n; s++) {
        const i = (state.dealerIdx + s) % n;
        const p = state.players[i];
        if (!p.sittingOut) p.cards.push(dealCard(state, false));
      }
    }
    pushLog(state, { type: 'dealHole', count: deal.hole });
  }
  if (deal?.community) {
    // burn
    state.deck.pop();
    const cards = [];
    for (let k = 0; k < deal.community; k++) cards.push(dealCard(state, true));
    state.board.push(...cards);
    pushLog(state, { type: 'dealCommunity', street: street.name, cards: cards.map((c) => c.id) });
  }
  if (deal?.stud) {
    for (const up of deal.stud) {
      for (let s = 1; s <= n; s++) {
        const i = (state.dealerIdx + s) % n;
        const p = state.players[i];
        if (inHand(p)) p.cards.push(dealCard(state, up));
      }
    }
    pushLog(state, { type: 'dealStud', street: street.name, faceUp: deal.stud });
  }
}

function upCardsEval(p) {
  const ups = p.cards.filter((c) => c.faceUp);
  if (ups.length >= 5) return bestOf(ups).score;
  // partial: rank by pair/trips then high cards. Build pseudo evaluation.
  const counts = {};
  for (const c of ups) counts[c.rank] = (counts[c.rank] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => [Number(r), c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let score = 0;
  for (const [r, c] of groups) score = score * 1000 + c * 15 + r;
  const high = ups.map((c) => c.rank).sort((a, b) => b - a);
  const top = high[0] || 0;
  const topSuit = ups.find((c) => c.rank === top)?.suit || 'c';
  return score * 100 + SUIT_ORDER[topSuit];
}

function firstToAct(state, street) {
  const n = state.players.length;
  switch (street.firstToAct) {
    case 'afterBlinds': {
      const headsUp = state.players.filter((p) => !p.sittingOut).length === 2;
      if (headsUp) return state.dealerIdx; // dealer is SB and acts first preflop
      return seatAfter(state, state.bbIdx, canAct);
    }
    case 'afterDealer':
      return seatAfter(state, state.dealerIdx, canAct);
    case 'bringIn': {
      // lowest up card (rank, then suit c<d<h<s) posts bring-in
      let best = -1;
      let bestKey = Infinity;
      for (const p of state.players) {
        if (!inHand(p)) continue;
        const up = p.cards.find((c) => c.faceUp);
        const key = up.rank * 10 + SUIT_ORDER[up.suit];
        if (key < bestKey) {
          bestKey = key;
          best = p.id;
        }
      }
      return best;
    }
    case 'bestShowing': {
      let best = -1;
      let bestKey = -1;
      for (const p of state.players) {
        if (!canAct(p)) continue;
        const key = upCardsEval(p);
        if (key > bestKey) {
          bestKey = key;
          best = p.id;
        }
      }
      return best;
    }
    default:
      return seatAfter(state, state.dealerIdx, canAct);
  }
}

function betSizeFor(state, street) {
  const v = state.variant;
  if (v.limit !== LIMIT.FIXED_LIMIT) return v.blinds.bb;
  return street.betSize === 'big' ? v.bets.big : v.bets.small;
}

function beginBetting(state) {
  const v = state.variant;
  const street = currentStreet(state);
  const betSize = betSizeFor(state, street);

  let first = firstToAct(state, street);
  let currentBet = 0;
  let acted = [];
  let lastAggressor = -1;

  if (street.firstToAct === 'afterBlinds' && v.blinds) {
    // blinds were committed in postBlinds and still sit in p.bet
    currentBet = v.blinds.bb;
    lastAggressor = state.bbIdx;
  }
  if (street.firstToAct === 'bringIn') {
    const bi = state.players[first];
    const amt = commit(bi, v.bringIn);
    pushLog(state, { type: 'bringIn', playerIdx: first, amount: amt });
    bi.lastAction = { type: 'bringIn', amount: amt };
    currentBet = amt;
    acted = [first];
    lastAggressor = first;
    first = nextActor(state.players, first);
  }
  state.betting = newRound({ firstIdx: first, currentBet, minRaise: betSize, betSize, lastAggressor, acted });
  // Skip the round when nobody (or only one player who owes nothing) can act
  const actors = state.players.filter(canAct);
  if (first === -1 || actors.length === 0 || (actors.length === 1 && actors[0].bet >= currentBet)) {
    state.betting.complete = true;
    state.betting.toAct = -1;
  }
  state.phase = PHASE.BETTING;
  setAwaiting(state);
}

function setAwaiting(state) {
  if (state.phase === PHASE.BETTING) {
    if (state.betting.complete || state.betting.toAct === -1) {
      state.awaiting = null;
      return;
    }
    state.awaiting = {
      kind: 'bet',
      playerIdx: state.betting.toAct,
      actions: legalActions(state.players, state.betting, state.variant.limit),
    };
  } else if (state.phase === PHASE.DRAW) {
    if (state.drawQueue.length === 0) {
      state.awaiting = null;
      return;
    }
    const idx = state.drawQueue[0];
    state.awaiting = { kind: 'draw', playerIdx: idx, maxDiscard: Math.min(5, state.deck.length) };
  } else state.awaiting = null;
}

function afterBettingRound(state) {
  // called when betting round complete
  for (const p of state.players) p.bet = 0;
  if (activePlayers(state) <= 1) {
    state.phase = PHASE.SHOWDOWN;
    return;
  }
  const nextIdx = state.streetIdx + 1;
  if (nextIdx >= state.variant.streets.length) {
    state.phase = PHASE.SHOWDOWN;
    return;
  }
  state.streetIdx = nextIdx;
  const street = currentStreet(state);
  if (street.draw) {
    state.phase = PHASE.DRAW;
    const n = state.players.length;
    state.drawQueue = [];
    for (let s = 1; s <= n; s++) {
      const i = (state.dealerIdx + s) % n;
      if (inHand(state.players[i])) state.drawQueue.push(i);
    }
    setAwaiting(state);
  } else {
    state.phase = PHASE.DEAL;
  }
}

function showdownEval(state, p) {
  const v = state.variant;
  const cards = p.cards.map(({ faceUp, ...c }) => c);
  const board = state.board.map(({ faceUp, ...c }) => c);
  if (v.showdown === 'omaha') return bestOmaha(cards, board);
  const all = [...cards, ...board];
  if (all.length === 5) return evaluate5(all);
  return bestOf(all);
}

function showdown(state) {
  const pots = computePots(state.players);
  const alive = state.players.filter(inHand);
  const result = { pots: [], hands: {}, uncontested: alive.length === 1, winners: [] };
  const totalWon = {};
  if (alive.length === 1) {
    const w = alive[0];
    const amount = pots.reduce((s, p) => s + p.amount, 0);
    w.stack += amount;
    result.pots.push({ amount, winners: [w.id], eligible: [w.id] });
    totalWon[w.id] = amount;
  } else {
    for (const p of alive) {
      const e = showdownEval(state, p);
      result.hands[p.id] = { ...e, description: describeHand(e) };
      for (const c of p.cards) c.faceUp = true;
    }
    for (const pot of pots) {
      let bestScore = -1;
      let winners = [];
      for (const idx of pot.eligible) {
        const e = result.hands[idx];
        if (!e) continue;
        if (e.score > bestScore) {
          bestScore = e.score;
          winners = [idx];
        } else if (e.score === bestScore) winners.push(idx);
      }
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount - share * winners.length;
      // odd chip to first winner after dealer
      const ordered = winners.slice().sort((a, b) => ((a - state.dealerIdx + 99 * state.players.length) % state.players.length) - ((b - state.dealerIdx + 99 * state.players.length) % state.players.length));
      for (const w of ordered) {
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        state.players[w].stack += share + extra;
        totalWon[w] = (totalWon[w] || 0) + share + extra;
      }
      result.pots.push({ amount: pot.amount, winners: ordered, eligible: pot.eligible, hand: result.hands[ordered[0]]?.description });
    }
  }
  result.winners = Object.entries(totalWon).map(([idx, amount]) => ({ playerIdx: Number(idx), amount }));
  for (const p of state.players) {
    p.bet = 0;
    p.totalBet = 0;
  }
  state.result = result;
  state.phase = PHASE.COMPLETE;
  state.awaiting = null;
  pushLog(state, { type: 'showdown', result });
}

/**
 * Advance one discrete step when no input is required. Returns new state.
 * If state.awaiting is set, returns state unchanged (caller must call act()).
 */
export function step(prev) {
  if (prev.awaiting) return prev;
  const state = clone(prev);
  switch (state.phase) {
    case PHASE.IDLE:
      return startHand(state);
    case PHASE.BLINDS:
      postBlinds(state);
      return state;
    case PHASE.DEAL:
      dealStreet(state);
      beginBetting(state);
      return state;
    case PHASE.BETTING:
      if (state.betting?.complete) {
        afterBettingRound(state);
        return state;
      }
      setAwaiting(state);
      return state;
    case PHASE.DRAW:
      if (state.drawQueue.length === 0) {
        beginBetting(state);
        return state;
      }
      setAwaiting(state);
      return state;
    case PHASE.SHOWDOWN:
      showdown(state);
      return state;
    case PHASE.COMPLETE:
      return state;
    default:
      throw new Error('bad phase ' + state.phase);
  }
}

/** Apply a player's response to state.awaiting. */
export function act(prev, action) {
  if (!prev.awaiting) throw new Error('nothing awaited');
  const state = clone(prev);
  const idx = state.awaiting.playerIdx;
  if (state.awaiting.kind === 'bet') {
    const { betting, applied } = applyAction(state.players, state.betting, state.variant.limit, action);
    state.betting = betting;
    state.players[idx].lastAction = applied;
    pushLog(state, { type: 'action', playerIdx: idx, action: applied.type, amount: applied.amount, raiseTo: applied.raiseTo ?? null, pot: totalPot(state.players) });
    state.awaiting = null;
    if (!betting.complete) setAwaiting(state);
    return state;
  }
  if (state.awaiting.kind === 'draw') {
    const discard = new Set(action.discard || []);
    const p = state.players[idx];
    const kept = p.cards.filter((c) => !discard.has(c.id));
    const count = p.cards.length - kept.length;
    const fresh = [];
    for (let k = 0; k < count; k++) fresh.push(dealCard(state, false));
    p.cards = [...kept, ...fresh];
    p.discardCount = count;
    p.lastAction = { type: 'draw', amount: count };
    pushLog(state, { type: 'draw', playerIdx: idx, count });
    state.drawQueue.shift();
    state.awaiting = null;
    setAwaiting(state);
    return state;
  }
  throw new Error('bad awaiting');
}

/** Run steps until input is needed or hand completes. */
export function runUntilInput(state, maxSteps = 200) {
  let s = state;
  for (let i = 0; i < maxSteps; i++) {
    if (s.awaiting || s.phase === PHASE.COMPLETE) return s;
    s = step(s);
  }
  return s;
}

/** Hand summary helpers for UI */
export function potSize(state) {
  return totalPot(state.players);
}

export function visibleCards(state, viewerIdx, p) {
  // which of p's cards may viewerIdx see
  if (state.phase === PHASE.COMPLETE && state.result && !state.result.uncontested && inHand(p)) return p.cards.map((c) => ({ ...c, faceUp: true }));
  if (p.id === viewerIdx) return p.cards.map((c) => ({ ...c, faceUp: true }));
  return p.cards;
}
