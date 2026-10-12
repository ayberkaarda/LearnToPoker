/*
  Formations for the landing hero hand. A formation maps a card slot to a pose:
    (i, n, t, w) -> { x, y, z, rx, ry, rz, card }
  `t` is the time in seconds since the formation began (it keeps running while the
  formation is held, so a formation can move on its own), `w` scales horizontal
  extents for narrow screens. `ry` already includes the flip: a card shows its face
  when ry is near 0 (mod 2π) and its back when ry is near π. `card` is what the face
  should read once it is next hidden from view.
*/

const TAU = Math.PI * 2;
// Moving formations sit a little left of the fan's centre so they stay clear of the right edge.
const CX = -0.45;
const cxFor = (w) => (w < 1 ? 0 : CX); // narrow screens keep the hand centred
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const centered = (i, n) => (n > 1 ? (i / (n - 1)) * 2 - 1 : 0); // -1 … 1
const pick = (list, i) => list[i % list.length];

// Cheap deterministic per-slot noise so poses vary without randomness between renders.
const hash = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** 1. The royal flush fanned out, the rest of the deck tucked behind it. */
function fan(i, n, t, w) {
  const cards = ['Th', 'Jh', 'Qh', 'Kh', 'Ah', '9c', '4d'];
  if (i < 5) {
    const a = (i - 2) * 0.2;
    const R = 3.2;
    return { x: Math.sin(a) * R * w, y: Math.cos(a) * R - R, z: i * 0.035, rx: 0, ry: 0, rz: -a, card: cards[i] };
  }
  const j = i - 5;
  return { x: (j - 0.5) * 0.3 * w, y: -0.2, z: -0.4 - j * 0.03, rx: 0, ry: Math.PI, rz: (j - 0.5) * 0.2, card: pick(cards, i) };
}

/** 2. A slow ring orbiting the hand's centre; each card turns its face out as it passes the front. */
function carousel(i, n, t, w) {
  const cards = ['As', 'Ah', 'Ad', 'Ac', 'Kd', 'Ks', 'Qh'];
  const th = (i / n) * TAU + t * 0.55;
  const R = 1.45;
  const front = smooth(0.35, 0.85, Math.cos(th));
  return {
    x: (cxFor(w) + Math.sin(th) * R) * w,
    y: 0.05 + Math.sin(th * 2 + t) * 0.06 - Math.cos(th) * 0.18,
    z: Math.cos(th) * R * 0.7 - 0.9,
    rx: 0.1,
    ry: th + Math.PI * (1 - front),
    rz: 0,
    card: pick(cards, i),
  };
}

/** 3. A diagonal cascade; a flip wave runs down it and each card bounces as it turns over. */
function cascade(i, n, t, w) {
  const cards = ['5c', '6d', '7h', '8s', '9c', 'Td', 'Jc'];
  const c = centered(i, n);
  const flipAt = 0.9 + i * 0.28;
  const turned = smooth(flipAt, flipAt + 0.55, t);
  const hop = Math.sin(Math.PI * clamp01((t - flipAt) / 0.55));
  const ripple = Math.sin(t * 2.2 - i * 0.7) * 0.05;
  return {
    x: (cxFor(w) + c * 1.5) * w,
    y: 0.45 - (c + 1) * 0.55 + hop * 0.3 + ripple,
    z: i * 0.06 + hop * 0.5,
    rx: -0.15 + hop * 0.25,
    ry: Math.PI * (1 - turned),
    rz: -0.18 + c * 0.05,
    card: pick(cards, i),
  };
}

/** 4. Gathered into a deck, riffled (cards slide out and go back in), then dealt into a straight line. */
function shuffleLine(i, n, t, w) {
  const cards = ['As', 'Ks', 'Qs', 'Js', 'Ts', '4d', '2c'];
  // the deck
  const side = i % 2 ? 1 : -1;
  const outStart = 0.5 + i * 0.2;
  const out = Math.sin(Math.PI * clamp01((t - outStart) / 0.5));
  const lifted = smooth(outStart + 0.2, outStart + 0.45, t);
  const deck = {
    x: (cxFor(w) + side * out * 0.95) * w,
    y: -0.15 + out * 0.12,
    z: (i + lifted * n) * 0.025 + out * 0.15,
    rx: 0,
    ry: Math.PI,
    rz: 0.06 + side * out * 0.22,
  };
  // the line
  const spreadStart = 0.6 + n * 0.2 + 0.45;
  const spread = smooth(spreadStart, spreadStart + 0.9, t - i * 0.05);
  const c = centered(i, n);
  const flipAt = spreadStart + 0.9 + i * 0.12;
  const turned = smooth(flipAt, flipAt + 0.45, t);
  const lineHalf = Math.min(1.6, 0.3 * (n - 1));
  const line = {
    x: (cxFor(w) + c * lineHalf) * w,
    y: -0.1 + c * 0.12 + Math.sin(Math.PI * clamp01((t - flipAt) / 0.45)) * 0.18,
    z: i * 0.02,
    rx: 0,
    ry: Math.PI * (1 - turned),
    rz: -0.04,
  };
  const k = spread;
  return {
    x: deck.x + (line.x - deck.x) * k,
    y: deck.y + (line.y - deck.y) * k,
    z: deck.z + (line.z - deck.z) * k,
    rx: 0,
    ry: line.ry,
    rz: deck.rz + (line.rz - deck.rz) * k,
    card: pick(cards, i),
  };
}

/** 5. Thrown on a felt that leans back: scattered, rotated, a few showing. */
function scatter(i, n, t, w) {
  const cards = ['Ac', 'Kh', '7s', 'Qd', '2h', 'Jd', '8c'];
  const up = i % 3 !== 2;
  const a = (i / n) * TAU + 0.4;
  const r = 0.5 + hash(i, 1) * 0.8;
  const drift = Math.sin(t * 0.6 + i) * 0.04;
  return {
    x: (cxFor(w) + Math.cos(a) * r * 1.1 + (hash(i, 2) - 0.5) * 0.3) * w,
    y: -0.25 + Math.sin(a) * r * 0.55 + drift,
    z: hash(i, 3) * 0.4 - 0.25 + i * 0.03,
    rx: -1.0 + (hash(i, 4) - 0.5) * 0.15,
    ry: up ? 0 : Math.PI,
    rz: (hash(i, 5) - 0.5) * 1.6 + Math.sin(t * 0.35 + i) * 0.05,
    card: pick(cards, i),
  };
}

/** 6. A rising helix that turns slowly, faces outward. */
function helix(i, n, t, w) {
  const cards = ['9s', 'Ts', 'Js', 'Qs', 'Ks', 'As', '8s'];
  const c = centered(i, n);
  const th = i * 0.95 + t * 0.7 - 1.2;
  const R = 1.1;
  return {
    x: (cxFor(w) + Math.sin(th) * R) * w,
    y: c * 1.15 - 0.1,
    z: Math.cos(th) * R - 0.6,
    rx: -c * 0.12,
    ry: th,
    rz: c * 0.1,
    card: pick(cards, i),
  };
}

export const FORMATIONS = [
  { name: 'fan', pose: fan, hold: 4.6 },
  { name: 'carousel', pose: carousel, hold: 5.2 },
  { name: 'cascade', pose: cascade, hold: 4.8 },
  { name: 'shuffle', pose: shuffleLine, hold: 5.6 },
  { name: 'scatter', pose: scatter, hold: 4.4 },
  { name: 'helix', pose: helix, hold: 4.8 },
];

export const TRANSITION = 1.2; // seconds per card
export const STAGGER = 0.07; // seconds between cards

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
