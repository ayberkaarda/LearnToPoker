import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_CHIPS = 40;
const CHIP_R = 0.15;
const CHIP_H = 0.05;
const PER_COLUMN = 10;

export const DENOMS = [
  { value: 500, color: '#6a3fa3' },
  { value: 100, color: '#1c1c1c' },
  { value: 25, color: '#2f8a57' },
  { value: 5, color: '#c8373e' },
  { value: 1, color: '#efe8da' },
];

const GEO = new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 28);
const MAT = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.08 });

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
      for (let k = 0; k < inCol; k++) chips.push({ col, level: k, color: d.color });
      count -= inCol;
      col += 1;
    }
  }
  return chips;
}

const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Instanced chip pile. `from` is where it appears; it then slides to `position`. */
export default function ChipStack({ amount, position, from, scale = 1 }) {
  const group = useRef();
  const mesh = useRef();
  const target = useRef(new THREE.Vector3());
  target.current.set(position[0], position[1], position[2]);
  const chips = useMemo(() => chipLayout(amount), [amount]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    chips.forEach((c, i) => {
      const [ox, oz] = COLUMN_OFFSETS[c.col];
      const jitter = ((i * 37) % 7) / 7 - 0.5;
      tmp.position.set(ox + jitter * 0.012, CHIP_H / 2 + c.level * CHIP_H, oz + jitter * 0.01);
      tmp.rotation.set(0, jitter, 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, tmpColor.set(c.color));
    });
    m.count = chips.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [chips]);

  // GEO/MAT are shared module-level resources, so the mesh keeps dispose={null};
  // the per-mesh instance buffers (matrix/color) are released here instead.
  useEffect(() => {
    const m = mesh.current;
    return () => m?.dispose();
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (reduced()) {
      g.position.copy(target.current);
      return;
    }
    g.position.lerp(target.current, 1 - Math.exp(-5 * Math.min(dt, 0.1)));
  });

  return (
    <group ref={group} position={from || position} scale={scale}>
      <instancedMesh ref={mesh} args={[GEO, MAT, MAX_CHIPS]} castShadow frustumCulled={false} dispose={null} />
    </group>
  );
}
