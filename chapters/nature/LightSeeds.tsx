'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap } from '@/animation/gsap';
import { fx } from '@/engine/stage/rig';
import { sfx } from '@/engine/audio/AudioManager';
import { useExperience } from '@/store/experience';
import { STOPS, seedPosition } from './world';
import { SEED_STOPS, useSeeds, useWalkStop, wind } from './state';

/**
 * The three glowing light-seeds. Each one wakes up when the walk reaches its stop (brighter,
 * faster pulse, clickable), blooms into a burst of light when opened, then rests softly.
 */
const PLACEMENT: [number, number, number][] = [
  // forward, right, height above ground (metres): mid-right of the view, never at the lens
  [7.5, 2.8, 1.6], // forest: ahead and right, among the trunks
  [5.0, 3.2, 1.4], // water: on the near shore
  [7.0, 2.6, 1.7], // summit
];

function glowTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,248,230,1)');
  g.addColorStop(0.2, 'rgba(255,226,180,0.55)');
  g.addColorStop(0.55, 'rgba(228,200,255,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Opens seed `i`: a bloom of light, then the message card. Shared by the 3D click and the DOM button. */
export function openSeed(i: number) {
  if (useExperience.getState().phase !== 'idle') return;
  sfx.play('shimmer');
  const bloom = fx.bloom;
  gsap.timeline()
    .to(fx, { bloom: bloom + 1.4, duration: 0.25, ease: 'power2.out' })
    .to(fx, { bloom, duration: 1.2, ease: 'power2.inOut' });
  burst.i = i;
  burst.t = 0;
  useSeeds.getState().open(i);
}

/** Burst animation state read by the seeds' frame loop. */
const burst = { i: -1, t: 1 };

function Seed({ index, texture }: { index: number; texture: THREE.Texture }) {
  const group = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Sprite>(null!);
  const core = useRef<THREE.Mesh>(null!);
  const position = useMemo(() => seedPosition(STOPS[SEED_STOPS[index]], ...PLACEMENT[index]), [index]);
  const motes = useMemo(() => {
    const n = 24;
    const seeds = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) seeds.set([Math.random() * 6.28, 0.25 + Math.random() * 0.35, Math.random()], k * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: wind.uTime, uAwake: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uAwake;
        attribute vec3 aSeed;
        varying float vA;
        void main(){
          float a = aSeed.x + uTime * (0.6 + aSeed.z);
          float r = aSeed.y * (0.8 + 0.4 * uAwake);
          vec3 p = vec3(cos(a) * r, sin(uTime * 0.9 + aSeed.x * 3.0) * 0.25, sin(a) * r);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = 0.35 + 0.65 * uAwake;
          gl_PointSize = min(5.0 * (6.0 / -mv.z), 6.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * smoothstep(0.5, 0.0, d) * vA, 1.0);
        }`,
    });
    return { geo, mat };
  }, []);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.5), toneMapped: false }), []);
  const haloMat = useMemo(
    () => new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    [texture],
  );
  const awake = useRef(0);
  const hover = useRef(false);

  useEffect(
    () => () => {
      motes.geo.dispose();
      motes.mat.dispose();
      coreMat.dispose();
      haloMat.dispose();
    },
    [motes, coreMat, haloMat],
  );

  useFrame((state, dt) => {
    const stop = useWalkStop.getState().stop;
    const opened = useSeeds.getState().opened[index];
    const target = stop === SEED_STOPS[index] ? 1 : 0.15;
    awake.current += (target - awake.current) * Math.min(1, dt * 2.5);
    const a = awake.current;
    const t = state.clock.elapsedTime;
    const pulse = 0.85 + 0.15 * Math.sin(t * (opened ? 1.2 : 2.4) + index);
    let b = 0;
    if (burst.i === index && burst.t < 1) {
      burst.t = Math.min(1, burst.t + dt / 1.1);
      b = Math.sin(burst.t * Math.PI);
    }
    const s = (0.9 + 0.35 * a) * pulse * (hover.current ? 1.15 : 1) * (1 + b * 2.2) * (opened ? 0.8 : 1);
    halo.current.scale.setScalar(1.6 * s);
    haloMat.opacity = (0.25 + 0.75 * a) * (opened ? 0.6 : 1);
    core.current.scale.setScalar(0.11 * (0.8 + 0.3 * a) * (1 + b * 1.4));
    group.current.position.y = position.y + Math.sin(t * 0.8 + index) * 0.08;
    motes.mat.uniforms.uAwake.value = a + b;
  });

  return (
    <group ref={group} position={position}>
      <mesh ref={core} material={coreMat}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <sprite ref={halo} material={haloMat} />
      <points geometry={motes.geo} material={motes.mat} frustumCulled={false} />
      {/* generous invisible hit area, so a finger can find it on a phone */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (useWalkStop.getState().stop === SEED_STOPS[index]) openSeed(index);
        }}
        onPointerOver={() => {
          hover.current = useWalkStop.getState().stop === SEED_STOPS[index];
          document.body.style.cursor = hover.current ? 'pointer' : '';
        }}
        onPointerOut={() => {
          hover.current = false;
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[0.9, 12, 8]} />
        {/* raycastable but never drawn */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export function LightSeeds() {
  const texture = useMemo(() => glowTexture(), []);
  useEffect(
    () => () => {
      texture.dispose();
      document.body.style.cursor = '';
    },
    [texture],
  );
  return (
    <>
      {SEED_STOPS.map((_, i) => (
        <Seed key={i} index={i} texture={texture} />
      ))}
    </>
  );
}
