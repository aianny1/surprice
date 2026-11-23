'use client';

import { Float } from '@react-three/drei';
import { AmbientScene } from '@/engine/stage/AmbientScene';

const SHAPES: { p: [number, number, number]; c: string; k: 'knot' | 'ico' | 'torus' | 'sphere'; s: number }[] = [
  { p: [-5.2, 2.2, -3], c: '#f2a7b8', k: 'knot', s: 0.6 },
  { p: [5.4, -2.0, -2], c: '#9fc4ff', k: 'ico', s: 0.8 },
  { p: [4.6, 2.6, -4], c: '#ffd29a', k: 'torus', s: 0.6 },
  { p: [-4.8, -2.6, -2.5], c: '#c8a6ff', k: 'sphere', s: 0.55 },
];

/** Soft studio with a few glossy "sculpts" drifting at the edges of the frame. */
export default function ArtistScene() {
  return (
    <AmbientScene id="artist" bg="#140c14" dust="#ffcfb0" keyColor="#ffe6d0" fill="#b18cff">
      {SHAPES.map((x, i) => (
        <Float key={i} speed={1.2} rotationIntensity={1.2} floatIntensity={1.4}>
          <mesh position={x.p} scale={x.s}>
            {x.k === 'knot' && <torusKnotGeometry args={[1, 0.32, 128, 16]} />}
            {x.k === 'ico' && <icosahedronGeometry args={[1, 0]} />}
            {x.k === 'torus' && <torusGeometry args={[1, 0.35, 32, 64]} />}
            {x.k === 'sphere' && <sphereGeometry args={[1, 48, 24]} />}
            <meshPhysicalMaterial color={x.c} roughness={0.22} metalness={0.1} clearcoat={1} clearcoatRoughness={0.15} />
          </mesh>
        </Float>
      ))}
    </AmbientScene>
  );
}
