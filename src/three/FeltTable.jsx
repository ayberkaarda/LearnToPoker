import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export const TABLE_RX = 4.6;
export const TABLE_RZ = 2.6;

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function ellipse(rx, rz, hole) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
  if (hole) {
    const h = new THREE.Path();
    h.absellipse(0, 0, hole[0], hole[1], 0, Math.PI * 2, true, 0);
    s.holes.push(h);
  }
  return s;
}

function extrude(shape, depth, bevel = 0) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 96,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
  });
}

function feltTexture(felt, felt2) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  grad.addColorStop(0, felt2);
  grad.addColorStop(0.65, felt);
  grad.addColorStop(1, '#123a28');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  // fine fibre noise so the felt doesn't look like plastic
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Oval poker table: felt top at y=0, padded rail, thin gold trim and a betting line. */
export default function FeltTable({ rx = TABLE_RX, rz = TABLE_RZ }) {
  const parts = useMemo(() => {
    const felt = cssVar('--felt', '#1f5b3f');
    const felt2 = cssVar('--felt-2', '#2a7350');
    const gold = cssVar('--gold', '#d6ab4c');
    const tex = feltTexture(felt, felt2);
    // ExtrudeGeometry UVs are shape coordinates; map the ellipse into 0..1
    tex.repeat.set(1 / (2 * (rx + 0.1)), 1 / (2 * (rz + 0.1)));
    tex.offset.set(0.5, 0.5);
    return {
      tex,
      gold,
      felt2,
      top: extrude(ellipse(rx + 0.1, rz + 0.1), 0.1),
      rail: extrude(ellipse(rx + 0.55, rz + 0.55, [rx, rz]), 0.14, 0.12),
      trim: extrude(ellipse(rx - 0.15, rz - 0.15, [rx - 0.21, rz - 0.21]), 0.012),
      line: extrude(ellipse(rx * 0.72 + 0.025, rz * 0.72 + 0.025, [rx * 0.72, rz * 0.72]), 0.004),
      base: extrude(ellipse(rx + 0.35, rz + 0.35), 0.5),
    };
  }, [rx, rz]);

  useEffect(
    () => () => {
      parts.tex.dispose();
      ['top', 'rail', 'trim', 'line', 'base'].forEach((k) => parts[k].dispose());
    },
    [parts]
  );

  const flat = [-Math.PI / 2, 0, 0];
  return (
    <group>
      <mesh geometry={parts.base} rotation={flat} position={[0, -0.75, 0]}>
        <meshStandardMaterial color="#0c0907" roughness={0.9} />
      </mesh>
      <mesh geometry={parts.top} rotation={flat} position={[0, -0.1, 0]} receiveShadow>
        <meshStandardMaterial map={parts.tex} roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={parts.rail} rotation={flat} position={[0, -0.08, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a1a12" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh geometry={parts.trim} rotation={flat} position={[0, 0.001, 0]}>
        <meshStandardMaterial color={parts.gold} roughness={0.35} metalness={0.75} />
      </mesh>
      <mesh geometry={parts.line} rotation={flat} position={[0, 0.001, 0]}>
        <meshStandardMaterial color={parts.felt2} roughness={1} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
