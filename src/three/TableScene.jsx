import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

function TableCard({ card, faceUp, pos, tilt = 0, scale, delay = 0 }) {
  const ref = useRef();
  const [shown, setShown] = useState(false);
  const born = useRef(null);
  const goal = useRef({ pos, tilt, scale });
  goal.current = { pos, tilt, scale };

  useEffect(() => {
    const id = setTimeout(() => setShown(true), reducedMotion() ? 0 : delay * 1000 + 260);
    return () => clearTimeout(id);
  }, [delay]);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    if (born.current === null) born.current = state.clock.elapsedTime;
    const { pos: p, tilt: tl, scale: s } = goal.current;
    if (reducedMotion()) {
      g.position.set(p[0], p[1], p[2]);
      g.rotation.x = tl;
      g.scale.setScalar(s);
      return;
    }
    if (state.clock.elapsedTime - born.current < delay) return;
    const k = 1 - Math.exp(-8 * Math.min(dt, 0.1));
    g.position.x += (p[0] - g.position.x) * k;
    g.position.y += (p[1] - g.position.y) * k;
    g.position.z += (p[2] - g.position.z) * k;
    g.rotation.x += (tl - g.rotation.x) * k;
    const sc = g.scale.x + (s - g.scale.x) * k;
    g.scale.setScalar(sc);
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
    const elev = (aspect < 1 ? 66 : aspect < 1.4 ? 60 : 54) * (Math.PI / 180);
    const look = new THREE.Vector3(0, 0, aspect < 1 ? 0.35 : 0.3);
    const dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev));
    const pts = [
      [-(TABLE_RX + 0.75), 0, 0],
      [TABLE_RX + 0.75, 0, 0],
      [0, 0, -(TABLE_RZ + 0.75)],
      [0, 0, TABLE_RZ + 1.0],
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

function Scene({ game, drawSelection, onLayout }) {
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
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff5e0', '#0a1713', 0.35]} />
      <directionalLight
        position={[2.5, 9, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      <pointLight position={[0, 3.2, 0]} intensity={6} distance={9} color="#ffe2a8" />

      <FeltTable />
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
  if (!game) return null;
  return (
    <GLBoundary onFail={onFail}>
      <Canvas
        className="table3d"
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        shadows
        camera={{ fov: 38, near: 0.1, far: 100, position: [0, 8, 6] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Scene game={game} drawSelection={drawSelection} onLayout={onLayout} />
      </Canvas>
    </GLBoundary>
  );
}
