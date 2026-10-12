import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCardTexture } from '../cards/drawCardFace.js';
import { isReducedMotion } from '../motion/useMotionPreference.js';

const EDGE_COLOR = '#e9dfc9';

const edgeMaterial = new THREE.MeshStandardMaterial({ color: EDGE_COLOR, roughness: 0.75, metalness: 0 });

const prefersReducedMotion = isReducedMotion;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function cardStock(map) {
  // Coated card stock: matte base with a thin lacquer so moving lights read as a sheen.
  return new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    transparent: true,
    alphaTest: 0.5,
  });
}

/**
 * A 1 × 1.4 × 0.02 playing card. The face is on +Z, the back on -Z.
 * `faceUp=false` turns the card over (eased flip with a small lift unless `animateFlip` is false).
 * Accepts standard group props (position, rotation, scale, onClick, …).
 */
export default function CardMesh({
  card,
  faceUp = true,
  animateFlip = true,
  flipDuration = 0.6,
  flipSpeed,
  castShadow = true,
  receiveShadow = false,
  children,
  ...groupProps
}) {
  const inner = useRef();
  const target = faceUp && card ? 0 : Math.PI;
  const flip = useRef({ from: target, to: target, t: 1 });
  const dur = flipSpeed ? 6 / flipSpeed : flipDuration;

  const materials = useMemo(() => {
    const front = cardStock(getCardTexture(card || 'back'));
    const back = cardStock(getCardTexture('back'));
    // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
    return [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, front, back];
  }, [card && typeof card === 'object' ? `${card.rank}${card.suit}` : card]);

  useEffect(
    () => () => {
      materials[4].dispose();
      materials[5].dispose();
    },
    [materials]
  );

  // Snap on mount, ease afterwards.
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const g = inner.current;
    if (!g) return;
    if (!mounted.current) {
      g.rotation.y = target;
      flip.current = { from: target, to: target, t: 1 };
      mounted.current = true;
      return;
    }
    if (flip.current.to !== target) flip.current = { from: g.rotation.y, to: target, t: 0 };
  }, [target]);

  useFrame((_, delta) => {
    const g = inner.current;
    const f = flip.current;
    if (!g || f.t >= 1) return;
    if (!animateFlip || prefersReducedMotion()) {
      f.t = 1;
      g.rotation.y = f.to;
      g.position.z = 0;
      return;
    }
    f.t = Math.min(1, f.t + Math.min(delta, 0.1) / dur);
    const e = easeInOutCubic(f.t);
    g.rotation.y = f.from + (f.to - f.from) * e;
    // Lift while turning so the card never clips through the table, and lean a touch for weight.
    g.position.z = Math.sin(Math.PI * f.t) * 0.4;
    g.rotation.x = Math.sin(Math.PI * f.t) * 0.12;
    if (f.t >= 1) {
      g.position.z = 0;
      g.rotation.x = 0;
    }
  });

  return (
    <group {...groupProps}>
      <group ref={inner}>
        <mesh material={materials} castShadow={castShadow} receiveShadow={receiveShadow}>
          <boxGeometry args={[1, 1.4, 0.02]} />
        </mesh>
      </group>
      {children}
    </group>
  );
}
