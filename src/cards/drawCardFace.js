import * as THREE from 'three';
import {
  CARD_W,
  CARD_H,
  CARD_R,
  COLORS,
  SUIT_PATHS,
  BACK,
  backLattice,
  faceLayout,
  normalizeCard,
} from './cardLayout.js';

export const TEXTURE_W = 512;
export const TEXTURE_H = 717;

const FONT = {
  display: "'Fraunces', Georgia, serif",
  body: "'DM Sans', system-ui, sans-serif",
};

const pathCache = {};
function suitPath(suit) {
  if (!pathCache[suit]) pathCache[suit] = new Path2D(SUIT_PATHS[suit]);
  return pathCache[suit];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function prepare(canvas) {
  if (canvas.width !== TEXTURE_W) canvas.width = TEXTURE_W;
  if (canvas.height !== TEXTURE_H) canvas.height = TEXTURE_H;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / CARD_W, canvas.height / CARD_H);
  return ctx;
}

function drawItem(ctx, it) {
  switch (it.k) {
    case 'suit': {
      ctx.save();
      ctx.translate(it.x, it.y);
      if (it.flip) ctx.rotate(Math.PI);
      ctx.scale(it.s / 100, it.s / 100);
      ctx.translate(-50, -50);
      ctx.fillStyle = it.color;
      ctx.fill(suitPath(it.suit));
      ctx.restore();
      break;
    }
    case 'text': {
      ctx.save();
      ctx.fillStyle = it.color;
      ctx.font = `${it.weight || 600} ${it.size}px ${FONT[it.font] || FONT.display}`;
      ctx.textAlign = it.anchor === 'start' ? 'left' : 'center';
      ctx.textBaseline = 'alphabetic';
      if (it.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${it.spacing}px`;
      ctx.fillText(it.text, it.x, it.y);
      ctx.restore();
      break;
    }
    case 'rect': {
      roundRect(ctx, it.x, it.y, it.w, it.h, it.r);
      if (it.fill && it.fill !== 'none') {
        ctx.fillStyle = it.fill;
        ctx.fill();
      }
      if (it.stroke && it.sw) {
        ctx.strokeStyle = it.stroke;
        ctx.lineWidth = it.sw;
        ctx.stroke();
      }
      break;
    }
    case 'group': {
      ctx.save();
      ctx.translate(CARD_W / 2, CARD_H / 2);
      ctx.rotate(Math.PI);
      ctx.translate(-CARD_W / 2, -CARD_H / 2);
      it.items.forEach((child) => drawItem(ctx, child));
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

/** Draws a card face ({rank,suit} or 'As') onto a canvas (resized to 512 × 717). */
export function drawCardFace(canvas, card) {
  const c = normalizeCard(card);
  if (!c) return drawCardBack(canvas);
  const ctx = prepare(canvas);
  roundRect(ctx, 0.75, 0.75, CARD_W - 1.5, CARD_H - 1.5, CARD_R);
  ctx.fillStyle = COLORS.face;
  ctx.fill();
  ctx.strokeStyle = COLORS.faceEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  faceLayout(c, 'full').forEach((it) => drawItem(ctx, it));
  return canvas;
}

/** Draws the card back (dark felt green, gold diamond lattice). */
export function drawCardBack(canvas) {
  const ctx = prepare(canvas);
  const { field, frame, medallion: m } = BACK;
  roundRect(ctx, 0.75, 0.75, CARD_W - 1.5, CARD_H - 1.5, CARD_R);
  ctx.fillStyle = COLORS.backOuter;
  ctx.fill();
  ctx.strokeStyle = COLORS.faceEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  roundRect(ctx, field.x, field.y, field.w, field.h, field.r);
  ctx.fillStyle = COLORS.back;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.3;
  ctx.stroke(new Path2D(backLattice()));
  ctx.restore();

  roundRect(ctx, frame.x, frame.y, frame.w, frame.h, frame.r);
  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.backDeep;
  ctx.fill();
  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m.cx, m.cy, m.r - 6, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.stroke();

  drawItem(ctx, { k: 'suit', suit: 's', x: m.cx, y: m.cy, s: 36, color: COLORS.goldLight });
  return canvas;
}

const textureCache = new Map();
let fontsHooked = false;

function cacheKey(card) {
  if (card === 'back' || card == null) return 'back';
  const c = normalizeCard(card);
  return c ? `${c.rank}${c.suit}` : 'back';
}

function paint(canvas, key) {
  if (key === 'back') drawCardBack(canvas);
  else drawCardFace(canvas, { rank: Number(key.slice(0, -1)), suit: key.slice(-1) });
}

function hookFonts() {
  if (fontsHooked || typeof document === 'undefined' || !document.fonts) return;
  fontsHooked = true;
  // Redraw once the display font is ready so card indices use Fraunces.
  document.fonts.load("600 48px 'Fraunces'").then(() => document.fonts.ready).then(() => {
    textureCache.forEach((tex, key) => {
      paint(tex.image, key);
      tex.needsUpdate = true;
    });
  }).catch(() => {});
}

/** Returns a cached THREE.CanvasTexture for a card ({rank,suit} | 'As') or 'back'. */
export function getCardTexture(card) {
  const key = cacheKey(card);
  let tex = textureCache.get(key);
  if (tex) return tex;
  const canvas = document.createElement('canvas');
  paint(canvas, key);
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  textureCache.set(key, tex);
  hookFonts();
  return tex;
}
