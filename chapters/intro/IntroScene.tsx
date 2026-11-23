'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { ChapterEnvironment, type Former } from '@/engine/stage/ChapterEnvironment';
import * as THREE from 'three';
import { gsap } from '@/animation/gsap';
import { Envelope, type EnvelopeRefs } from './Envelope';
import { ENV, LETTER, introScene, useIntroState } from './state';
import { fitDistance, fx, FX_DEFAULTS, pointer, rig, visibleHeight } from '@/engine/stage/rig';
import { useSceneReady } from '@/engine/stage/useSceneReady';
import { sfx } from '@/engine/audio/AudioManager';
import { useExperience } from '@/store/experience';
import type { EnterMode } from '@/engine/transition/transitions';

const FOV = 35;

/** Procedural studio reflections (no HDRI download): give the wax seal and paper sheen life. */
const INTRO_STUDIO: Former[] = [
  { form: 'rect', intensity: 3, color: '#c9b6ff', position: [-4, 3, 3], scale: [5, 1.2, 1] },
  { form: 'rect', intensity: 2, color: '#f4b6d2', position: [4, -1, 2], scale: [3, 0.6, 1] },
  { form: 'ring', intensity: 4, color: '#ffffff', position: [0, 4, 5], scale: 1.4 },
];

/** Volumetric-looking light shaft from above. */
function LightShaft() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#b9a2ff') } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV; varying float vY;
          void main(){
            vec4 wp = modelMatrix * vec4(position,1.0);
            vN = normalize(mat3(modelMatrix) * normal);
            vV = normalize(cameraPosition - wp.xyz);
            vY = uv.y;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity; uniform float uTime; uniform vec3 uColor;
          varying vec3 vN; varying vec3 vV; varying float vY;
          void main(){
            float facing = pow(abs(dot(normalize(vN), normalize(vV))), 3.2);
            float fade = smoothstep(0.0, 0.55, vY) * smoothstep(1.0, 0.75, vY);
            float flicker = 0.9 + 0.1 * sin(uTime * 0.7 + vY * 6.0);
            gl_FragColor = vec4(uColor * facing * fade * flicker * uOpacity, 1.0);
          }`,
      }),
    [],
  );
  useFrame((s) => (mat.uniforms.uTime.value = s.clock.elapsedTime));
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[-0.6, 3.2, -0.6]} rotation={[0, 0, 0.12]} material={mat} name="shaft">
      <cylinderGeometry args={[0.08, 2.9, 8.5, 64, 1, true]} />
    </mesh>
  );
}

export default function IntroScene() {
  const env = useRef<EnvelopeRefs>(null!);
  const float = useRef<THREE.Group>(null!);
  const key = useRef<THREE.SpotLight>(null!);
  const rim = useRef<THREE.SpotLight>(null!);
  const cursorLight = useRef<THREE.PointLight>(null!);
  const shaft = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);

  // Drivers tweened by GSAP and composed in useFrame (never fight over the same property).
  const drive = useRef({ tilt: 1, hover: 0, bob: 1, lights: 0, shaft: 0 });
  const hovering = useRef(false);

  useSceneReady('intro');

  const layout = () => {
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    // fill ~80% of a phone's width / 42% of a desktop's width, while never exceeding a height share
    const distW = fitDistance(ENV.W, 0.001, FOV, aspect, portrait ? 0.8 : 0.42);
    const distH = fitDistance(0.001, ENV.H, FOV, aspect, portrait ? 0.4 : 0.36);
    const d = Math.max(distW, distH);
    // envelope sits a little below centre to leave room for the headline
    const vh = visibleHeight(d, FOV);
    return { d, targetY: vh * (portrait ? 0.03 : 0.06), aspect };
  };

  useLayoutEffect(() => {
    scene.background = new THREE.Color('#000000');
    scene.fog = null;
    useIntroState.getState().setStage('closed');
    Object.assign(fx, FX_DEFAULTS, { bloom: 0.75, bloomThreshold: 0.7, vignette: 0.8 });
    const { d, targetY } = layout();
    rig.fov = FOV;
    rig.parallax = 0.18;
    rig.position.set(0, targetY + 0.15, d + 2.2);
    rig.target.set(0, targetY, 0);
    return () => {
      scene.background = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-frame when the viewport changes while idle.
  useEffect(() => {
    if (useExperience.getState().phase !== 'idle' || useIntroState.getState().stage !== 'closed') return;
    const { d, targetY } = layout();
    gsap.to(rig.position, { y: targetY, z: d, duration: 0.8, ease: 'power2.out' });
    gsap.to(rig.target, { y: targetY, duration: 0.8, ease: 'power2.out' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = drive.current;
    const k = 1 - Math.pow(0.0005, Math.min(dt, 0.1));
    d.hover += ((hovering.current ? 1 : 0) - d.hover) * k * 0.5;

    const g = float.current;
    if (g) {
      g.position.y = Math.sin(t * 0.8) * 0.06 * d.bob;
      const rx = (-pointer.y * 0.16 - 0.06) * d.tilt + Math.sin(t * 0.5) * 0.015 * d.bob;
      const ry = (pointer.x * 0.26 + 0.05) * d.tilt + Math.sin(t * 0.37) * 0.02 * d.bob;
      g.rotation.x += (rx - g.rotation.x) * k * 0.35;
      g.rotation.y += (ry - g.rotation.y) * k * 0.35;
      const sc = 1 + d.hover * 0.025;
      g.scale.setScalar(sc);
    }
    // the cursor carries a soft light across the paper and the wax seal
    if (cursorLight.current) {
      cursorLight.current.position.set(pointer.x * 3.2, pointer.y * 2.2 + rig.target.y, 2.4);
      cursorLight.current.intensity = (4 + d.hover * 4) * d.lights;
    }
    if (key.current) key.current.intensity = 70 * d.lights;
    if (rim.current) rim.current.intensity = 90 * Math.min(1, d.lights * 1.6);
    if (shaft.current) {
      const portraitDim = size.width < size.height ? 0.6 : 1;
      (shaft.current.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.16 * d.shaft * portraitDim;
    }
  });

  // ------------------------------------------------------------------ choreography
  useEffect(() => {
    const reduced = () => useExperience.getState().reducedMotion;

    const arrive = (mode: EnterMode) => {
      const tl = gsap.timeline();
      const { d, targetY } = layout();
      const dr = drive.current;
      // rim light first (edge reveal), then the key light
      tl.fromTo(dr, { lights: 0 }, { lights: 1, duration: mode === 'cold' ? 3.2 : 2, ease: 'power2.inOut' }, 0);
      tl.fromTo(dr, { shaft: 0 }, { shaft: 1, duration: 3, ease: 'power1.inOut' }, 0.6);
      if (!reduced()) {
        tl.fromTo(
          rig.position,
          { y: targetY + 0.15, z: d + 2.2 },
          { y: targetY, z: d, duration: 3.6, ease: 'cinema' },
          0,
        );
        tl.from(float.current.position, { z: -1.5, duration: 3.4, ease: 'cinema' }, 0);
      } else {
        rig.position.set(0, targetY, d);
      }
      return tl;
    };

    const open = () => {
      const e = env.current;
      const dr = drive.current;
      const r = reduced();
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
      useIntroState.getState().setStage('opening');
      const aspect = size.width / size.height;
      const unfoldedH = LETTER.PANEL * 3;
      const letterZ = 0.9;
      const dLetter = fitDistance(LETTER.W, unfoldedH, FOV, aspect, aspect < 1 ? 0.62 : 0.74);
      const letterCenterY = 0.28;
      // letter's centre sits slightly above screen centre, leaving room for the CTA
      const camTargetY = letterCenterY - visibleHeight(dLetter, FOV) * 0.05;

      // 1 — the seal cracks
      tl.call(() => sfx.play('crack'), [], 0);
      tl.to(dr, { tilt: 0.35, duration: 1.2 }, 0);
      if (!r) tl.to(rig, { shake: 0.02, duration: 0.06, yoyo: true, repeat: 3, ease: 'none' }, 0.02);
      tl.to(e.sealR.position, { x: 0.32, y: -0.12, z: -0.55, duration: 0.9, ease: 'power2.in' }, 0.05);
      tl.to(e.sealL.position, { x: -0.3, y: -0.08, z: -0.6, duration: 0.95, ease: 'power2.in' }, 0.05);
      tl.to(e.sealR.rotation, { z: -0.9, x: 0.6, duration: 0.9, ease: 'power2.in' }, 0.05);
      tl.to(e.sealL.rotation, { z: 0.8, x: -0.5, duration: 0.95, ease: 'power2.in' }, 0.05);
      tl.to(e.sealMats, { opacity: 0, duration: 0.45 }, 0.55);

      // 2 — the flap swings open (through the camera side, coming to rest tilted back)
      tl.call(() => sfx.play('paper'), [], 0.35);
      tl.to(e.flapHinge.rotation, { x: -Math.PI * 1.1, duration: r ? 0.6 : 1.25, ease: 'paper' }, 0.35);
      // light leaks from inside the envelope
      tl.to(e.innerLight, { intensity: 2.2, duration: 1.4, ease: 'power2.out' }, 0.6);
      tl.to(e.glowMat, { opacity: 0.55, duration: 1.4 }, 0.7);

      // 3 — the letter slides out, glowing
      tl.to(e.letter.position, { y: '+=1.95', duration: r ? 0.8 : 1.35, ease: 'power2.inOut' }, 1.25);
      tl.call(() => sfx.play('paper'), [], 1.3);
      tl.to(e.letterFront, { emissiveIntensity: 0.06, duration: 1.2 }, 1.4);

      // 4 — envelope falls away into the dark, letter comes forward and centres
      tl.to(e.body.position, { y: -5.5, z: -3.5, duration: 1.9, ease: 'power3.in' }, 2.35);
      tl.set(e.body, { visible: false }, 4.3);
      tl.to(e.body.rotation, { x: 0.55, z: -0.12, duration: 1.8, ease: 'power3.inOut' }, 2.35);
      tl.to(e.innerLight, { intensity: 0, duration: 1 }, 2.6);
      tl.to(e.letter.position, { y: letterCenterY, z: letterZ, duration: 1.6, ease: 'cinema' }, 2.4);
      tl.to(dr, { bob: 0.4, duration: 1.6 }, 2.4);

      // 5 — tri-fold opens: top panel, then bottom
      tl.call(() => sfx.play('paper'), [], 3.3);
      tl.to(e.letterTop.rotation, { x: 0, duration: r ? 0.5 : 1.05, ease: 'paper' }, 3.25);
      tl.to(e.letterTop.position, { z: 0, duration: 1.0 }, 3.3);
      tl.call(() => sfx.play('paper'), [], 3.85);
      tl.to(e.letterBottom.rotation, { x: 0, duration: r ? 0.5 : 1.05, ease: 'paper' }, 3.8);
      tl.to(e.letterBottom.position, { z: 0, duration: 1.0 }, 3.85);
      tl.to(e.glow.scale, { x: LETTER.W * 2.2, y: unfoldedH * 1.45, duration: 1.4 }, 3.4);
      tl.to(e.glow.position, { y: 0, duration: 1.4 }, 3.4);
      tl.to(e.glowMat, { opacity: 0.35, duration: 1.4 }, 3.6);

      // 6 — camera frames the open letter, then keeps creeping closer while she reads
      tl.to(rig.position, { x: 0, y: camTargetY, z: letterZ + dLetter, duration: 2.4, ease: 'cinema' }, 2.6);
      tl.to(rig.target, { x: 0, y: camTargetY, z: letterZ, duration: 2.4, ease: 'cinema' }, 2.6);
      tl.to(dr, { shaft: 0.35, duration: 2 }, 2.6);
      tl.to(fx, { bloom: 0.9, bloomThreshold: 0.62, duration: 2 }, 3);
      tl.call(() => useIntroState.getState().setStage('open'), [], 4.6);
      tl.to(rig.position, { z: letterZ + dLetter * 0.94, duration: 9, ease: 'sine.inOut' }, 5);
      return tl;
    };

    const intoLight = () => {
      const e = env.current;
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
      const c = new THREE.Vector3();
      e.letter.getWorldPosition(c);
      tl.to(rig.position, { x: c.x, y: c.y, z: c.z + 0.45, duration: 2.1, ease: 'power3.in' }, 0);
      tl.to(rig.target, { x: c.x, y: c.y, z: c.z, duration: 1.2, ease: 'power2.inOut' }, 0);
      tl.to(rig, { fov: 24, duration: 2.1, ease: 'power2.in' }, 0);
      tl.to(e.letterFront, { emissiveIntensity: 2.6, duration: 1.9, ease: 'power2.in' }, 0.1);
      tl.to(e.glowMat, { opacity: 1, duration: 1.4 }, 0);
      tl.to(e.glow.scale, { x: '*=3', y: '*=3', duration: 2, ease: 'power2.in' }, 0);
      tl.to(fx, { bloom: 3.2, bloomThreshold: 0.15, aberration: 0.003, duration: 2, ease: 'power2.in' }, 0);
      tl.to(drive.current, { shaft: 1.4, duration: 1.5 }, 0);
      return tl;
    };

    introScene.api = { arrive, open, intoLight };
    return () => {
      introScene.api = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  return (
    <>
      <ambientLight intensity={0.06} color="#b9a6ff" />
      <spotLight
        ref={key}
        position={[-3.6, 5.2, 5.4]}
        angle={0.42}
        penumbra={1}
        intensity={0}
        distance={22}
        decay={2}
        color="#ddd2ff"
      />
      <spotLight
        ref={rim}
        position={[2.8, 3.4, -4.2]}
        angle={0.6}
        penumbra={1}
        intensity={0}
        distance={16}
        decay={2}
        color="#b49cff"
      />
      <pointLight ref={cursorLight} position={[0, 0, 2.4]} intensity={0} distance={9} decay={2} color="#f6eeff" />

      <ChapterEnvironment formers={INTRO_STUDIO} intensity={0.32} resolution={128} />

      <group ref={(g) => { if (g) shaft.current = g.getObjectByName('shaft') as THREE.Mesh; }}>
        <LightShaft />
      </group>
      <Sparkles count={70} scale={[7, 5, 4]} size={1.8} speed={0.22} opacity={0.55} color="#c9b6ff" noise={0.6} />

      <group ref={float}>
        <Envelope
          ref={env}
          onHover={(h) => {
            hovering.current = h && useIntroState.getState().stage === 'closed';
            document.body.style.cursor = hovering.current ? 'pointer' : '';
          }}
          onActivate={() => {
            if (useIntroState.getState().stage === 'closed' && useExperience.getState().phase === 'idle') {
              window.dispatchEvent(new CustomEvent('intro:open'));
            }
          }}
        />
      </group>
    </>
  );
}
