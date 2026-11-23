'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { AdaptiveQuality } from './AdaptiveQuality';
import { CameraRig } from './CameraRig';
import { PostFX } from './PostFX';
import { SceneOut } from './tunnel';
import { useExperience, type Quality } from '@/store/experience';
import { setStaticMode } from '@/engine/transition/manager';

/** True when this browser can't give us a WebGL context (or ?nogl=1 forces the 2D path). */
function hasWebGL() {
  try {
    if (new URLSearchParams(location.search).has('nogl')) return false;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const DPR: Record<Quality, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [1, 1],
};

/**
 * The single persistent WebGL canvas (PAGE_ARCHITECTURE.md §3).
 * Lives in the root layout, so it survives every route change.
 */
export default function Stage() {
  const quality = useExperience((s) => s.quality);
  const [hidden, setHidden] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => {
    const ok = hasWebGL();
    setStaticMode(!ok);
    setGl(ok);
  }, []);

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (gl === null) return null;
  if (!gl)
    return (
      <div
        className="fixed inset-0 z-10"
        aria-hidden="true"
        data-stage="static"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #3a2440 0%, #140c18 55%, #05040a 100%)' }}
      />
    );

  return (
    <div className="fixed inset-0 z-10" aria-hidden="true" data-stage data-quality={quality}>
      <Canvas
        dpr={DPR[quality]}
        frameloop={hidden ? 'never' : 'always'}
        gl={{
          // Native MSAA for the no-composer (low) path; the composer has its own AA on other tiers.
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          preserveDrawingBuffer: false,
        }}
        camera={{ fov: 35, near: 0.1, far: 500, position: [0, 0, 8] }}
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <CameraRig />
        <Suspense fallback={null}>
          <SceneOut />
        </Suspense>
        <AdaptiveQuality />
        {quality !== 'low' && <PostFX quality={quality} />}
      </Canvas>
    </div>
  );
}
