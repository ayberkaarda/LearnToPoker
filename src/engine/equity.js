// Monte Carlo equity estimation shared by bots and the coach.
import { fullDeck, without, shuffle, createRng } from './deck.js';
import { bestOf, bestOmaha, evaluate5, CATEGORY } from './evaluator.js';
import { inHand } from './betting.js';

function strip(c) {
  return { rank: c.rank, suit: c.suit, id: c.id };
}

function evalFor(variant, hole, board) {
  if (variant.showdown === 'omaha') return bestOmaha(hole, board).score;
  const all = [...hole, ...board];
  if (all.length === 5) return evaluate5(all).score;
  return bestOf(all).score;
}

/**
 * Estimate hero's probability of winning (ties count as 1/n) at showdown against all
 * players still in the hand, given what hero can see.
 * Returns { equity, samples, opponents }.
 */
export function estimateEquity(state, heroIdx, samples = 200, seed = 1234) {
  const v = state.variant;
  const hero = state.players[heroIdx];
  const opponents = state.players.filter((p, i) => i !== heroIdx && inHand(p));
  if (opponents.length === 0) return { equity: 1, samples: 0, opponents: 0 };
  const heroCards = hero.cards.map(strip);
  const board = state.board.map(strip);
  const known = [...heroCards, ...board];
  // opponents' face-up cards (stud) are known
  const oppKnown = opponents.map((p) => p.cards.filter((c) => c.faceUp).map(strip));
  for (const k of oppKnown) known.push(...k);
  const unknown = without(fullDeck(), known);
  const rng = createRng(seed + state.handNumber * 31 + heroIdx);

  const targetBoard = v.type === 'community' ? 5 : 0;
  const targetHole = v.type === 'stud' ? 7 : v.holeCards;

  let wins = 0;
  for (let s = 0; s < samples; s++) {
    const deck = shuffle(unknown, rng);
    let ptr = 0;
    const fullBoard = board.slice();
    while (fullBoard.length < targetBoard) fullBoard.push(deck[ptr++]);
    const heroFull = heroCards.slice();
    while (heroFull.length < targetHole) heroFull.push(deck[ptr++]);
    const heroScore = evalFor(v, heroFull, fullBoard);
    let best = heroScore;
    let tiedWith = 1;
    let lost = false;
    for (let o = 0; o < opponents.length; o++) {
      const oppCards = oppKnown[o].slice();
      // opponents' hidden cards count is their total - known
      const need = targetHole - oppCards.length;
      for (let k = 0; k < need; k++) oppCards.push(deck[ptr++]);
      const sc = evalFor(v, oppCards, fullBoard);
      if (sc > best) {
        lost = true;
        break;
      }
      if (sc === best) tiedWith++;
    }
    if (!lost) wins += 1 / tiedWith;
  }
  return { equity: wins / samples, samples, opponents: opponents.length };
}

/** Current made-hand strength (0..1) for display: based on category of best current hand. */
export function currentHandInfo(state, heroIdx) {
  const v = state.variant;
  const hero = state.players[heroIdx];
  const hole = hero.cards.map(strip);
  const board = state.board.map(strip);
  const all = [...hole, ...board];
  if (v.showdown === 'omaha') {
    if (board.length < 3) return null;
    return bestOmaha(hole, board);
  }
  if (all.length < 5) {
    // pre-flop style: describe pairs/high cards
    return null;
  }
  return all.length === 5 ? evaluate5(all) : bestOf(all);
}

/** Heuristic for Five-Card Draw: which cards to discard. Returns card ids to throw away. */
export function drawAdvice(cards) {
  const e = evaluate5(cards);
  const byRank = {};
  for (const c of cards) (byRank[c.rank] ||= []).push(c);
  const groups = Object.values(byRank).sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  if (e.category >= CATEGORY.STRAIGHT) return [];
  if (e.category === CATEGORY.FOUR_OF_A_KIND || e.category === CATEGORY.FULL_HOUSE) return [];
  if (e.category === CATEGORY.THREE_OF_A_KIND) return cards.filter((c) => c.rank !== groups[0][0].rank).map((c) => c.id);
  if (e.category === CATEGORY.TWO_PAIR) return cards.filter((c) => c.rank === groups[2][0].rank).map((c) => c.id);
  // four-flush?
  const bySuit = {};
  for (const c of cards) (bySuit[c.suit] ||= []).push(c);
  const fl = Object.values(bySuit).find((s) => s.length === 4);
  if (fl) return cards.filter((c) => c.suit !== fl[0].suit).map((c) => c.id);
  // open-ended four-straight?
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b);
  for (let i = 0; i + 3 < ranks.length; i++) {
    if (ranks[i + 3] - ranks[i] === 3 && ranks[i] >= 2 && ranks[i + 3] <= 13) {
      const keep = new Set(ranks.slice(i, i + 4));
      return cards.filter((c) => !keep.has(c.rank)).map((c) => c.id);
    }
  }
  if (e.category === CATEGORY.PAIR) return cards.filter((c) => c.rank !== groups[0][0].rank).map((c) => c.id);
  // high card: keep highest two if both >= J, else keep highest one
  const sorted = cards.slice().sort((a, b) => b.rank - a.rank);
  const keep = sorted[1].rank >= 11 ? [sorted[0].id, sorted[1].id] : [sorted[0].id];
  return cards.filter((c) => !keep.includes(c.id)).map((c) => c.id);
}
