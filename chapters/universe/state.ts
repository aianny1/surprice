'use client';

import { create } from 'zustand';
import type { gsap } from '@/animation/gsap';
import type { EnterMode } from '@/engine/transition/transitions';

/**
 * Shared uniforms for every universe material. GSAP tweens `.value` directly;
 * shaders read them, so one tween drives many objects in sync.
 */
export const U = {
  time: { value: 0 },
  /** 1 = all stars collapsed into a single point of light (arrival from T1), 0 = full sky. */
  burst: { value: 1 },
  /** Nebula, planets fade-in. */
  reveal: { value: 0 },
  portalOpen: { value: 0 },
  portalSpin: { value: 0 },
  /** 0 = violet swirl inside the portal, 1 = filled with the next world's light. */
  portalFill: { value: 0 },
  name: { value: 0 },
  butterflies: { value: 0 },
  pixelRatio: { value: 1 },
};

export function resetUniforms() {
  U.burst.value = 1;
  U.reveal.value = 0;
  U.portalOpen.value = 0;
  U.portalSpin.value = 0;
  U.portalFill.value = 0;
  U.name.value = 0;
  U.butterflies.value = 0;
}


/** Colour the fog, the nebula's horizon and the floor all fade into, so there is no hard horizon line. */
export const HORIZON = '#1a0b2c';

/** World layout of the universe. */
export const WORLD = {
  floorY: -2.1,
  portal: { x: 0, y: 0.15, z: -6, radius: 1.75 },
  nameZ: -1,
  cam: { x: 0, y: 1.2, z: 10 },
  camTarget: { x: 0, y: 1.05, z: -6 },
  fov: 35,
} as const;

export interface UniverseSceneApi {
  arrive(mode: EnterMode): gsap.core.Timeline;
  diveIntoPortal(): gsap.core.Timeline;
}

export const universeScene: { api: UniverseSceneApi | null } = { api: null };

export const useUniverseState = create<{ portalReady: boolean; set(v: boolean): void }>((set) => ({
  portalReady: false,
  set: (portalReady) => set({ portalReady }),
}));
