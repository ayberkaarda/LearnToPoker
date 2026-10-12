import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import CardMesh from './CardMesh.jsx';
import { getCardTexture } from '../cards/drawCardFace.js';
import { FORMATIONS, TRANSITION, STAGGER, easeInOutCubic } from './heroFormations.js';

/*
  The hero: a royal flush is dealt into a fan under a warm key light, then the hand keeps
  moving through a cycle of formations (see heroFormations.js) while falling card backs and
  out-of-focus light drift behind it. Scrolling pulls the hand apart toward the camera.
*/

const BACKS = [
  { x: 2.6, y: 1.8, z: -3.4, s: 0.9, spin: 0.35 },
  { x: -2.2, y: -0.4, z: -4.6, s: 0.85, spin: -0.28 },
  { x: 1.2, y: -2.6, z: -5.2, s: 0.8, spin: 0.22 },
  { x: -0.6, y: 2.9, z: -5.8, s: 0.8, spin: -0.4 },
  { x: 3.8, y: -1.4, z: -6.4, s: 0.75, spin: 0.3 },
  { x: -3.6, y: 2.2, z: -7.4, s: 0.75, spin: -0.2 },
];

const easeOutBack = (t) => {
  const c1 = 1.25;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const read = (p) => (p && typeof p.get === 'function' ? p.get() : 0);

// ---------------------------------------------------------------- shared textures

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

// ---------------------------------------------------------------- bokeh (fake depth of field)

const BOKEH_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFocus;
  uniform float uLift;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec3 p = position;
    float speed = 0.08 + aSeed * 0.12;
    p.y = mod(p.y + uTime * speed + uLift * (1.0 + aSeed) * 3.0 + 6.0, 12.0) - 6.0;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float blur = abs(depth - uFocus);
    gl_PointSize = aSize * (1.0 + blur * 1.6) * uPixelRatio * (120.0 / max(depth, 0.5));
    vAlpha = 0.85 / (1.0 + blur * blur * 0.55);
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`;

const BOKEH_FRAG = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.5, 0.4, d);
    float rim = smoothstep(0.5, 0.44, d) - smoothstep(0.44, 0.34, d);
    float a = (disc * 0.32 + rim * 0.4) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

function Bokeh({ count, progress, still }) {
  const mat = useRef();
  const { gl } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const gold = new THREE.Color('#e9c98a');
    const red = new THREE.Color('#d8394a');
    const cream = new THREE.Color('#fff1d6');
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 16;
      pos[i * 3 + 1] = (rnd() - 0.5) * 12;
      pos[i * 3 + 2] = -1 - rnd() * 9 + (rnd() < 0.18 ? 6.5 : 0);
      size[i] = 6 + rnd() * 16;
      seed[i] = rnd();
      const c = rnd() < 0.62 ? gold : rnd() < 0.6 ? red : cream;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFocus: { value: 7 }, uLift: { value: 0 } }),
    []
  );

  useFrame((state, dt) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uPixelRatio.value = gl.getPixelRatio();
    if (!still) u.uTime.value += Math.min(dt, 0.1);
    u.uLift.value = read(progress);
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={BOKEH_VERT}
        fragmentShader={BOKEH_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------------------------------------------------------------- the hand

const TAU = Math.PI * 2;
const POSE_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz'];
const DEAL_DURATION = 1.05;
const DEAL_STAGGER = 0.13;
const edgeStock = new THREE.MeshStandardMaterial({ color: '#e9dfc9', roughness: 0.75, metalness: 0 });
const cardStock = (map) =>
  new THREE.MeshPhysicalMaterial({ map, roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3, transparent: true, alphaTest: 0.5 });
const copyPose = (to, from) => {
  for (const k of POSE_KEYS) to[k] = from[k];
  return to;
};

/*
  The hand cycles through FORMATIONS forever. One frame loop drives every card: each
  formation change snapshots where the cards are, then each card eases (with a small
  stagger) from its snapshot to the formation's live pose. Faces are swapped only while
  a card shows its back, so the hand on display changes without anything popping.
  Scroll progress is layered on top of whatever pose the card is in.
*/
function Hand({ count, progress, still, width }) {
  const groups = useRef([]);
  const glows = useRef([]);
  const sim = useRef(null);
  const { camera } = useThree();

  const mats = useMemo(() => {
    const back = cardStock(getCardTexture('back'));
    const fronts = Array.from({ length: count }, (_, i) => cardStock(getCardTexture(FORMATIONS[0].pose(i, count, 0, width).card)));
    return { back, fronts };
  }, [count, width]);
  useEffect(
    () => () => {
      mats.back.dispose();
      mats.fronts.forEach((m) => m.dispose());
    },
    [mats]
  );
  const materials = useMemo(() => mats.fronts.map((f) => [edgeStock, edgeStock, edgeStock, edgeStock, f, mats.back]), [mats]);
  const scratch = useMemo(() => ({ normal: new THREE.Vector3(), toCam: new THREE.Vector3(), pos: new THREE.Vector3() }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    let s = sim.current;
    if (!s || s.count !== count || s.width !== width) {
      // first frame: deal the royal flush up from below (or just show it when motion is reduced)
      s = sim.current = {
        count,
        width,
        k: 0,
        start: t + 0.25,
        dealing: true,
        offsets: new Array(count).fill(0),
        snap: Array.from({ length: count }, (_, i) => {
          const dir = i - (count - 1) / 2;
          const slot = FORMATIONS[0].pose(i, count, 0, width);
          return { x: 0, y: -3.6, z: slot.z, rx: -1.1, ry: slot.ry + 0.18 * dir * 0.6, rz: 0 };
        }),
        cur: Array.from({ length: count }, () => ({ x: 0, y: -3.6, z: 0, rx: 0, ry: 0, rz: 0 })),
        shown: Array.from({ length: count }, (_, i) => FORMATIONS[0].pose(i, count, 0, width).card),
      };
    }

    if (still) {
      // reduced motion: the static fan; the cycle restarts from it when motion comes back
      s.k = 0;
      s.start = t - TRANSITION - STAGGER * count;
      s.dealing = false;
      s.offsets.fill(0);
      for (let i = 0; i < count; i++) copyPose(s.snap[i], FORMATIONS[0].pose(i, count, 0, width));
    } else if (t - s.start >= FORMATIONS[s.k].hold + TRANSITION + STAGGER * (count - 1)) {
      // next formation: snapshot, then pick the 2π turn count that keeps each card's spin short
      s.k = (s.k + 1) % FORMATIONS.length;
      s.start = t;
      s.dealing = false;
      for (let i = 0; i < count; i++) {
        copyPose(s.snap[i], s.cur[i]);
        const target = FORMATIONS[s.k].pose(i, count, 0, width);
        let off = TAU * Math.round((s.snap[i].ry - target.ry) / TAU);
        // a card whose face is about to change must show its back on the way
        if (target.card !== s.shown[i] && Math.cos(s.snap[i].ry) > 0 && Math.cos(target.ry) > 0) {
          off += target.ry + off >= s.snap[i].ry ? TAU : -TAU;
        }
        s.offsets[i] = off;
      }
    }

    const f = FORMATIONS[s.k];
    const tl = Math.max(0, t - s.start);
    const p = read(progress);
    const spread = 1 + easeOutExpo(clamp01(p * 1.4)) * 0.55;
    const fly = clamp01((p - 0.25) / 0.75);

    for (let i = 0; i < count; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const target = f.pose(i, count, still ? 0 : tl, width);
      target.ry += s.offsets[i];
      let e;
      if (still) e = 1;
      else if (s.dealing) e = easeOutBack(clamp01((t - s.start - i * DEAL_STAGGER) / DEAL_DURATION));
      else e = easeInOutCubic(clamp01((tl - i * STAGGER) / TRANSITION));
      const c = s.cur[i];
      const a = s.snap[i];
      for (const k of POSE_KEYS) c[k] = a[k] + (target[k] - a[k]) * e;

      // scroll exit on top of the current pose: the hand opens, then peels toward the camera
      const dir = ((i - (count - 1) / 2) * 4) / Math.max(1, count - 1);
      const idle = still ? 0 : Math.sin(t * 0.8 + i * 0.7) * 0.035;
      g.position.set(
        c.x * spread + fly * (2 + dir * 1.2),
        c.y + idle + fly * (1.8 - Math.abs(dir) * 0.6),
        c.z + fly * (2.6 + Math.abs(dir) * 0.4)
      );
      g.rotation.set(c.rx + fly * -0.5, c.ry + fly * dir * 0.35, c.rz * spread + fly * dir * 0.25);

      // which way the face points relative to the camera (1 = straight at it, -1 = away)
      g.updateWorldMatrix(true, false);
      scratch.normal.setFromMatrixColumn(g.matrixWorld, 2).normalize();
      scratch.pos.setFromMatrixPosition(g.matrixWorld);
      scratch.toCam.copy(camera.position).sub(scratch.pos).normalize();
      const facing = scratch.normal.dot(scratch.toCam);

      // swap the face only while it is turned away from the camera
      if (s.shown[i] !== target.card && (still || facing < 0)) {
        mats.fronts[i].map = getCardTexture(target.card);
        s.shown[i] = target.card;
      }

      const glow = glows.current[i];
      if (glow) {
        const settled = s.dealing ? clamp01(e) : 1;
        // the halo sits behind the face; fade it out when the back is toward the camera
        const behind = clamp01(facing * 3);
        glow.material.opacity = (0.16 + Math.sin(t * 1.4 + i) * 0.04) * settled * behind * (1 - fly);
      }
    }
  });

  return (
    <>
      {materials.map((m, i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)} position={[0, -3.6, 0]}>
          <mesh ref={(el) => (glows.current[i] = el)} position={[0, 0, -0.05]} scale={[1.9, 2.3, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTexture()} color="#f0c27a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh material={m}>
            <boxGeometry args={[1, 1.4, 0.02]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function FallingBack({ cfg, index, still, progress }) {
  const ref = useRef();
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = still ? 0 : state.clock.elapsedTime;
    const p = read(progress);
    // slow fall that wraps around, plus a parallax push on scroll
    const y = ((cfg.y + 6 - t * (0.18 + index * 0.02)) % 12 + 12) % 12 - 6;
    g.position.set(cfg.x, y + p * 2.5, cfg.z);
    g.rotation.set(t * cfg.spin * 0.7 + index, t * cfg.spin + index * 0.5, t * cfg.spin * 0.4);
  });
  return (
    <group ref={ref} scale={cfg.s}>
      <CardMesh card={null} faceUp={false} castShadow={false} />
    </group>
  );
}

function KeyLight({ still }) {
  const sweep = useRef();
  useFrame((state) => {
    if (!sweep.current || still) return;
    // a narrow light passes across the hand every few seconds: the sheen on the lacquer
    const cycle = (state.clock.elapsedTime % 7) / 7;
    sweep.current.position.x = -6 + cycle * 12;
    sweep.current.intensity = Math.sin(Math.PI * cycle) * 70;
  });
  return (
    <>
      <ambientLight intensity={0.25} />
      <spotLight position={[0.5, 6, 6]} angle={0.42} penumbra={0.9} intensity={160} color="#ffe2b0" />
      <pointLight position={[-5, -2, 1]} intensity={22} color="#b3202f" />
      <pointLight ref={sweep} position={[-6, 1.2, 3]} intensity={0} distance={10} color="#fff4dc" />
    </>
  );
}

function Rig({ children, still, progress, wide }) {
  const ref = useRef();
  const { camera } = useThree();
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const p = read(progress);
    camera.position.z = 7 - p * 1.6;
    camera.position.y = p * -0.6;
    camera.lookAt(0, p * -0.3, 0);
    if (still) return;
    const { x, y } = state.pointer;
    g.rotation.y += (x * (wide ? 0.22 : 0.08) - g.rotation.y) * 0.05;
    g.rotation.x += (-y * 0.1 - g.rotation.x) * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

function Scene({ reducedMotion, offsetX, progress, compact }) {
  const backs = compact ? BACKS.slice(0, 3) : BACKS;
  const handY = compact ? 1.75 : 0.55;
  const handScale = compact ? 0.66 : 1.12;

  return (
    <>
      <fog attach="fog" args={['#0b0908', 7, 15]} />
      <KeyLight still={reducedMotion} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffe6bf" position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#b3202f" position={[-5, 0, 2]} scale={[2, 6, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#fff3dc" position={[4, 1, 4]} scale={2} />
      </Environment>
      <Rig still={reducedMotion} progress={progress} wide={!compact}>
        <group position={[offsetX, 0, 0]}>
          <mesh position={[0, handY - 0.4, -1.6]} scale={compact ? 7 : 9}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTexture()} color="#7a1826" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <group position={[0, handY, 0]} scale={handScale}>
            <Hand count={compact ? 5 : 7} progress={progress} still={reducedMotion} width={compact ? 0.72 : 1} />
          </group>
          {backs.map((cfg, i) => (
            <FallingBack key={i} cfg={cfg} index={i} still={reducedMotion} progress={progress} />
          ))}
        </group>
        <Bokeh count={compact ? 26 : 70} progress={progress} still={reducedMotion} />
      </Rig>
    </>
  );
}

export default function HeroScene({ reducedMotion = false, offsetX = 0, progress = null, compact = false, active = true }) {
  return (
    <Canvas
      className="landing-hero__canvas"
      dpr={compact ? [1, 1.25] : [1, 1.75]}
      frameloop={!active ? 'never' : reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: !compact, alpha: true, powerPreference: compact ? 'low-power' : 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
    >
      <Scene reducedMotion={reducedMotion} offsetX={offsetX} progress={progress} compact={compact} />
    </Canvas>
  );
}
