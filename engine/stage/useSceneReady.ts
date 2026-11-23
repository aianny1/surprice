'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ChapterId } from '@/engine/chapters';
import { markReady, markUnready } from '@/engine/transition/manager';

/**
 * Pre-compiles the chapter's shaders, waits for a few rendered frames, then tells the
 * transition engine the chapter is ready to be revealed. Prevents first-frame hitches
 * mid-transition.
 */
export function useSceneReady(id: ChapterId, frames = 3) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const compiled = useRef(false);
  const count = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const compile = async () => {
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        /* compilation will happen on first render instead */
      }
      if (!cancelled) compiled.current = true;
    };
    void compile();
    return () => {
      cancelled = true;
      done.current = false;
      count.current = 0;
      markUnready(id);
    };
  }, [gl, scene, camera, id]);

  useFrame(() => {
    if (done.current || !compiled.current) return;
    if (++count.current >= frames) {
      done.current = true;
      markReady(id);
    }
  });
}
