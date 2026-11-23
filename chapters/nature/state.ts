'use client';

import { create } from 'zustand';
import * as THREE from 'three';
import type { gsap } from '@/animation/gsap';
import type { EnterMode } from '@/engine/transition/transitions';
import { STOPS } from './world';

/** Imperative API the Nature 3D scene exposes to its DOM layer. */
export interface NatureSceneApi {
  arrive(mode: EnterMode): gsap.core.Timeline;
  /** T3: the butterfly flies at the lens and its wings become the sky. */
  followButterfly(): gsap.core.Timeline;
}

export const natureScene: { api: NatureSceneApi | null } = { api: null };

/**
 * Walk state, read and written every frame (no React re-renders).
 *  - target:   where input wants to go (scroll / swipe / Continue)
 *  - progress: where the camera actually is (eased toward target)
 *  - arrive:   1 → 0 during the chapter entrance (camera floats in from further back)
 */
/** haze: 1 → 0 extra morning mist when arriving out of the portal light. */
export const walk = { progress: 0, target: 0, arrive: 1, lastInput: 0, dir: 0, haze: 0 };

export function resetWalk() {
  walk.progress = 0;
  walk.target = 0;
  walk.arrive = 1;
  walk.lastInput = 0;
  walk.dir = 0;
  walk.haze = 0;
}

/**
 * Where the walk comes to rest after input pauses: the nearest stop if she barely moved,
 * otherwise the next stop in the direction she was going (no rubber-banding backwards).
 */
export function settleStop(target: number, dir: number) {
  const near = STOPS[nearestStop(target)];
  if (Math.abs(target - near) < 0.05 || dir === 0) return near;
  if (dir > 0) return STOPS.find((s) => s >= target) ?? STOPS[STOPS.length - 1];
  return [...STOPS].reverse().find((s) => s <= target) ?? STOPS[0];
}

/** Nearest stop index; only this crosses into React (it changes 4 times per walk). */
export const useWalkStop = create<{ stop: number; set(s: number): void }>((set) => ({
  stop: 0,
  set: (stop) => set({ stop }),
}));

export function nearestStop(p: number) {
  let best = 0;
  for (let i = 1; i < STOPS.length; i++) if (Math.abs(STOPS[i] - p) < Math.abs(STOPS[best] - p)) best = i;
  return best;
}

/**
 * One wind field for everything that moves in the forest (trees, grass, later flowers).
 *  uGust = (x, z, strength, radius): a soft local push where her pointer / finger moves.
 */
export const wind = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uGust: { value: new THREE.Vector4(0, 0, 0, 5) },
};

/** Layer for things the pool's reflection camera skips (grass, pollen, light shafts). */
export const REFLECTION_EXCLUDED = 1;

/** The three light-seeds: stop 1 forest, stop 2 water, stop 3 summit. */
export const SEED_STOPS = [1, 2, 3] as const;

export const useSeeds = create<{
  opened: boolean[];
  /** index of the seed whose message card is showing, or null */
  showing: number | null;
  open(i: number): void;
  close(): void;
  reset(): void;
}>((set) => ({
  opened: [false, false, false],
  showing: null,
  open: (i) => set((s) => ({ showing: i, opened: s.opened.map((o, k) => o || k === i) })),
  close: () => set({ showing: null }),
  reset: () => set({ opened: [false, false, false], showing: null }),
}));

/** Seed index for the current stop, or -1 (dawn has no seed). */
export const seedForStop = (stop: number) => SEED_STOPS.indexOf(stop as 1 | 2 | 3);
