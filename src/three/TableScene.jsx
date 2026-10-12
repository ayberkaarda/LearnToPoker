import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import CardMesh from './CardMesh.jsx';
import FeltTable, { TABLE_RX, TABLE_RZ } from './FeltTable.jsx';
import ChipStack from './ChipStack.jsx';
import { visibleCards } from '../engine/game.js';
import { PHASE, collectedPot } from '../store/gameStore.js';

const HALF_PI = Math.PI / 2;
export const DECK_POS = [-1.25, 0.04, -1.15];
const MUCK_POS = [1.05, 0.03, -1.2];
const POT_POS = [0, 0, 0.6];
const BOARD_Z = -0.22;

/** Seat angle on the oval; seat 0 (the human) sits bottom-centre, play goes clockwise (to the human's left). */
export function seatAngle(i, n) {
  return HALF_PI + (i * Math.PI * 2) / n;
}

export function seatPoint(i, n, k = 1, y = 0) {
  const a = seatAngle(i, n);
  return [Math.cos(a) * TABLE_RX * k, y, Math.sin(a) * TABLE_RZ * k];
}

/** Percent position of a seat label for the flat (2D) table. */
export function seatPercent(i, n) {
  const a = seatAngle(i, n);
  return [50 + Math.cos(a) * 40, 52 + Math.sin(a) * 33];
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function hasWebGL() {
  try {
    if (typeof window === 'undefined' || !window.WebGLRenderingContext) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class GLBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ---------------------------------------------------------------- cards

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const FLIGHT = 0.62;

/**
 * A card that flies from the shoe to its spot: eased glide, a low arc and a spin that
 * settles as it lands. Later moves (fold to muck, draw lift) reuse the same flight.
 */
function TableCard({ card, faceUp, pos, tilt = 0, scale, delay = 0, spin = 1 }) {
  const ref = useRef();
  const [shown, setShown] = useState(false);
  const goal = useRef({ pos, tilt, scale });
  goal.current = { pos, tilt, scale };
  const flight = useRef(null);
  const clock = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setShown(true), reducedMotion() ? 0 : (delay + FLIGHT * 0.8) * 1000);
    return () => clearTimeout(id);
  }, [delay]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { pos: p, tilt: tl, scale: s } = goal.current;
    if (reducedMotion()) {
      g.position.set(p[0], p[1], p[2]);
      g.rotation.set(tl, 0, 0);
      g.scale.setScalar(s);
      return;
    }
    clock.current += Math.min(dt, 0.1);
    if (clock.current < delay) return;
    let f = flight.current;
    if (!f || f.to[0] !== p[0] || f.to[1] !== p[1] || f.to[2] !== p[2] || f.tilt !== tl || f.scale !== s) {
      f = flight.current = {
        from: [g.position.x, g.position.y, g.position.z],
        fromTilt: g.rotation.x,
        fromScale: g.scale.x,
        fromSpin: f ? g.rotation.y : spin * 1.4,
        to: p,
        tilt: tl,
        scale: s,
        t: 0,
        arc: f ? 0.25 : 0.55,
      };
    }
    if (f.t >= 1) return;
    f.t = Math.min(1, f.t + Math.min(dt, 0.1) / FLIGHT);
    const e = easeOutCubic(f.t);
    g.position.set(
      f.from[0] + (p[0] - f.from[0]) * e,
      f.from[1] + (p[1] - f.from[1]) * e + Math.sin(Math.PI * Math.min(1, f.t * 1.15)) * f.arc * (1 - f.t * 0.4),
      f.from[2] + (p[2] - f.from[2]) * e
    );
    g.rotation.x = f.fromTilt + (tl - f.fromTilt) * e;
    g.rotation.y = f.fromSpin * (1 - e);
    g.scale.setScalar(f.fromScale + (s - f.fromScale) * e);
  });

  return (
    <group ref={ref} position={DECK_POS} scale={0.42}>
      <CardMesh card={card} faceUp={faceUp && shown} rotation={[-HALF_PI, 0, 0]} />
    </group>
  );
}

function seatCardLayout(game, i, drawSelection) {
  const n = game.players.length;
  const p = game.players[i];
  const cards = visibleCards(game, 0, p);
  const human = p.isHuman;
  const count = cards.length;
  const scale = human ? (count > 5 ? 0.5 : 0.6) : count > 5 ? 0.4 : 0.44;
  const spacing = human ? scale * (count > 4 ? 0.82 : 1.06) : scale * (count > 4 ? 0.56 : 0.72);
  const anchor = seatPoint(i, n, human ? 0.58 : 0.66);
  return cards.map((c, j) => {
    const off = (j - (count - 1) / 2) * spacing;
    let pos = [anchor[0] + off, (human ? 0.7 * scale * Math.sin(0.45) + 0.02 : 0.012) + j * 0.004, anchor[2]];
    let tilt = human ? 0.45 : 0;
    let faceUp = c.faceUp;
    let sc = scale;
    if (p.folded) {
      pos = [MUCK_POS[0] + ((i * 0.07 + j * 0.05) % 0.3), MUCK_POS[1] + i * 0.004 + j * 0.002, MUCK_POS[2] + ((i * 0.05) % 0.15)];
      tilt = 0;
      faceUp = false;
      sc = 0.36;
    } else if (human && drawSelection.includes(c.id)) {
      pos = [pos[0], pos[1] + 0.1, pos[2] - 0.2];
    }
    const seatOrder = (i - game.dealerIdx - 1 + n) % n;
    const first = game.variant.streets[0].deal?.hole ?? game.variant.streets[0].deal?.stud?.length ?? 2;
    return { key: `${game.handNumber}-${i}-${c.id}`, card: c, faceUp, pos, tilt, scale: sc, order: j < first && game.streetIdx === 0 ? j * n + seatOrder : seatOrder };
  });
}

// ---------------------------------------------------------------- camera

function CameraRig({ n, onLayout }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const elev = (aspect < 0.8 ? 78 : aspect < 1 ? 68 : aspect < 1.4 ? 60 : 54) * (Math.PI / 180);
    const look = new THREE.Vector3(0, 0, aspect < 1 ? 0.35 : 0.3);
    const dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev));
    const pts = [
      [-(TABLE_RX + 0.95), 0, 0],
      [TABLE_RX + 0.95, 0, 0],
      [0, 0, -(TABLE_RZ + 0.95)],
      [0, 0, TABLE_RZ + 1.15],
    ].map((a) => new THREE.Vector3(...a));
    const v = new THREE.Vector3();
    const fits = (d) => {
      camera.position.copy(look).addScaledVector(dir, d);
      camera.lookAt(look);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      return pts.every((p) => {
        v.copy(p).project(camera);
        return Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.86;
      });
    };
    let lo = 4;
    let hi = 40;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    fits(hi);
    if (onLayout) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const sp = seatPoint(i, n, i === 0 ? 1.0 : 0.98, 0.1);
        v.set(sp[0], sp[1], i === 0 ? sp[2] + 0.5 : sp[2]).project(camera);
        out.push([Math.max(6, Math.min(94, (v.x * 0.5 + 0.5) * 100)), Math.max(5, Math.min(95, (-v.y * 0.5 + 0.5) * 100))]);
      }
      onLayout(out);
    }
  }, [camera, size.width, size.height, n, onLayout]);
  return null;
}

// ---------------------------------------------------------------- dealer button

function DealerButton({ target }) {
  const ref = useRef();
  const goal = useRef(target);
  goal.current = target;
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = reducedMotion() ? 1 : 1 - Math.exp(-5 * Math.min(dt, 0.1));
    g.position.x += (goal.current[0] - g.position.x) * k;
    g.position.z += (goal.current[2] - g.position.z) * k;
  });
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#f6f1e4';
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#c9b98f';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(64, 64, 52, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.font = 'bold 64px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('D', 64, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group ref={ref} position={[target[0], 0, target[2]]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 32]} />
        <meshStandardMaterial color="#e9e1cc" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.0605, 0]} rotation={[-HALF_PI, 0, 0]}>
        <circleGeometry args={[0.2, 32]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Deck() {
  return (
    <group position={DECK_POS}>
      <mesh position={[0, -0.02, 0]} castShadow>
        <boxGeometry args={[0.42, 0.05, 0.59]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.8} />
      </mesh>
      <CardMesh card={null} faceUp={false} rotation={[-HALF_PI, 0, 0]} scale={0.42} position={[0, 0.006, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- scene

function Scene({ game, drawSelection, onLayout, quality }) {
  const n = game.players.length;
  const complete = game.phase === PHASE.COMPLETE;

  const seatCards = useMemo(() => {
    const all = [];
    for (let i = 0; i < n; i++) if (!game.players[i].sittingOut) all.push(...seatCardLayout(game, i, drawSelection));
    return all;
  }, [game, drawSelection, n]);

  const boardCards = game.board.map((c, j) => ({
    key: `${game.handNumber}-b-${c.id}`,
    card: c,
    pos: [(j - 2) * 0.68, 0.012, BOARD_Z],
    order: j < 3 ? j : 0,
  }));

  const pot = complete ? 0 : collectedPot(game);
  const winners = complete && game.result ? game.result.winners : [];
  const dealerTarget = useMemo(() => {
    const a = seatAngle(game.dealerIdx, n);
    const base = seatPoint(game.dealerIdx, n, 0.56);
    return [base[0] - Math.sin(a) * 0.95, 0, base[2] + Math.cos(a) * 0.55];
  }, [game.dealerIdx, n]);

  return (
    <>
      <CameraRig n={n} onLayout={onLayout} />
      <ambientLight intensity={0.18} />
      <hemisphereLight args={['#ffe9c8', '#1a0508', 0.35]} />
      {/* the pool of light over the felt; everything past the rail falls off into the room */}
      <spotLight
        position={[0.4, 9, 2.4]}
        angle={0.62}
        penumbra={0.75}
        intensity={120}
        decay={2}
        color="#ffe3b8"
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <pointLight position={[0, 2.6, 0.6]} intensity={5} distance={7} color="#ffd9a0" />
      <pointLight position={[-6, 1.5, -3]} intensity={10} distance={12} color="#b3202f" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#ffe6bf" position={[0, 6, 0]} rotation={[HALF_PI, 0, 0]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#b3202f" position={[-6, 1, 0]} rotation={[0, HALF_PI, 0]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#fff0d8" position={[6, 1, 2]} rotation={[0, -HALF_PI, 0]} scale={[6, 2, 1]} />
      </Environment>

      <FeltTable quality={quality} />
      <Deck />

      {seatCards.map((c) => (
        <TableCard key={c.key} card={c.card} faceUp={c.faceUp} pos={c.pos} tilt={c.tilt} scale={c.scale} delay={Math.min(c.order, 30) * 0.07} />
      ))}
      {boardCards.map((c) => (
        <TableCard key={c.key} card={c.card} faceUp pos={c.pos} scale={0.6} delay={c.order * 0.12} />
      ))}

      {game.players.map((p, i) =>
        p.bet > 0 ? <ChipStack key={`bet-${game.handNumber}-${i}`} amount={p.bet} position={seatPoint(i, n, 0.42, 0.005)} from={seatPoint(i, n, 0.6, 0.005)} /> : null
      )}
      {pot > 0 && <ChipStack key={`pot-${game.handNumber}`} amount={pot} position={POT_POS} />}
      {winners.map((w) => (
        <ChipStack key={`win-${game.handNumber}-${w.playerIdx}`} amount={w.amount} from={POT_POS} position={seatPoint(w.playerIdx, n, 0.4, 0.005)} />
      ))}

      <DealerButton target={dealerTarget} />
    </>
  );
}

/** The 3D table. Pure renderer over the game state; seat labels are DOM, positioned via `onLayout`. */
export default function TableScene({ game, drawSelection = [], onLayout, onFail }) {
  const [quality] = useState(() => (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 720px)').matches ? 'high' : 'low'));
  if (!game) return null;
  return (
    <GLBoundary onFail={onFail}>
      <Canvas
        className="table3d"
        style={{ position: 'absolute', inset: 0 }}
        dpr={quality === 'high' ? [1, 1.75] : [1, 1.25]}
        shadows={quality === 'high' ? 'soft' : false}
        camera={{ fov: 38, near: 0.1, far: 100, position: [0, 8, 6] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Scene game={game} drawSelection={drawSelection} onLayout={onLayout} quality={quality} />
      </Canvas>
    </GLBoundary>
  );
}
