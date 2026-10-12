import holdem from './holdem.js';
import omaha from './omaha.js';
import fiveCardDraw from './fiveCardDraw.js';
import sevenCardStud from './sevenCardStud.js';

export const VARIANTS = { holdem, omaha, fiveCardDraw, sevenCardStud };
export const PLAYABLE_IDS = Object.keys(VARIANTS);
export function getVariant(id) {
  const v = VARIANTS[id];
  if (!v) throw new Error('Unknown playable variant: ' + id);
  return v;
}
