'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { AmbientScene } from '@/engine/stage/AmbientScene';
import { FRAMES, REEL_PHOTOS, reel } from './reel';

const R = 6.4;

/** Film stock with sprocket holes, drawn once (one texture instead of a mesh per hole). */
function stripTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 208;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0c10';
  g.fillRect(0, 0, 256, 208);
  g.fillStyle = '#3a3440';
  for (const y of [6, 190]) for (let x = 10; x < 256; x += 41) g.fillRect(x, y, 18, 12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A film strip looping around the editing suite. Each frame carries a photograph; scrolling
 * turns the reel so the frames pass in front of the camera one by one.
 */
export default function FilmScene() {
  const ring = useRef<THREE.Group>(null);
  const textures = useLoader(THREE.TextureLoader, REEL_PHOTOS.map((p) => p.src));
  const { strip, frames } = useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    });
    return {
      strip: new THREE.MeshStandardMaterial({ map: stripTexture(), roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }),
      frames: textures.map((t) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide, color: '#e9e2d8' })),
    };
  }, [textures]);
  useEffect(
    () => () => {
      strip.map?.dispose();
      strip.dispose();
      frames.forEach((m) => m.dispose());
    },
    [strip, frames],
  );

  useLayoutEffect(() => {
    reel.target = 0;
    reel.angle = 0;
  }, []);

  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.002, Math.min(dt, 0.1));
    reel.angle += (reel.target - reel.angle) * k;
    // a slow idle drift so the reel never looks frozen
    if (ring.current) ring.current.rotation.y = -reel.angle + performance.now() * 0.00002;
  });

  return (
    <AmbientScene id="film" bg="#08070b" dust="#ffb98a" keyColor="#ffd7b0" fill="#6c7cff" camZ={9}>
      <group ref={ring} position={[0, 0.9, -3.6]} rotation-x={0.1}>
        {Array.from({ length: FRAMES }, (_, i) => {
          const a = (i / FRAMES) * Math.PI * 2;
          return (
            <group key={i} position={[Math.sin(a) * R, Math.sin(a * 2) * 0.15, Math.cos(a) * R]} rotation={[0, a, 0]}>
              <mesh material={strip}>
                <planeGeometry args={[2.1, 1.7]} />
              </mesh>
              <mesh material={frames[i % frames.length]} position={[0, 0, 0.01]}>
                <planeGeometry args={[1.86, 1.24]} />
              </mesh>
            </group>
          );
        })}
      </group>
    </AmbientScene>
  );
}
