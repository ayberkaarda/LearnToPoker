// Hand evaluation. All functions are pure.
// A "card" is { rank: 2..14, suit: 's'|'h'|'d'|'c', id }.

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
};

export const CATEGORY_KEYS = [
  'highCard',
  'pair',
  'twoPair',
  'threeOfAKind',
  'straight',
  'flush',
  'fullHouse',
  'fourOfAKind',
  'straightFlush',
  'royalFlush',
];

function encode(category, tiebreak) {
  // base-15 packing: category dominates, then up to 5 tiebreak ranks
  let s = category;
  for (let i = 0; i < 5; i++) s = s * 15 + (tiebreak[i] || 0);
  return s;
}

/** Detect straight in a sorted-desc unique rank list. Returns high card or 0. */
function straightHigh(uniqueDesc) {
  const ranks = uniqueDesc.slice();
  if (ranks[0] === 14) ranks.push(1); // wheel
  let run = 1;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1] - 1) {
      run++;
      if (run >= 5) return ranks[i] + 4;
    } else run = 1;
  }
  return 0;
}

/**
 * Evaluate exactly 5 cards.
 * Returns { category, tiebreak, score, cards }.
 */
export function evaluate5(cards) {
  if (cards.length !== 5) throw new Error('evaluate5 needs 5 cards');
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
  // group by count desc, then rank desc
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = groups.map((g) => g[0]).sort((a, b) => b - a);
  const sHigh = unique.length === 5 ? straightHigh(unique) : 0;

  let category;
  let tiebreak;
  if (sHigh && isFlush) {
    category = sHigh === 14 ? CATEGORY.ROYAL_FLUSH : CATEGORY.STRAIGHT_FLUSH;
    tiebreak = [sHigh];
  } else if (groups[0][1] === 4) {
    category = CATEGORY.FOUR_OF_A_KIND;
    tiebreak = [groups[0][0], groups[1][0]];
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    category = CATEGORY.FULL_HOUSE;
    tiebreak = [groups[0][0], groups[1][0]];
  } else if (isFlush) {
    category = CATEGORY.FLUSH;
    tiebreak = ranks;
  } else if (sHigh) {
    category = CATEGORY.STRAIGHT;
    tiebreak = [sHigh];
  } else if (groups[0][1] === 3) {
    category = CATEGORY.THREE_OF_A_KIND;
    tiebreak = [groups[0][0], groups[1][0], groups[2][0]];
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    category = CATEGORY.TWO_PAIR;
    tiebreak = [groups[0][0], groups[1][0], groups[2][0]];
  } else if (groups[0][1] === 2) {
    category = CATEGORY.PAIR;
    tiebreak = [groups[0][0], groups[1][0], groups[2][0], groups[3][0]];
  } else {
    category = CATEGORY.HIGH_CARD;
    tiebreak = ranks;
  }
  return { category, tiebreak, score: encode(category, tiebreak), cards: cards.slice(), key: CATEGORY_KEYS[category] };
}

export function combinations(arr, k) {
  const out = [];
  const n = arr.length;
  const idx = [];
  function rec(start) {
    if (idx.length === k) {
      out.push(idx.map((i) => arr[i]));
      return;
    }
    for (let i = start; i < n; i++) {
      idx.push(i);
      rec(i + 1);
      idx.pop();
    }
  }
  rec(0);
  return out;
}

/** Best 5-card hand from any number (>=5) of cards. */
export function bestOf(cards) {
  if (cards.length < 5) throw new Error('need at least 5 cards');
  if (cards.length === 5) return evaluate5(cards);
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const e = evaluate5(combo);
    if (!best || e.score > best.score) best = e;
  }
  return best;
}

/** Omaha rule: exactly 2 hole cards + exactly 3 board cards. */
export function bestOmaha(hole, board) {
  if (hole.length < 2 || board.length < 3) throw new Error('omaha needs 2+ hole and 3+ board');
  let best = null;
  for (const h of combinations(hole, 2)) {
    for (const b of combinations(board, 3)) {
      const e = evaluate5([...h, ...b]);
      if (!best || e.score > best.score) best = e;
    }
  }
  return best;
}

export function compareHands(a, b) {
  return a.score - b.score;
}

// ---------- Low evaluators (for Razz, Hi-Lo, 2-7, Badugi lessons) ----------

/**
 * Ace-to-five low (Razz / Omaha Hi-Lo low). Straights & flushes ignored, ace is low.
 * Lower score = better. Returns { ranks (desc, ace=1), score, qualifies8 }.
 */
export function evaluateLowA5(cards) {
  const vals = [...new Set(cards.map((c) => (c.rank === 14 ? 1 : c.rank)))].sort((a, b) => a - b);
  if (vals.length < 5) {
    // pairs forced: fill with duplicates (worse). Use all ranks with multiplicity.
    const all = cards.map((c) => (c.rank === 14 ? 1 : c.rank)).sort((a, b) => a - b).slice(0, 5);
    const desc = all.sort((a, b) => b - a);
    return { ranks: desc, score: 1e6 + encodeLow(desc), qualifies8: false, paired: true };
  }
  const five = vals.slice(0, 5).sort((a, b) => b - a);
  return { ranks: five, score: encodeLow(five), qualifies8: five[0] <= 8, paired: false };
}

function encodeLow(desc) {
  let s = 0;
  for (const r of desc) s = s * 15 + r;
  return s;
}

/** Best A-5 low from 5+ cards (e.g., 7 stud cards). Lower score wins. */
export function bestLowA5(cards) {
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const e = evaluateLowA5(combo);
    if (!best || e.score < best.score) best = e;
  }
  return best;
}

/**
 * Deuce-to-seven low: ace is high, straights and flushes count AGAINST you.
 * Lower score = better. Best possible: 7-5-4-3-2 offsuit.
 */
export function evaluateLow27(cards) {
  const hi = evaluate5(cards);
  // invert: high-hand category is bad. Score = category * big + tiebreak (lower ranks better)
  const desc = cards.map((c) => c.rank).sort((a, b) => b - a);
  let s = hi.category * 1e6;
  for (const r of desc) s = s * 15 + r;
  return { ranks: desc, category: hi.category, score: s };
}

export function bestLow27(cards) {
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const e = evaluateLow27(combo);
    if (!best || e.score < best.score) best = e;
  }
  return best;
}

/**
 * Badugi: best hand uses 4 cards of different suits and different ranks, ace low.
 * Fewer cards = worse. Lower ranks = better. Returns { cards, size, score } lower better.
 */
export function evaluateBadugi(cards) {
  let best = null;
  for (let k = Math.min(4, cards.length); k >= 1; k--) {
    for (const combo of combinations(cards, k)) {
      const suits = new Set(combo.map((c) => c.suit));
      const ranks = new Set(combo.map((c) => (c.rank === 14 ? 1 : c.rank)));
      if (suits.size !== k || ranks.size !== k) continue;
      const desc = [...ranks].sort((a, b) => b - a);
      const score = (4 - k) * 1e6 + encodeLow(desc);
      if (!best || score < best.score) best = { cards: combo, size: k, ranks: desc, score };
    }
    if (best) return best;
  }
  return best;
}

/** Human-readable description key + params for a high-hand evaluation. */
export function describeHand(e) {
  const t = e.tiebreak;
  switch (e.category) {
    case CATEGORY.ROYAL_FLUSH:
      return { key: 'royalFlush', params: {} };
    case CATEGORY.STRAIGHT_FLUSH:
      return { key: 'straightFlush', params: { high: t[0] } };
    case CATEGORY.FOUR_OF_A_KIND:
      return { key: 'fourOfAKind', params: { rank: t[0] } };
    case CATEGORY.FULL_HOUSE:
      return { key: 'fullHouse', params: { trips: t[0], pair: t[1] } };
    case CATEGORY.FLUSH:
      return { key: 'flush', params: { high: t[0] } };
    case CATEGORY.STRAIGHT:
      return { key: 'straight', params: { high: t[0] } };
    case CATEGORY.THREE_OF_A_KIND:
      return { key: 'threeOfAKind', params: { rank: t[0] } };
    case CATEGORY.TWO_PAIR:
      return { key: 'twoPair', params: { high: t[0], low: t[1] } };
    case CATEGORY.PAIR:
      return { key: 'pair', params: { rank: t[0] } };
    default:
      return { key: 'highCard', params: { high: t[0] } };
  }
}
