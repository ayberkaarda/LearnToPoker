import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCardTexture } from '../cards/drawCardFace.js';

const EDGE_COLOR = '#efe6d2';

const edgeMaterial = new THREE.MeshStandardMaterial({ color: EDGE_COLOR, roughness: 0.7, metalness: 0 });

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A 1 × 1.4 × 0.02 playing card. The face is on +Z, the back on -Z.
 * `faceUp=false` turns the card over (animated flip unless `animateFlip` is false).
 * Accepts standard group props (position, rotation, scale, onClick, …).
 */
export default function CardMesh({
  card,
  faceUp = true,
  animateFlip = true,
  flipSpeed = 10,
  castShadow = true,
  receiveShadow = false,
  children,
  ...groupProps
}) {
  const inner = useRef();
  const target = faceUp && card ? 0 : Math.PI;

  const materials = useMemo(() => {
    const front = new THREE.MeshStandardMaterial({
      map: getCardTexture(card || 'back'),
      roughness: 0.42,
      metalness: 0,
      transparent: true,
      alphaTest: 0.5,
    });
    const back = new THREE.MeshStandardMaterial({
      map: getCardTexture('back'),
      roughness: 0.5,
      metalness: 0,
      transparent: true,
      alphaTest: 0.5,
    });
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
    if (!mounted.current && inner.current) {
      inner.current.rotation.y = target;
      mounted.current = true;
    }
  }, [target]);

  useFrame((_, delta) => {
    const g = inner.current;
    if (!g) return;
    const cur = g.rotation.y;
    if (Math.abs(cur - target) < 0.0005) {
      g.rotation.y = target;
      g.position.z = 0;
      return;
    }
    if (!animateFlip || prefersReducedMotion()) {
      g.rotation.y = target;
      g.position.z = 0;
      return;
    }
    const k = 1 - Math.exp(-flipSpeed * Math.min(delta, 0.1));
    g.rotation.y = cur + (target - cur) * k;
    // Lift slightly while turning so the card never clips through the table.
    g.position.z = Math.sin(Math.min(Math.abs(target - g.rotation.y), Math.PI)) * 0.35;
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
