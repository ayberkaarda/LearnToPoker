// Shared card geometry used by both the SVG card (Card2D) and the canvas
// renderer (drawCardFace). All coordinates live in a 250 × 350 card space.

import { parseCard } from '../engine/deck.js';

export const CARD_W = 250;
export const CARD_H = 350;
export const CARD_R = 16;

export const COLORS = {
  face: '#fbf7ee',
  faceEdge: '#d9cfb8',
  red: '#c8373e',
  black: '#17181a',
  gold: '#c9a046',
  goldLight: '#e6c374',
  backOuter: '#f3ecdc',
  back: '#11392a',
  backDeep: '#0b2a1f',
  courtFill: '#f4ecda',
};

// Suit outlines drawn in a 100 × 100 box, centred on (50, 50).
export const SUIT_PATHS = {
  h: 'M50 90 C46 86 6 60 6 33 C6 18 17 8 30 8 C40 8 46 14 50 22 C54 14 60 8 70 8 C83 8 94 18 94 33 C94 60 54 86 50 90 Z',
  d: 'M50 4 Q67 28 86 50 Q67 72 50 96 Q33 72 14 50 Q33 28 50 4 Z',
  s: 'M50 5 C46 10 8 36 8 60 C8 73 18 81 29 81 C38 81 44 77 47 71 C46 82 41 89 33 95 L67 95 C59 89 54 82 53 71 C56 77 62 81 71 81 C82 81 92 73 92 60 C92 36 54 10 50 5 Z',
  c: 'M50 7 A19 19 0 1 1 49.99 7 Z M29 37 A19 19 0 1 1 28.99 37 Z M71 37 A19 19 0 1 1 70.99 37 Z M41 44 L59 44 L59 64 L41 64 Z M47 58 C47 76 42 88 33 95 L67 95 C58 88 53 76 53 58 Z',
};

export const SUIT_SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };

const RANK_LABEL = { 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankLabel(rank) {
  return RANK_LABEL[rank] || String(rank);
}

/** Accepts {rank, suit} or a string like 'As', 'Td', '10h'. Returns null if invalid. */
export function normalizeCard(card) {
  if (!card) return null;
  if (typeof card === 'string') {
    try {
      return parseCard(card);
    } catch {
      return null;
    }
  }
  if (typeof card === 'object' && card.rank && card.suit) return card;
  return null;
}

export function suitColor(suit) {
  return suit === 'h' || suit === 'd' ? COLORS.red : COLORS.black;
}

// Pip positions: [column, row] with columns L/C/R and rows 0..1 (top → bottom).
const L = 82;
const C = 125;
const R = 168;
const PIPS = {
  2: [[C, 0], [C, 1]],
  3: [[C, 0], [C, 0.5], [C, 1]],
  4: [[L, 0], [R, 0], [L, 1], [R, 1]],
  5: [[L, 0], [R, 0], [C, 0.5], [L, 1], [R, 1]],
  6: [[L, 0], [R, 0], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  7: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  8: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [C, 0.75], [L, 1], [R, 1]],
  9: [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [C, 0.5], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1]],
  10: [[L, 0], [R, 0], [C, 1 / 6], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [C, 5 / 6], [L, 1], [R, 1]],
};
const PIP_TOP = 86;
const PIP_SPAN = 178;

/**
 * Builds the drawing list for a card face.
 * Element kinds:
 *   {k:'suit', suit, x, y, s, flip, color}
 *   {k:'text', text, x, y, size, weight, anchor, color, font}
 *   {k:'rect', x, y, w, h, r, fill, stroke, sw}
 *   {k:'group', rot180:true, items:[...]}  (rotated about the card centre)
 * variant: 'full' (classic corners + pips) or 'mini' (large index for tiny sizes)
 */
export function faceLayout(card, variant = 'full') {
  const { rank, suit } = card;
  const color = suitColor(suit);
  const label = rankLabel(rank);
  const items = [];

  if (variant === 'mini') {
    items.push({ k: 'text', text: label, x: 24, y: 104, size: label === '10' ? 80 : 98, weight: 700, anchor: 'start', color, font: 'display', spacing: label === '10' ? -6 : 0 });
    items.push({ k: 'suit', suit, x: 62, y: 148, s: 56, color });
    items.push({ k: 'suit', suit, x: 160, y: 262, s: 124, color });
    return items;
  }

  const corner = [
    { k: 'text', text: label, x: 32, y: 60, size: label === '10' ? 40 : 48, weight: 600, anchor: 'middle', color, font: 'display', spacing: label === '10' ? -3 : 0 },
    { k: 'suit', suit, x: 32, y: 86, s: 28, color },
  ];
  items.push(...corner);
  items.push({ k: 'group', rot180: true, items: corner });

  if (rank === 14) {
    items.push({ k: 'suit', suit, x: 125, y: 175, s: suit === 's' ? 128 : 112, color });
  } else if (rank >= 11) {
    items.push({ k: 'rect', x: 58, y: 66, w: 134, h: 218, r: 10, fill: COLORS.courtFill, stroke: COLORS.gold, sw: 2 });
    items.push({ k: 'rect', x: 64, y: 72, w: 122, h: 206, r: 7, fill: 'none', stroke: COLORS.gold, sw: 0.8 });
    items.push({ k: 'suit', suit, x: 125, y: 106, s: 30, color });
    items.push({ k: 'suit', suit, x: 125, y: 244, s: 30, color, flip: true });
    items.push({ k: 'text', text: label, x: 125, y: 210, size: 96, weight: 600, anchor: 'middle', color, font: 'display' });
  } else {
    const s = rank === 10 ? 40 : rank >= 9 ? 42 : 46;
    for (const [x, f] of PIPS[rank]) {
      const y = PIP_TOP + f * PIP_SPAN;
      items.push({ k: 'suit', suit, x, y, s, color, flip: y > 175.5 });
    }
  }
  return items;
}

let latticePath = null;
/** Diamond lattice used on the card back, as a single SVG path string. */
export function backLattice() {
  if (latticePath) return latticePath;
  const x0 = 28;
  const y0 = 30;
  const cw = 194 / 9;
  const ch = 290 / 10;
  let d = '';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = x0 + cw * (c + 0.5);
      const cy = y0 + ch * (r + 0.5);
      const hw = cw / 2 - 1.5;
      const hh = ch / 2 - 1.5;
      d += `M${cx.toFixed(2)} ${(cy - hh).toFixed(2)}L${(cx + hw).toFixed(2)} ${cy.toFixed(2)}L${cx.toFixed(2)} ${(cy + hh).toFixed(2)}L${(cx - hw).toFixed(2)} ${cy.toFixed(2)}Z`;
    }
  }
  latticePath = d;
  return d;
}

export const BACK = {
  outer: { x: 0, y: 0, w: CARD_W, h: CARD_H, r: CARD_R },
  field: { x: 12, y: 12, w: CARD_W - 24, h: CARD_H - 24, r: 10 },
  frame: { x: 20, y: 20, w: CARD_W - 40, h: CARD_H - 40, r: 7 },
  medallion: { cx: 125, cy: 175, r: 36 },
};
