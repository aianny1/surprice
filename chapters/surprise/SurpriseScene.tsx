'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { fx, FX_DEFAULTS, rig } from '@/engine/stage/rig';
import { useSceneReady } from '@/engine/stage/useSceneReady';
import { useExperience } from '@/store/experience';
import { surprise } from '@/data/surprise';

/** Animated by the DOM layer's GSAP timelines, read every frame here. */
export const cake = {
  lid: 0,
  box: 1,
  rise: 0,
  flames: Array.from({ length: surprise.candles }, () => 0),
  confetti: 0,
  smoke: 0,
};
export function resetCake() {
  Object.assign(cake, { lid: 0, box: 1, rise: 0, confetti: 0, smoke: 0 });
  cake.flames.fill(0);
}

const CONFETTI_COLORS = ['#ff8fb1', '#ffd36e', '#8fd3ff', '#b69cff', '#9ef0c0', '#ffffff'];

export default function SurpriseScene() {
  const scene = useThree((s) => s.scene);
  const quality = useExperience((s) => s.quality);
  const lid = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const cakeG = useRef<THREE.Group>(null);
  const flames = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const conf = useRef<THREE.InstancedMesh>(null);
  const smoke = useRef<THREE.Group>(null);
  const N = quality === 'low' ? 160 : quality === 'medium' ? 300 : 500;

  useSceneReady('surprise');

  useLayoutEffect(() => {
    resetCake();
    scene.background = new THREE.Color('#07050a');
    // portrait phones: step back so the cake sits between the message and the button
    const portrait = window.innerWidth < window.innerHeight;
    rig.position.set(0, portrait ? 3.4 : 2.6, portrait ? 12.5 : 7.4);
    rig.target.set(0, portrait ? 1.3 : 1.75, 0);
    rig.fov = 38;
    rig.parallax = 0.2;
    Object.assign(fx, FX_DEFAULTS, { bloom: 1.1, bloomThreshold: 0.55, vignette: 0.8, aberration: 0.0003, grain: 0.05 });
    return () => {
      scene.background = null;
    };
  }, [scene]);

  // confetti seeds
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        x: (Math.random() - 0.5) * 9,
        y: 4 + Math.random() * 6,
        z: (Math.random() - 0.5) * 4,
        s: 0.6 + Math.random() * 0.8,
        r: Math.random() * 6,
        w: 1 + Math.random() * 3,
      })),
    [N],
  );
  useEffect(() => {
    const m = conf.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) m.setColorAt(i, c.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [N]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const candlePos = useMemo(
    () =>
      cake.flames.map((_, i) => {
        const a = (i / cake.flames.length) * Math.PI * 2 + 0.3;
        return [Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42] as [number, number, number];
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lid.current) {
      lid.current.position.set(cake.lid * 4, 1.55 + cake.lid * 3.5, cake.lid * -2);
      lid.current.visible = cake.lid < 0.98;
      lid.current.rotation.set(cake.lid * -0.6, 0, cake.lid * -1.1);
    }
    if (box.current) {
      box.current.scale.setScalar(Math.max(0.001, cake.box));
      box.current.visible = cake.box > 0.01;
    }
    if (cakeG.current) {
      cakeG.current.position.y = -2.6 + cake.rise * 2.6;
      cakeG.current.rotation.y = t * 0.15;
      cakeG.current.visible = cake.rise > 0.01;
    }
    let total = 0;
    flames.current?.children.forEach((f, i) => {
      const v = cake.flames[i];
      total += v;
      const flick = 1 + Math.sin(t * 17 + i * 3) * 0.08 + Math.sin(t * 29 + i) * 0.05;
      f.scale.set(v * 0.06, v * 0.13 * flick, v * 0.06);
      f.visible = v > 0.01;
    });
    if (glow.current) glow.current.intensity = (total / cake.flames.length) * 6 * (1 + Math.sin(t * 13) * 0.05);
    if (smoke.current) smoke.current.visible = cake.smoke > 0.01;

    const m = conf.current;
    if (m) {
      m.visible = cake.confetti > 0;
      if (m.visible) {
        for (let i = 0; i < N; i++) {
          const s = seeds[i];
          const fall = ((t * 0.6 * s.s + s.y) % 10) - 5;
          dummy.position.set(s.x + Math.sin(t * s.w + s.r) * 0.3, 5 - (fall + 5), s.z);
          dummy.rotation.set(t * s.w + s.r, t * s.s * 2, s.r);
          dummy.scale.setScalar(cake.confetti);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
        }
        m.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.18} />
      <spotLight position={[2.5, 6, 4]} angle={0.45} penumbra={0.8} intensity={60} color="#ffe9d6" />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#9b8cff" />
      <Sparkles count={quality === 'low' ? 40 : 90} scale={[10, 6, 6]} size={2.5} speed={0.2} opacity={0.5} color="#ffd8b0" />

      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#120d14" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* gift box */}
      <group ref={box} position={[0, 0.7, 0]}>
        <mesh>
          <boxGeometry args={[1.4, 1.4, 1.4]} />
          <meshStandardMaterial color="#b8324f" roughness={0.45} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.22, 1.42, 1.42]} />
          <meshStandardMaterial color="#f2c46d" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.42, 1.42, 0.22]} />
          <meshStandardMaterial color="#f2c46d" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <group ref={lid}>
        <mesh>
          <boxGeometry args={[1.56, 0.3, 1.56]} />
          <meshStandardMaterial color="#c63c5b" roughness={0.45} />
        </mesh>
        <mesh position-y={0.25}>
          <torusKnotGeometry args={[0.18, 0.06, 64, 8, 2, 3]} />
          <meshStandardMaterial color="#f2c46d" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* cake */}
      <group ref={cakeG} visible={false}>
        <mesh position-y={0.04}>
          <cylinderGeometry args={[1.25, 1.25, 0.08, 64]} />
          <meshStandardMaterial color="#e9e4ef" metalness={0.5} roughness={0.25} />
        </mesh>
        <mesh position-y={0.45}>
          <cylinderGeometry args={[1, 1, 0.75, 64]} />
          <meshStandardMaterial color="#f7d6dc" roughness={0.7} />
        </mesh>
        <mesh position-y={0.82} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1, 0.07, 12, 64]} />
          <meshStandardMaterial color="#fff6f2" roughness={0.5} />
        </mesh>
        <mesh position-y={1.12}>
          <cylinderGeometry args={[0.68, 0.68, 0.6, 64]} />
          <meshStandardMaterial color="#fbe8ea" roughness={0.7} />
        </mesh>
        <mesh position-y={1.42} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.68, 0.05, 12, 64]} />
          <meshStandardMaterial color="#e86a8a" roughness={0.5} />
        </mesh>
        {candlePos.map((p, i) => (
          <mesh key={i} position={[p[0], 1.62, p[2]]}>
            <cylinderGeometry args={[0.035, 0.035, 0.4, 12]} />
            <meshStandardMaterial color={['#8fd3ff', '#ffd36e', '#ff8fb1', '#b69cff', '#9ef0c0'][i % 5]} roughness={0.5} />
          </mesh>
        ))}
        <group ref={flames}>
          {candlePos.map((p, i) => (
            <mesh key={i} position={[p[0], 1.92, p[2]]} visible={false}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#ffb347" toneMapped={false} />
            </mesh>
          ))}
        </group>
        <pointLight ref={glow} position={[0, 2.3, 0]} color="#ffb070" distance={6} intensity={0} />
        <group ref={smoke} visible={false} position-y={2.3}>
          <Sparkles count={60} scale={[1.4, 1.6, 1.4]} size={4} speed={0.6} opacity={0.5} color="#d8d0e8" />
        </group>
      </group>

      <instancedMesh ref={conf} args={[undefined, undefined, N]} visible={false}>
        <planeGeometry args={[0.07, 0.12]} />
        <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </>
  );
}
