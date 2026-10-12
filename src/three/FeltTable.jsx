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

function extrude(shape, depth, bevel = 0, segments = 4) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 112,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
  });
}

/**
 * Felt cloth: oxblood with a lit centre, woven noise, a printed betting line and the
 * house wordmark. The canvas is squeezed onto an ellipse, so artwork is pre-stretched.
 */
function feltTexture(felt, felt2, gold, rx, rz, size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const S = size;
  const grad = g.createRadialGradient(S / 2, S / 2, S * 0.04, S / 2, S / 2, S * 0.52);
  grad.addColorStop(0, felt2);
  grad.addColorStop(0.62, felt);
  grad.addColorStop(1, '#22060b');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);

  // woven fibre noise
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    img.data[i] += n;
    img.data[i + 1] += n * 0.6;
    img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);

  // printed betting line
  g.strokeStyle = gold;
  g.globalAlpha = 0.5;
  g.lineWidth = S * 0.0028;
  g.beginPath();
  g.ellipse(S / 2, S / 2, S * 0.36, S * 0.355, 0, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 0.18;
  g.lineWidth = S * 0.0012;
  g.beginPath();
  g.ellipse(S / 2, S / 2, S * 0.372, S * 0.368, 0, 0, Math.PI * 2);
  g.stroke();

  // wordmark, stretched vertically to undo the ellipse squeeze
  const stretch = (rx + 0.1) / (rz + 0.1);
  g.save();
  g.translate(S / 2, S * 0.69);
  g.scale(1, stretch);
  g.globalAlpha = 0.16;
  g.fillStyle = gold;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `italic 400 ${Math.round(S * 0.034)}px 'Bodoni Moda', Georgia, serif`;
  g.fillText('LearnToPoker', 0, 0);
  g.restore();
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Oval poker table: felt top at y=0, padded leather rail, walnut racetrack, brass trim. */
export default function FeltTable({ rx = TABLE_RX, rz = TABLE_RZ, quality = 'high' }) {
  const parts = useMemo(() => {
    const felt = cssVar('--felt', '#4a0f17');
    const felt2 = cssVar('--felt-2', '#6e1722');
    const gold = cssVar('--gold', '#c9a45c');
    const tex = feltTexture(felt, felt2, gold, rx, rz, quality === 'high' ? 1024 : 512);
    // ExtrudeGeometry UVs are shape coordinates; map the ellipse into 0..1
    tex.repeat.set(1 / (2 * (rx + 0.1)), 1 / (2 * (rz + 0.1)));
    tex.offset.set(0.5, 0.5);
    return {
      tex,
      gold,
      top: extrude(ellipse(rx + 0.1, rz + 0.1), 0.1),
      racetrack: extrude(ellipse(rx + 0.32, rz + 0.32, [rx - 0.02, rz - 0.02]), 0.05),
      rail: extrude(ellipse(rx + 0.72, rz + 0.72, [rx + 0.3, rz + 0.3]), 0.12, 0.16, 6),
      trim: extrude(ellipse(rx + 0.02, rz + 0.02, [rx - 0.03, rz - 0.03]), 0.03),
      base: extrude(ellipse(rx + 0.5, rz + 0.5), 0.6),
    };
  }, [rx, rz, quality]);

  useEffect(
    () => () => {
      parts.tex.dispose();
      ['top', 'racetrack', 'rail', 'trim', 'base'].forEach((k) => parts[k].dispose());
    },
    [parts]
  );

  const flat = [-Math.PI / 2, 0, 0];
  return (
    <group>
      <mesh geometry={parts.base} rotation={flat} position={[0, -0.85, 0]}>
        <meshStandardMaterial color="#0d0907" roughness={0.85} />
      </mesh>
      <mesh geometry={parts.top} rotation={flat} position={[0, -0.1, 0]} receiveShadow>
        <meshStandardMaterial map={parts.tex} roughness={0.95} metalness={0} />
      </mesh>
      {/* walnut racetrack */}
      <mesh geometry={parts.racetrack} rotation={flat} position={[0, -0.04, 0]} receiveShadow>
        <meshPhysicalMaterial color="#2a170f" roughness={0.38} clearcoat={0.8} clearcoatRoughness={0.2} />
      </mesh>
      {/* padded leather rail */}
      <mesh geometry={parts.rail} rotation={flat} position={[0, -0.06, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#160e0b" roughness={0.5} sheen={0.6} sheenColor="#5a2a20" clearcoat={0.35} clearcoatRoughness={0.45} />
      </mesh>
      {/* brass inlay where felt meets wood */}
      <mesh geometry={parts.trim} rotation={flat} position={[0, -0.015, 0]}>
        <meshStandardMaterial color={parts.gold} roughness={0.28} metalness={0.95} />
      </mesh>
    </group>
  );
}
