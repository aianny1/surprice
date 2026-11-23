'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { ChapterEnvironment, type Former } from '@/engine/stage/ChapterEnvironment';
import * as THREE from 'three';
import { gsap } from '@/animation/gsap';
import { Nebula, Planet, Stars } from './Sky';
import { Portal } from './Portal';
import { Butterflies } from './Butterflies';
import { NameParticles } from './NameParticles';
import { MirrorFloor } from './MirrorFloor';
import { HORIZON, U, WORLD, resetUniforms, universeScene, useUniverseState } from './state';
import { fx, FX_DEFAULTS, rig } from '@/engine/stage/rig';
import { useSceneReady } from '@/engine/stage/useSceneReady';
import { sfx } from '@/engine/audio/AudioManager';
import { useExperience } from '@/store/experience';
import { person } from '@/data/person';
import type { EnterMode } from '@/engine/transition/transitions';

/** Studio panels reflected by the chrome and iridescent glass. */
const UNIVERSE_STUDIO: Former[] = [
  { form: 'ring', intensity: 6, color: '#c9b6ff', position: [0, 2, -6], scale: 3 },
  { form: 'rect', intensity: 3, color: '#f4b6d2', position: [6, 3, 2], scale: [4, 1.5, 1] },
  { form: 'rect', intensity: 2.5, color: '#8a5cff', position: [-6, 4, 2], scale: [5, 1, 1] },
  { form: 'rect', intensity: 2, color: '#ffffff', position: [0, 8, 4], scale: [8, 1, 1] },
  { form: 'rect', intensity: 1.6, color: '#e4daff', position: [0, 1, 8], scale: [10, 2, 1] },
  { form: 'rect', intensity: 1.2, color: '#f4b6d2', position: [-8, -1, -4], scale: [3, 6, 1] },
];

const PINK_RING = { inner: 1.55, outer: 2.7, color: '#f4c6dc' };
const UNIVERSE_FX = { bloom: 1.15, bloomThreshold: 0.55, bloomSmoothing: 0.3, vignette: 0.78, aberration: 0.0008, grain: 0.055 };

function Floor() {
  const quality = useExperience((s) => s.quality);
  if (quality === 'low') {
    return (
      <mesh rotation-x={-Math.PI / 2} position-y={WORLD.floorY}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#07040d" roughness={0.45} metalness={0.7} envMapIntensity={0.25} />
      </mesh>
    );
  }
  return <MirrorFloor resolution={quality === 'high' ? 512 : 256} />;
}

/**
 * Soft luminous haze sitting on the horizon. Drawn after the floor and the sky, before the
 * transparent objects: it hides the seam where the floor's far edge meets the sky.
 */
function HorizonHaze() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: { uReveal: U.reveal, uColor: { value: new THREE.Color('#5a3a8c') } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uReveal; uniform vec3 uColor;
          varying vec2 vUv;
          void main(){
            float y = (vUv.y - 0.5) * 2.0;
            float band = exp(-pow(y / 0.3, 2.0)) * 0.28 + exp(-pow(y / 0.08, 2.0)) * 0.1;
            float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
            gl_FragColor = vec4(uColor * band * edge * uReveal, 1.0);
          }`,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} position={[0, WORLD.floorY, -75]} renderOrder={1}>
      <planeGeometry args={[420, 16]} />
    </mesh>
  );
}

function Floaters() {
  const size = useThree((s) => s.size);
  const spread = THREE.MathUtils.clamp(size.width / size.height / 1.6, 0.62, 1);
  const chrome = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f1eefa', metalness: 1, roughness: 0.05, envMapIntensity: 2.6 }),
    [],
  );
  const glass = useMemo(
    () =>
      // Dark iridescent glass. No transmission pass: that re-rendered the whole scene every frame.
      new THREE.MeshPhysicalMaterial({
        color: '#2b1d4d',
        metalness: 0.3,
        roughness: 0.04,
        ior: 1.6,
        iridescence: 1,
        iridescenceIOR: 1.35,
        iridescenceThicknessMinimum: 180,
        iridescenceThicknessMaximum: 620,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 2.4,
      }),
    [],
  );
  useEffect(
    () => () => {
      chrome.dispose();
      glass.dispose();
    },
    [chrome, glass],
  );
  return (
    <>
      <Float speed={1.1} rotationIntensity={0.4} floatIntensity={0.9}>
        <mesh material={chrome} position={[-4.2 * spread, 1.2, -3.2]}>
          <sphereGeometry args={[0.42, 64, 64]} />
        </mesh>
      </Float>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1.2}>
        <mesh material={chrome} position={[3.9 * spread, 3.1, -4]}>
          <sphereGeometry args={[0.2, 48, 48]} />
        </mesh>
      </Float>
      <Float speed={0.9} rotationIntensity={1.4} floatIntensity={0.8}>
        <mesh material={glass} position={[3.4 * spread, 0.1, -2.6]} rotation={[0.6, 0.4, 0]}>
          <torusGeometry args={[0.5, 0.17, 48, 128]} />
        </mesh>
      </Float>
      <Float speed={1.2} rotationIntensity={1} floatIntensity={1}>
        <mesh material={glass} position={[-3.3 * spread, -0.4, -2.2]}>
          <icosahedronGeometry args={[0.38, 0]} />
        </mesh>
      </Float>
      <Float speed={0.7} rotationIntensity={0.6} floatIntensity={0.6}>
        <mesh material={chrome} position={[4.7 * spread, -1.4, -3]} rotation={[0.3, 0.5, 0]}>
          <torusKnotGeometry args={[0.16, 0.05, 160, 16]} />
        </mesh>
      </Float>
    </>
  );
}

export default function UniverseScene() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const portal = useRef<THREE.Group>(null!);
  const world = useRef<THREE.Group>(null!);

  useSceneReady('universe', 4);

  useLayoutEffect(() => {
    resetUniforms();
    useUniverseState.getState().set(false);
    scene.background = new THREE.Color('#000000');
    scene.fog = new THREE.Fog(HORIZON, 18, 80);
    // start state: inside the light, stars collapsed into a single point
    rig.fov = 30;
    rig.parallax = 0.35;
    rig.position.set(0, 0.7, 3.6);
    rig.target.set(0, 0.5, 0);
    Object.assign(fx, FX_DEFAULTS, { bloom: 2.6, bloomThreshold: 0.2 });
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  useFrame((state) => {
    U.time.value = state.clock.elapsedTime;
    U.pixelRatio.value = gl.getPixelRatio();
    if (world.current) world.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.02) * 0.02;
  });

  useEffect(() => {
    const reduced = () => useExperience.getState().reducedMotion;

    const arrive = (mode: EnterMode) => {
      const tl = gsap.timeline();
      const r = reduced();
      const fast = mode === 'rewind' || r;
      const { cam, camTarget } = WORLD;
      if (mode !== 'light') {
        // cold / rewind: start slightly further in, stars already mostly out
        U.burst.value = fast ? 0.25 : 0.7;
        Object.assign(fx, UNIVERSE_FX, { bloom: 1.8 });
      }
      tl.call(() => sfx.play('shimmer'), [], 0.1);
      tl.to(U.burst, { value: 0, duration: fast ? 1.6 : 3.4, ease: 'expo.out' }, 0);
      tl.to(U.reveal, { value: 1, duration: fast ? 1.4 : 3.2, ease: 'power2.inOut' }, fast ? 0 : 0.5);
      tl.to(fx, { ...UNIVERSE_FX, duration: 2.8, ease: 'power2.out' }, 0.2);
      if (!r) {
        tl.to(rig.position, { ...cam, duration: fast ? 2.2 : 4.8, ease: 'cinema' }, 0);
        tl.to(rig.target, { ...camTarget, duration: fast ? 2.2 : 4.6, ease: 'cinema' }, 0);
        tl.to(rig, { fov: WORLD.fov, duration: fast ? 2 : 4.6, ease: 'cinema' }, 0);
      } else {
        rig.position.set(cam.x, cam.y, cam.z);
        rig.target.set(camTarget.x, camTarget.y, camTarget.z);
        rig.fov = WORLD.fov;
      }
      const t0 = fast ? 0.6 : 2.2;
      tl.to(U.portalOpen, { value: 1, duration: 2.4, ease: 'power2.inOut' }, t0);
      tl.to(U.butterflies, { value: 1, duration: 2.5, ease: 'power1.inOut' }, t0 + 0.4);
      tl.to(U.name, { value: 1, duration: fast ? 1.6 : 3.4, ease: 'power2.inOut' }, fast ? 0.8 : 2.6);
      tl.call(() => useUniverseState.getState().set(true), [], t0 + 2);
      return tl;
    };

    const diveIntoPortal = () => {
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
      const p = WORLD.portal;
      tl.call(() => sfx.play('portal'), [], 0);
      tl.to(U.portalSpin, { value: 4, duration: 2.4, ease: 'power2.in' }, 0);
      tl.to(rig.position, { x: p.x, y: p.y, z: p.z + 2.2, duration: 2.6, ease: 'power3.in' }, 0);
      tl.to(rig.target, { x: p.x, y: p.y, z: p.z, duration: 1.6, ease: 'power2.inOut' }, 0);
      tl.to(rig, { fov: 50, duration: 2.6, ease: 'power3.in' }, 0.2);
      tl.to(portal.current.scale, { x: 2.4, y: 2.4, z: 1, duration: 2.6, ease: 'power3.in' }, 0.3);
      tl.to(U.portalFill, { value: 1, duration: 1.6, ease: 'power2.in' }, 1.2);
      tl.to(fx, { bloom: 2.4, bloomThreshold: 0.25, aberration: 0.004, duration: 2.4, ease: 'power2.in' }, 0.2);
      return tl;
    };

    universeScene.api = { arrive, diveIntoPortal };
    return () => {
      universeScene.api = null;
    };
  }, []);

  return (
    <group ref={world}>
      <Nebula />
      <Stars />
      <Planet position={[-19, 10, -44]} radius={5.2} colorA="#2a0f55" colorB="#8a62d8" atmosphere="#b99cff" bands={5} tilt={0.4} />
      <Planet
        position={[13, 3.8, -24]}
        radius={1.3}
        colorA="#7a3a6a"
        colorB="#f4b6d2"
        atmosphere="#ffc6e0"
        bands={9}
        ring={PINK_RING}
        tilt={-0.35}
      />
      <Planet position={[21, 12.5, -52]} radius={1.1} colorA="#55586a" colorB="#d7dae6" atmosphere="#e4daff" bands={3} tilt={0.1} />

      <ambientLight intensity={0.15} color="#8f7bd9" />
      <directionalLight position={[-6, 8, 6]} intensity={0.6} color="#d9ccff" />
      <ChapterEnvironment formers={UNIVERSE_STUDIO} intensity={0.55} resolution={256} />

      <Floor />
      <HorizonHaze />
      <Portal ref={portal} />
      <Butterflies />
      <Floaters />
      <NameParticles text={person.name.display} />
      <Sparkles count={120} scale={[24, 8, 18]} position={[0, 1, -4]} size={2.2} speed={0.25} opacity={0.6} color="#e4daff" />
    </group>
  );
}
