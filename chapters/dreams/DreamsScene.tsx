'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { AmbientScene } from '@/engine/stage/AmbientScene';
import { useExperience } from '@/store/experience';
import { lanterns } from './lanterns';

const WISH_SLOTS = 8;

/**
 * Night sky over dark hills with sky lanterns drifting up. Background lanterns are one instanced
 * mesh; each wish adds a bigger lantern that rises from the bottom of the frame.
 */
export default function DreamsScene() {
  const quality = useExperience((s) => s.quality);
  const N = quality === 'low' ? 24 : quality === 'medium' ? 40 : 60;
  const bg = useRef<THREE.InstancedMesh>(null);
  const wish = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        x: (Math.random() - 0.5) * 26,
        z: -4 - Math.random() * 16,
        s: 0.35 + Math.random() * 0.5,
        v: 0.12 + Math.random() * 0.22,
        o: Math.random() * 20,
        w: Math.random() * 6,
      })),
    [N],
  );
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb766', toneMapped: false, transparent: true, opacity: 0.92 }), []);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.17, 0.42, 10, 1, true), []);
  const hills = useMemo(() => new THREE.MeshBasicMaterial({ color: '#05060f' }), []);
  useEffect(
    () => () => {
      mat.dispose();
      geo.dispose();
      hills.dispose();
    },
    [mat, geo, hills],
  );
  useLayoutEffect(() => lanterns.reset(), []);

  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lanterns.now = t;
    const m = bg.current;
    if (m) {
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const y = ((s.o + t * s.v) % 20) - 6;
        d.position.set(s.x + Math.sin(t * 0.3 + s.w) * 0.4, y, s.z);
        d.rotation.set(0, t * 0.2 + s.w, Math.sin(t + s.w) * 0.05);
        d.scale.setScalar(s.s);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    const w = wish.current;
    if (w) {
      const rel = lanterns.released.slice(-WISH_SLOTS);
      for (let i = 0; i < WISH_SLOTS; i++) {
        const t0 = rel[i];
        if (t0 === undefined) {
          d.scale.setScalar(0.0001);
        } else {
          const a = t - t0;
          d.position.set((i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.7), -4 + a * 0.5, -1 - (i % 4) * 0.6);
          d.rotation.set(0, a * 0.4, Math.sin(a * 1.3) * 0.06);
          d.scale.setScalar(Math.min(1, a * 1.5) * 0.85);
        }
        d.updateMatrix();
        w.setMatrixAt(i, d.matrix);
      }
      w.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <AmbientScene id="dimension" bg="#0a0d22" dust="#ffcf8a" keyColor="#ffcf9a" fill="#5a6cff" camZ={9}>
      <Stars radius={50} depth={20} count={quality === 'low' ? 1200 : 2500} factor={2.2} fade speed={0.2} />
      <instancedMesh ref={bg} args={[geo, mat, N]} />
      <instancedMesh ref={wish} args={[geo, mat, WISH_SLOTS]} />
      <pointLight position={[0, -1, 3]} color="#ffb060" intensity={4} distance={10} />
      {/* layered hills */}
      <mesh material={hills} position={[-5, -5.6, -2]} scale={[9, 3, 1]}>
        <circleGeometry args={[1, 48]} />
      </mesh>
      <mesh material={hills} position={[6, -5.9, -1]} scale={[10, 3.2, 1]}>
        <circleGeometry args={[1, 48]} />
      </mesh>
    </AmbientScene>
  );
}
