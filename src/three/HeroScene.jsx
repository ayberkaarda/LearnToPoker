import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import CardMesh from './CardMesh.jsx';

/*
  The hero is a single shot: a royal flush is dealt into a fan under a warm key light,
  falling card backs and out-of-focus light drift behind it, and scrolling pulls the
  hand apart toward the camera as the page moves on.
*/

const HAND = ['Th', 'Jh', 'Qh', 'Kh', 'Ah'];
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

function fanSlot(i) {
  const a = (i - 2) * 0.2;
  const R = 3.2;
  return { x: Math.sin(a) * R, y: Math.cos(a) * R - R, z: i * 0.035, rz: -a };
}

function HandCard({ card, index, progress, still, start }) {
  const ref = useRef();
  const glow = useRef();
  const slot = useMemo(() => fanSlot(index), [index]);
  const dir = index - 2;

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    if (start.current === null) start.current = t;
    // deal-in: each card slides off the deck below and settles with a little overshoot
    const local = still ? 1 : clamp01((t - start.current - 0.25 - index * 0.13) / 1.05);
    const e = still ? 1 : easeOutBack(local);
    const p = read(progress);
    // scroll: the fan opens, then cards peel away toward the camera
    const spread = 1 + easeOutExpo(clamp01(p * 1.4)) * 0.55;
    const fly = clamp01((p - 0.25) / 0.75);
    const idle = still ? 0 : Math.sin(t * 0.8 + index * 0.7) * 0.035;

    const tx = slot.x * spread + fly * (2 + dir * 1.2);
    const ty = slot.y + idle + fly * (1.8 - Math.abs(dir) * 0.6);
    const tz = slot.z + fly * (2.6 + Math.abs(dir) * 0.4);
    g.position.set(tx * e, -3.6 + (ty + 3.6) * e, tz);
    g.rotation.set(
      (1 - e) * -1.1 + fly * -0.5,
      (1 - e) * 0.6 * dir * 0.3 + fly * dir * 0.35,
      slot.rz * spread * e + fly * dir * 0.25
    );
    if (glow.current) glow.current.material.opacity = (0.16 + Math.sin(t * 1.4 + index) * 0.04) * e * (1 - fly);
  });

  return (
    <group ref={ref} position={[0, -3.6, slot.z]}>
      <mesh ref={glow} position={[0, 0, -0.05]} scale={[1.9, 2.3, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTexture()} color="#f0c27a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <CardMesh card={card} faceUp castShadow={false} />
    </group>
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
  const start = useRef(null);
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
            {HAND.map((c, i) => (
              <HandCard key={c} card={c} index={i} progress={progress} still={reducedMotion} start={start} />
            ))}
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
