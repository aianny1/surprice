'use client';

import { type ReactNode, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { fx, FX_DEFAULTS, rig } from './rig';
import { useSceneReady } from './useSceneReady';
import type { ChapterId } from '@/engine/chapters';
import { useExperience } from '@/store/experience';

/**
 * Light shared scene setup for DOM-led chapters: background colour, camera, post FX,
 * a field of soft glowing dust, and simple key/fill lights. Chapters add their own meshes as children.
 */
export function AmbientScene({
  id,
  bg,
  dust = '#ffd9b8',
  keyColor = "#ffffff",
  fill = '#8fa8ff',
  camZ = 8,
  children,
}: {
  id: ChapterId;
  bg: string;
  dust?: string;
  keyColor?: string;
  fill?: string;
  camZ?: number;
  children?: ReactNode;
}) {
  const scene = useThree((s) => s.scene);
  const quality = useExperience((s) => s.quality);
  useSceneReady(id);

  useLayoutEffect(() => {
    scene.background = new THREE.Color(bg);
    rig.position.set(0, 0, camZ);
    rig.target.set(0, 0, 0);
    rig.fov = 40;
    rig.parallax = 0.35;
    rig.roll = 0;
    Object.assign(fx, FX_DEFAULTS, { bloom: 0.9, bloomThreshold: 0.6, vignette: 0.7, aberration: 0.0004, grain: 0.05 });
    return () => {
      scene.background = null;
    };
  }, [scene, bg, camZ]);

  const n = quality === 'low' ? 60 : quality === 'medium' ? 120 : 200;
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 6]} intensity={2.2} color={keyColor} />
      <directionalLight position={[-6, -2, -3]} intensity={1.2} color={fill} />
      <Sparkles count={n} scale={[16, 9, 8]} size={3} speed={0.25} opacity={0.6} color={dust} />
      {children}
    </>
  );
}
