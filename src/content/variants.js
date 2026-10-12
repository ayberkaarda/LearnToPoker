// Structural data for every poker variant taught on the site.
// Text (names, rules, walkthrough copy, quizzes) lives in src/i18n/<lang>/variants.json.

export const VARIANTS = [
  { id: 'holdem', playable: true, difficulty: 1, limit: 'no-limit', holeCards: 2, communityCards: 5, hiLo: false, family: 'community', icon: '♠' },
  { id: 'omaha', playable: true, difficulty: 2, limit: 'pot-limit', holeCards: 4, communityCards: 5, hiLo: false, family: 'community', icon: '♦' },
  { id: 'omahaHiLo', playable: false, difficulty: 3, limit: 'fixed-limit', holeCards: 4, communityCards: 5, hiLo: true, family: 'community', icon: '⇅' },
  { id: 'sevenCardStud', playable: true, difficulty: 2, limit: 'fixed-limit', holeCards: 7, communityCards: 0, hiLo: false, family: 'stud', icon: '♣' },
  { id: 'razz', playable: false, difficulty: 2, limit: 'fixed-limit', holeCards: 7, communityCards: 0, hiLo: false, family: 'stud', icon: '↓' },
  { id: 'fiveCardDraw', playable: true, difficulty: 1, limit: 'fixed-limit', holeCards: 5, communityCards: 0, hiLo: false, family: 'draw', icon: '♥' },
  { id: 'deuceToSevenTripleDraw', playable: false, difficulty: 3, limit: 'fixed-limit', holeCards: 5, communityCards: 0, hiLo: false, family: 'draw', icon: '7' },
  { id: 'shortDeck', playable: false, difficulty: 2, limit: 'no-limit', holeCards: 2, communityCards: 5, hiLo: false, family: 'community', icon: '6+' },
  { id: 'pineapple', playable: false, difficulty: 1, limit: 'no-limit', holeCards: 3, communityCards: 5, hiLo: false, family: 'community', icon: '✦' },
  { id: 'badugi', playable: false, difficulty: 3, limit: 'fixed-limit', holeCards: 4, communityCards: 0, hiLo: false, family: 'draw', icon: '◇' },
  { id: 'horse', playable: false, difficulty: 3, limit: 'mixed', holeCards: null, communityCards: null, hiLo: true, family: 'mixed', icon: 'H' },
];

export const VARIANT_IDS = VARIANTS.map((v) => v.id);

export const FAMILY_ICONS = { community: '♠', stud: '♣', draw: '♥', mixed: '◆' };

// For variants that cannot be played yet: the closest playable game.
export const SIMILAR_PLAYABLE = {
  omahaHiLo: 'omaha',
  razz: 'sevenCardStud',
  deuceToSevenTripleDraw: 'fiveCardDraw',
  shortDeck: 'holdem',
  pineapple: 'holdem',
  badugi: 'fiveCardDraw',
  horse: 'sevenCardStud',
};

export function getVariantMeta(id) {
  return VARIANTS.find((v) => v.id === id) || null;
}
