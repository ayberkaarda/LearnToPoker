// Regression tests for rule fixes found in the R1 engine review.
import { describe, it, expect } from 'vitest';
import { createGame, startHand, step, act, runUntilInput, PHASE, showingRank, compareShowing } from '../game.js';
import { newRound, legalActions, applyAction, canAct, LIMIT } from '../betting.js';
import { botDecide, legalize, callPotOdds } from '../bots.js';
import { unknownCards } from '../equity.js';
import { evaluateLowA5, evaluateLow27, CATEGORY } from '../evaluator.js';
import { parseCard, parseCards } from '../deck.js';

function mk(stacks) {
  return stacks.map((stack, id) => ({ id, stack, bet: 0, totalBet: 0, folded: false, allIn: false, sittingOut: false }));
}
function bots(n, stacks) {
  return Array.from({ length: n }, (_, i) => ({ name: 'P' + i, isHuman: false, stack: stacks?.[i], personality: { aggression: 0.5, looseness: 0.5 } }));
}
const up = (str) => ({ ...parseCard(str), faceUp: true });
const down = (str) => ({ ...parseCard(str), faceUp: false });
const total = (s) => s.players.reduce((a, p) => a + p.stack + p.totalBet, 0);

/** Play a seven-card stud hand (all calls/checks) until the fourth-street cards are about to be dealt. */
function studBeforeFourth(seed = 3) {
  let s = runUntilInput(createGame({ variantId: 'sevenCardStud', players: bots(3), seed }));
  let guard = 0;
  while (!(s.phase === PHASE.DEAL && s.streetIdx === 1) && guard++ < 50) {
    if (s.awaiting) s = act(s, { type: s.awaiting.actions.check ? 'check' : 'call' });
    else s = step(s);
  }
  return s;
}
/** Give seat dealer+k the up cards ups[k-1] (third + fourth street) and deal fourth street. */
function dealFourth(s, ups) {
  const n = s.players.length;
  const tail = [];
  ups.forEach((pair, k) => {
    const i = (s.dealerIdx + k + 1) % n;
    s.players[i].cards = [down('2h'), down('3h'), up(pair[0])];
    tail.push(parseCard(pair[1]));
  });
  s.deck = [...s.deck.slice(0, 10), ...tail.reverse()];
  return step(s);
}

describe('fix 1: stud best showing hand', () => {
  it('a pair of deuces beats K-Q showing', () => {
    const pair = showingRank([up('2c'), up('2d')]);
    const kq = showingRank([up('Ks'), up('Qs')]);
    expect(compareShowing(pair, kq)).toBeGreaterThan(0);
    expect(compareShowing(showingRank([up('9c'), up('9d'), up('3s')]), showingRank([up('Ac'), up('Kd'), up('Qs')]))).toBeGreaterThan(0);
  });
  it('suits never break a tie', () => {
    expect(compareShowing(showingRank([up('Ks'), up('Qh')]), showingRank([up('Kc'), up('Qd')]))).toBe(0);
  });
  it('fourth street: the pair acts first, not the higher unpaired cards', () => {
    let s = studBeforeFourth();
    s = dealFourth(s, [['Ks', 'Qs'], ['2c', '2d'], ['9h', '7c']]);
    expect(s.awaiting.playerIdx).toBe((s.dealerIdx + 2) % 3);
  });
  it('fourth street tie goes to the first seat left of the dealer', () => {
    let s = studBeforeFourth();
    s = dealFourth(s, [['Kc', 'Qd'], ['Ks', 'Qh'], ['9h', '7c']]);
    expect(s.awaiting.playerIdx).toBe((s.dealerIdx + 1) % 3);
  });
});

describe('fix 2: short all-in does not reopen raising', () => {
  it('players who already acted may only call or fold', () => {
    const players = mk([500, 500, 150, 500]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'bet', amount: 100 }));
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'call' }));
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'allin' }));
    expect(b.currentBet).toBe(150);
    // player 3 has not acted yet: full raise rights
    expect(b.toAct).toBe(3);
    expect(legalActions(players, b, LIMIT.NO_LIMIT).raise).not.toBeNull();
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'call' }));
    // players 0 and 1 already acted and only faced a short raise
    expect(b.toAct).toBe(0);
    const la = legalActions(players, b, LIMIT.NO_LIMIT);
    expect(la.raise).toBeNull();
    expect(la.call.amount).toBe(50);
    expect(() => applyAction(players, b, LIMIT.NO_LIMIT, { type: 'raise', amount: 400 })).toThrow();
  });
  it('several short all-ins that add up to a full raise do reopen', () => {
    const players = mk([500, 150, 210, 500]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'bet', amount: 100 }));
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'allin' })); // to 150
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'allin' })); // to 210
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'call' }));
    expect(b.toAct).toBe(0);
    // 210 - 100 = 110 >= last full raise (100)
    expect(legalActions(players, b, LIMIT.NO_LIMIT).raise).not.toBeNull();
  });
});

describe('fix 3: heads-up blind all-in', () => {
  it('never awaits the small blind who is all-in from posting', () => {
    const s0 = createGame({ variantId: 'holdem', players: bots(2, [5, 1000]), seed: 4 });
    let s = s0;
    let guard = 0;
    while (s.phase !== PHASE.COMPLETE && guard++ < 50) {
      if (s.awaiting) {
        expect(canAct(s.players[s.awaiting.playerIdx])).toBe(true);
        s = act(s, { type: s.awaiting.actions.check ? 'check' : 'call' });
      } else s = step(s);
    }
    expect(s.phase).toBe(PHASE.COMPLETE);
    expect(s.players[0].stack + s.players[1].stack).toBe(1005);
  });
  it('when the dealer cannot act, the other player is asked first', () => {
    const s = runUntilInput(createGame({ variantId: 'holdem', players: bots(2, [5, 1000]), seed: 4 }));
    // with only one player able to act and nothing owed, the hand runs out without input
    expect(s.awaiting).toBeNull();
    expect(s.phase).toBe(PHASE.COMPLETE);
  });
});

describe('fix 4: draw deck, discard pile and maxDiscard', () => {
  it('six players can all draw five without running out of cards', () => {
    let s = runUntilInput(createGame({ variantId: 'fiveCardDraw', players: bots(6), seed: 8 }));
    let guard = 0;
    while (s.phase !== PHASE.COMPLETE && guard++ < 200) {
      if (s.awaiting?.kind === 'draw') {
        expect(s.awaiting.maxDiscard).toBe(5);
        s = act(s, { type: 'draw', discard: s.players[s.awaiting.playerIdx].cards.map((c) => c.id) });
      } else if (s.awaiting) s = act(s, { type: s.awaiting.actions.check ? 'check' : 'call' });
      else s = step(s);
      const ids = s.players.flatMap((p) => p.cards.map((c) => c.id));
      expect(ids.every(Boolean)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(s.phase).toBe(PHASE.COMPLETE);
    expect(s.reshuffles).toBeGreaterThan(0);
    expect(s.players.every((p) => p.cards.length === 5)).toBe(true);
  });
  it('act() and botDecide respect maxDiscard', () => {
    let s = createGame({ variantId: 'fiveCardDraw', players: bots(3), seed: 3 });
    s.variant = { ...s.variant, maxDiscard: 3 };
    s = runUntilInput(s);
    let guard = 0;
    while (s.awaiting?.kind !== 'draw' && guard++ < 20) s = runUntilInput(act(s, { type: s.awaiting.actions.check ? 'check' : 'call' }));
    expect(s.awaiting.maxDiscard).toBe(3);
    const ids = s.players[s.awaiting.playerIdx].cards.map((c) => c.id);
    expect(() => act(s, { type: 'draw', discard: ids.slice(0, 4) })).toThrow();
    expect(botDecide(s).discard.length).toBeLessThanOrEqual(3);
    expect(() => act(s, { type: 'draw', discard: ids.slice(0, 3) })).not.toThrow();
  });
});

describe('fix 5 + 6: fixed-limit all-in and short all-ins', () => {
  it('all-in at the raise cap only commits the call', () => {
    const players = mk([1000, 1000]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    for (const type of ['bet', 'raise', 'raise', 'raise']) ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type }));
    expect(legalActions(players, b, LIMIT.FIXED_LIMIT).raise).toBeNull();
    let applied;
    ({ betting: b, applied } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'allin' }));
    expect(applied.type).toBe('call');
    expect(players[1].totalBet).toBe(40);
    expect(players[1].allIn).toBe(false);
    expect(b.currentBet).toBe(40);
    expect(b.complete).toBe(true);
  });
  it('all-in below the cap commits only the fixed raise', () => {
    const players = mk([1000, 1000]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'allin' }));
    expect(players[0].totalBet).toBe(10);
    expect(b.currentBet).toBe(10);
  });
  it('a short all-in is not a full raise: no raise count, no reopening', () => {
    const players = mk([1000, 15, 1000]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'bet' }));
    expect(b.raises).toBe(1);
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'allin' }));
    expect(b.currentBet).toBe(15);
    expect(b.raises).toBe(1);
    expect(b.acted).toContain(0);
    // player 2 has not acted: may raise to a full bet above 15
    expect(legalActions(players, b, LIMIT.FIXED_LIMIT).raise.min).toBe(25);
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'call' }));
    const la = legalActions(players, b, LIMIT.FIXED_LIMIT);
    expect(b.toAct).toBe(0);
    expect(la.raise).toBeNull();
    expect(la.call.amount).toBe(5);
  });
});

describe('fix 7: no raise without opponents, uncalled bets refunded', () => {
  it('no raise option when every opponent is all-in', () => {
    const players = mk([1000, 100]);
    let b = newRound({ firstIdx: 1, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'allin' }));
    const la = legalActions(players, b, LIMIT.NO_LIMIT);
    expect(la.call.amount).toBe(100);
    expect(la.raise).toBeNull();
  });
  it('the uncalled part of an all-in is returned before pots are built', () => {
    // seat 0 is dealer/SB heads-up and has the big stack
    let s = runUntilInput(createGame({ variantId: 'holdem', players: bots(2, [1000, 100]), seed: 12 }));
    expect(s.awaiting.playerIdx).toBe(0);
    s = runUntilInput(act(s, { type: 'allin' }));
    expect(s.awaiting.playerIdx).toBe(1);
    expect(s.awaiting.actions.raise).toBeNull();
    s = runUntilInput(act(s, { type: 'call' }));
    expect(s.phase).toBe(PHASE.COMPLETE);
    expect(s.result.refunds).toEqual([{ playerIdx: 0, amount: 900 }]);
    expect(s.result.pots.reduce((a, p) => a + p.amount, 0)).toBe(200);
    expect(s.result.pots.every((p) => p.eligible.length === 2)).toBe(true);
    const winners = s.result.pots[0].winners;
    if (!winners.includes(0)) expect(s.result.winners.find((w) => w.playerIdx === 0)).toBeUndefined();
    expect(s.players[0].stack + s.players[1].stack).toBe(1100);
  });
  it('uncontested: the winner is credited only with chips others put in', () => {
    let s = runUntilInput(createGame({ variantId: 'holdem', players: bots(3), seed: 9 }));
    s = runUntilInput(act(s, { type: 'fold' }));
    s = runUntilInput(act(s, { type: 'fold' }));
    expect(s.result.refunds).toEqual([{ playerIdx: s.bbIdx, amount: 5 }]);
    expect(s.result.winners).toEqual([{ playerIdx: s.bbIdx, amount: 10 }]);
    expect(s.players[s.bbIdx].stack).toBe(1005);
  });
});

describe('fix 8: odd chip', () => {
  it('goes to the first winner left of the dealer, not the dealer', () => {
    let s = runUntilInput(createGame({ variantId: 'holdem', players: bots(3), seed: 5 }));
    const d = s.dealerIdx;
    const a = (d + 1) % 3;
    const f = (d + 2) % 3;
    s = structuredClone(s);
    s.board = parseCards('As Ks Qs Js Ts').map((c) => ({ ...c, faceUp: true }));
    for (const p of s.players) { p.stack = 100; p.bet = 0; p.totalBet = 10; p.folded = false; p.allIn = false; }
    s.players[f].folded = true;
    s.players[f].totalBet = 5;
    s.phase = PHASE.SHOWDOWN;
    s.awaiting = null;
    s = step(s);
    expect(s.result.pots[0].amount).toBe(25);
    expect(s.players[a].stack).toBe(113);
    expect(s.players[d].stack).toBe(112);
  });
});

describe('fix 9: stud bring-in is a decision', () => {
  it('offers bring-in or complete, exposed as call/raise for generic controls', () => {
    const s = runUntilInput(createGame({ variantId: 'sevenCardStud', players: bots(3), seed: 21 }));
    const a = s.awaiting.actions;
    expect(a.bringIn).toEqual({ amount: 5 });
    expect(a.complete).toEqual({ amount: 10 });
    expect(a.call.amount).toBe(5);
    expect(a.raise).toEqual({ min: 10, max: 10, fixed: true, isBet: true });
    expect(a.fold).toBe(false);
    expect(a.check).toBe(false);
  });
  it('posting the bring-in logs a bringIn entry', () => {
    let s = runUntilInput(createGame({ variantId: 'sevenCardStud', players: bots(3), seed: 21 }));
    const bi = s.awaiting.playerIdx;
    s = act(s, { type: 'bringIn' });
    expect(s.betting.currentBet).toBe(5);
    expect(s.players[bi].lastAction.type).toBe('bringIn');
    expect(s.log.at(-1)).toMatchObject({ type: 'bringIn', playerIdx: bi, amount: 5 });
    // the next player may call 5 or complete to 10
    expect(s.awaiting.actions.call.amount).toBe(5);
    expect(s.awaiting.actions.raise.min).toBe(10);
  });
  it('completing makes it a full small bet', () => {
    let s = runUntilInput(createGame({ variantId: 'sevenCardStud', players: bots(3), seed: 21 }));
    s = act(s, { type: 'complete' });
    expect(s.betting.currentBet).toBe(10);
    expect(s.log.at(-1)).toMatchObject({ type: 'action', action: 'bet', raiseTo: 10 });
    expect(s.awaiting.actions.raise.min).toBe(20);
  });
});

describe('fix 10: pot odds use the real call and the winnable pot', () => {
  it('short stack pays only its stack and cannot win side pots', () => {
    const players = mk([30, 890, 890]);
    players[0].totalBet = 10; players[0].bet = 10;
    players[1].totalBet = 110; players[1].bet = 110;
    players[2].totalBet = 110; players[2].bet = 110;
    const actions = { call: { amount: 30, full: false }, toCall: 100 };
    const r = callPotOdds({ players }, 0, actions);
    expect(r.callAmt).toBe(30);
    // after calling 30: 40 + 40 + 40 = 120 winnable
    expect(r.potOdds).toBeCloseTo(30 / 120);
    expect(r.pot).toBe(90);
  });
});

describe('fix 11: dead stud cards', () => {
  it('folded players up cards are not in the unknown deck', () => {
    let s = runUntilInput(createGame({ variantId: 'sevenCardStud', players: bots(3), seed: 21 }));
    s = act(s, { type: 'call' });
    const folder = s.awaiting.playerIdx;
    s = act(s, { type: 'fold' });
    expect(s.players[folder].folded).toBe(true);
    const hero = [0, 1, 2].find((i) => i !== folder);
    const unknown = new Set(unknownCards(s, hero).map((c) => c.id));
    const dead = s.players[folder].cards.filter((c) => c.faceUp);
    expect(dead.length).toBeGreaterThan(0);
    for (const c of dead) expect(unknown.has(c.id)).toBe(false);
    // hidden cards of the folded player stay unknown
    for (const c of s.players[folder].cards.filter((x) => !x.faceUp)) expect(unknown.has(c.id)).toBe(true);
  });
});

describe('fix 12: low evaluators', () => {
  it('2-7: A-5-4-3-2 is ace-high, not a straight', () => {
    const wheel = evaluateLow27(parseCards('Ah 5d 4s 3c 2s'));
    expect(wheel.category).toBe(CATEGORY.HIGH_CARD);
    const kHigh = evaluateLow27(parseCards('Kh 9d 6s 4c 2s'));
    const pair = evaluateLow27(parseCards('2h 2d 3s 4c 5s'));
    const straight = evaluateLow27(parseCards('6h 5d 4s 3c 2s'));
    expect(kHigh.score).toBeLessThan(wheel.score);
    expect(wheel.score).toBeLessThan(pair.score);
    expect(wheel.score).toBeLessThan(straight.score);
  });
  it('2-7: suited A-5-4-3-2 is a flush, not a straight flush', () => {
    expect(evaluateLow27(parseCards('Ah 5h 4h 3h 2h')).category).toBe(CATEGORY.FLUSH);
  });
  it('2-7: pairs compare by pair rank first', () => {
    const lowPair = evaluateLow27(parseCards('3h 3d Ks Qc Js'));
    const highPair = evaluateLow27(parseCards('4h 4d 7s 5c 2s'));
    expect(lowPair.score).toBeLessThan(highPair.score);
  });
  it('A-5: pair < two pair < trips < full house < quads (pair is the least bad)', () => {
    const order = ['Kh Kd Qs Jc Ts', '2h 2d 3s 3c 4s', '2h 2d 2s 3c 4s', '2h 2d 2s 3c 3s', '2h 2d 2s 2c 3s'].map((h) => evaluateLowA5(parseCards(h)).score);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });
  it('A-5: same category compares by the paired rank, then kickers', () => {
    const a = evaluateLowA5(parseCards('Ah Ad 7s 8c 9s'));
    const b = evaluateLowA5(parseCards('2h 2d 3s 4c 5s'));
    expect(a.score).toBeLessThan(b.score);
  });
});

describe('bots only return legal actions', () => {
  it('legalize falls back to check/call/fold', () => {
    expect(legalize({ type: 'raise', amount: 50 }, { check: false, fold: true, call: { amount: 10 }, raise: null }).type).toBe('call');
    expect(legalize({ type: 'bet', amount: 50 }, { check: true, fold: false, call: null, raise: null }).type).toBe('check');
    expect(legalize({ type: 'fold' }, { check: false, fold: false, call: { amount: 5 }, raise: null, bringIn: { amount: 5 } }).type).toBe('call');
    expect(legalize({ type: 'call' }, { check: true, fold: false, call: null, raise: null }).type).toBe('check');
  });
  for (const id of ['holdem', 'omaha', 'fiveCardDraw', 'sevenCardStud']) {
    it(`${id}: every bot decision is allowed by legalActions`, () => {
      let s = createGame({ variantId: id, players: bots(5, [60, 200, 400, 90, 1000]), seed: 77 });
      for (let h = 0; h < 8; h++) {
        if (s.players.filter((p) => p.stack > 0).length < 2) break;
        s = runUntilInput(s);
        let guard = 0;
        while (s.phase !== PHASE.COMPLETE && guard++ < 300) {
          if (s.awaiting) {
            const d = botDecide(s, { samples: 8 });
            if (s.awaiting.kind === 'bet') {
              const a = s.awaiting.actions;
              const ok = (d.type === 'fold' && a.fold) || (d.type === 'check' && a.check) || (d.type === 'call' && a.call) || ((d.type === 'bet' || d.type === 'raise') && a.raise);
              expect(ok).toBeTruthy();
            } else expect(d.discard.length).toBeLessThanOrEqual(s.awaiting.maxDiscard);
            s = act(s, d);
          }
          s = runUntilInput(s);
        }
        expect(s.phase).toBe(PHASE.COMPLETE);
        if (s.players.filter((p) => p.stack > 0).length >= 2) s = startHand(s);
      }
    });
  }
});
