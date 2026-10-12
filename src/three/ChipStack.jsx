import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_CHIPS = 40;
const CHIP_R = 0.15;
const CHIP_H = 0.05;
const PER_COLUMN = 10;

/** Denominations: body colour + inlay/edge-spot colour. */
export const DENOMS = [
  { value: 500, color: '#2a2140', spot: '#e2c584' },
  { value: 100, color: '#141110', spot: '#efe6d4' },
  { value: 25, color: '#1d4436', spot: '#efe6d4' },
  { value: 5, color: '#a3182a', spot: '#f4ecdc' },
  { value: 1, color: '#ece3cf', spot: '#a3182a' },
];

const GEO = new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 40, 1);

function sideTexture(color, spot) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 16);
  // six edge spots, each a block of three stripes
  g.fillStyle = spot;
  for (let i = 0; i < 6; i++) {
    const x = (i * 256) / 6;
    for (let k = 0; k < 3; k++) g.fillRect(x + 6 + k * 7, 0, 4, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function topTexture(color, spot, value) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  // edge spots around the rim
  g.save();
  g.translate(64, 64);
  g.fillStyle = spot;
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3);
    g.fillRect(-7, -64, 14, 14);
  }
  g.restore();
  // inlay
  g.beginPath();
  g.arc(64, 64, 38, 0, Math.PI * 2);
  g.fillStyle = spot;
  g.globalAlpha = 0.18;
  g.fill();
  g.globalAlpha = 1;
  g.lineWidth = 2.5;
  g.strokeStyle = spot;
  g.setLineDash([5, 4]);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = spot;
  g.font = "600 30px 'Bodoni Moda', Georgia, serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(value), 64, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const materialCache = new Map();
function chipMaterials(d) {
  if (materialCache.has(d.value)) return materialCache.get(d.value);
  const common = { roughness: 0.38, metalness: 0.02, clearcoat: 0.5, clearcoatRoughness: 0.4 };
  const side = new THREE.MeshPhysicalMaterial({ map: sideTexture(d.color, d.spot), ...common });
  const top = new THREE.MeshPhysicalMaterial({ map: topTexture(d.color, d.spot, d.value), ...common });
  // CylinderGeometry groups: side, top, bottom
  const mats = [side, top, top];
  materialCache.set(d.value, mats);
  return mats;
}

const COLUMN_OFFSETS = [
  [0, 0],
  [0.33, 0.02],
  [-0.33, 0.02],
  [0.16, -0.3],
  [-0.16, -0.3],
  [0.16, 0.32],
  [-0.16, 0.32],
  [0.5, -0.28],
  [-0.5, -0.28],
];

/** Split an amount into chip columns by denomination (visual only, capped). */
export function chipLayout(amount) {
  const chips = [];
  let rest = Math.max(0, Math.floor(amount));
  let col = 0;
  for (const d of DENOMS) {
    let count = Math.floor(rest / d.value);
    rest -= count * d.value;
    while (count > 0 && col < COLUMN_OFFSETS.length && chips.length < MAX_CHIPS) {
      const inCol = Math.min(count, PER_COLUMN, MAX_CHIPS - chips.length);
      for (let k = 0; k < inCol; k++) chips.push({ col, level: k, color: d.color, value: d.value });
      count -= inCol;
      col += 1;
    }
  }
  return chips;
}

const tmp = new THREE.Object3D();
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function DenomStack({ denom, chips }) {
  const mesh = useRef();
  const mats = useMemo(() => chipMaterials(denom), [denom]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    chips.forEach((c, i) => {
      const [ox, oz] = COLUMN_OFFSETS[c.col];
      const jitter = ((c.level * 37 + c.col * 11) % 7) / 7 - 0.5;
      tmp.position.set(ox + jitter * 0.014, CHIP_H / 2 + c.level * CHIP_H, oz + jitter * 0.012);
      tmp.rotation.set(0, jitter * 2.4, 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.count = chips.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [chips]);
  // GEO and the cached per-denomination materials are shared, so the mesh keeps dispose={null};
  // the per-mesh instance buffers (matrix/color) are released here instead.
  useEffect(() => {
    const m = mesh.current;
    return () => m?.dispose();
  }, []);

  return <instancedMesh ref={mesh} args={[GEO, mats, PER_COLUMN * COLUMN_OFFSETS.length]} castShadow receiveShadow frustumCulled={false} dispose={null} />;
}

/** Instanced chip pile. `from` is where it appears; it then slides to `position` along a low arc. */
export default function ChipStack({ amount, position, from, scale = 1 }) {
  const group = useRef();
  const flight = useRef({ t: from ? 0 : 1, from: new THREE.Vector3(...(from || position)) });
  const target = useRef(new THREE.Vector3());
  target.current.set(position[0], position[1], position[2]);
  const chips = useMemo(() => chipLayout(amount), [amount]);
  const byDenom = useMemo(
    () => DENOMS.map((d) => ({ d, chips: chips.filter((c) => c.value === d.value) })).filter((x) => x.chips.length),
    [chips]
  );

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const f = flight.current;
    if (reduced() || f.t >= 1) {
      if (f.t < 1) f.t = 1;
      g.position.lerp(target.current, f.t >= 1 && !reduced() ? 1 - Math.exp(-6 * Math.min(dt, 0.1)) : 1);
      return;
    }
    f.t = Math.min(1, f.t + Math.min(dt, 0.1) / 0.6);
    const e = easeOutCubic(f.t);
    g.position.lerpVectors(f.from, target.current, e);
    g.position.y += Math.sin(Math.PI * f.t) * 0.35;
  });

  return (
    <group ref={group} position={from || position} scale={scale}>
      {byDenom.map(({ d, chips: list }) => (
        <DenomStack key={d.value} denom={d} chips={list} />
      ))}
    </group>
  );
}
