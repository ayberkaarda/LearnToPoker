// Deck + seeded RNG. Framework-free.

export const SUITS = ['s', 'h', 'd', 'c'];
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const RANK_CHAR = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const CHAR_RANK = Object.fromEntries(Object.entries(RANK_CHAR).map(([k, v]) => [v, Number(k)]));

export function makeCard(rank, suit) {
  return { rank, suit, id: RANK_CHAR[rank] + suit };
}

/** Parse "As", "Td", "9c" → card object. Also accepts "10h". */
export function parseCard(str) {
  const s = str.trim();
  const suit = s[s.length - 1].toLowerCase();
  let r = s.slice(0, -1).toUpperCase();
  if (r === '10') r = 'T';
  const rank = CHAR_RANK[r];
  if (!rank || !SUITS.includes(suit)) throw new Error('Bad card: ' + str);
  return makeCard(rank, suit);
}

export function parseCards(str) {
  return str.trim().split(/[\s,]+/).filter(Boolean).map(parseCard);
}

export function fullDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(makeCard(r, s));
  return d;
}

/** Mulberry32 seeded PRNG. Returns function → [0,1). */
export function createRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(cards, rng = Math.random) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newShuffledDeck(rng) {
  return shuffle(fullDeck(), rng);
}

export function cardsToString(cards) {
  return cards.map((c) => c.id).join(' ');
}

/** Remove given cards (by id) from a deck. */
export function without(deck, cards) {
  const ids = new Set(cards.map((c) => c.id));
  return deck.filter((c) => !ids.has(c.id));
}
