import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import CardMesh from './CardMesh.jsx';

const CARDS = [
  { card: 'As', faceUp: true, pos: [0.2, 0.9, 0.6], rot: [0.1, -0.35, 0.18], s: 1.15 },
  { card: 'Kh', faceUp: true, pos: [1.6, -0.2, 0.2], rot: [-0.15, -0.5, -0.12], s: 1.05 },
  { card: 'Qd', faceUp: true, pos: [-1.2, -0.6, 0.1], rot: [0.2, 0.4, 0.22], s: 1 },
  { card: 'Jc', faceUp: true, pos: [2.6, 1.4, -1.2], rot: [0.05, -0.7, 0.3], s: 0.95 },
  { card: 'Ts', faceUp: true, pos: [-0.4, -1.9, -0.6], rot: [-0.3, 0.2, -0.35], s: 0.95 },
  { card: 'back', faceUp: false, pos: [-2.4, 1.3, -1.4], rot: [0.25, 0.6, -0.2], s: 0.9 },
  { card: 'back', faceUp: false, pos: [3.3, -1.5, -2], rot: [-0.2, -0.9, 0.4], s: 0.9 },
  { card: 'back', faceUp: false, pos: [-3.2, -1.2, -2.6], rot: [0.1, 0.8, 0.5], s: 0.85 },
  { card: 'back', faceUp: false, pos: [1, 2.3, -2.8], rot: [0.4, -0.2, -0.1], s: 0.85 },
];

function FloatingCard({ cfg, index, still }) {
  const ref = useRef();
  const phase = useMemo(() => index * 1.37, [index]);
  useFrame((state) => {
    if (still || !ref.current) return;
    const t = state.clock.elapsedTime * 0.5 + phase;
    ref.current.position.set(
      cfg.pos[0] + Math.sin(t * 0.7) * 0.12,
      cfg.pos[1] + Math.sin(t) * 0.22,
      cfg.pos[2] + Math.cos(t * 0.6) * 0.1,
    );
    ref.current.rotation.set(
      cfg.rot[0] + Math.sin(t * 0.8) * 0.08,
      cfg.rot[1] + Math.sin(t * 0.5) * 0.18,
      cfg.rot[2] + Math.cos(t * 0.7) * 0.06,
    );
  });
  const card = cfg.card === 'back' ? 'As' : cfg.card;
  return (
    <group ref={ref} position={cfg.pos} rotation={cfg.rot} scale={cfg.s}>
      <CardMesh card={card} faceUp={cfg.faceUp} />
    </group>
  );
}

function Rig({ children, still }) {
  const ref = useRef();
  useFrame((state) => {
    if (still || !ref.current) return;
    const { x, y } = state.pointer;
    const g = ref.current;
    g.rotation.y += (x * 0.18 - g.rotation.y) * 0.04;
    g.rotation.x += (-y * 0.12 - g.rotation.x) * 0.04;
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroScene({ reducedMotion = false, offsetX = 0 }) {
  return (
    <Canvas
      className="landing-hero__canvas"
      dpr={[1, 1.5]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
    >
      <fog attach="fog" args={['#0a1713', 6, 13]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[2.5, 3, 4]} intensity={60} color="#f0cf7a" />
      <pointLight position={[-4, -2, 2]} intensity={12} color="#2a7350" />
      <group position={[offsetX, 0, 0]}>
        <Rig still={reducedMotion}>
          {CARDS.map((cfg, i) => (
            <FloatingCard key={i} cfg={cfg} index={i} still={reducedMotion} />
          ))}
        </Rig>
      </group>
    </Canvas>
  );
}
