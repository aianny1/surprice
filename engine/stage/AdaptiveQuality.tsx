'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { qualityLocked, useExperience, type Quality } from '@/store/experience';

const LOWER: Record<Quality, Quality> = { high: 'medium', medium: 'low', low: 'low' };

/** Average fps below this, for two windows in a row, steps the quality tier down. */
const MIN_FPS = 48;
const WINDOW_S = 1.5;
/** Consecutive slow windows before stepping down (≈ 4.5 s). */
const STRIKES = 3;
/** Seconds to ignore after the chapter becomes idle (shader warm-up, texture uploads). */
const GRACE_S = 2;

/**
 * Runtime quality controller. Replaces drei's PerformanceMonitor, which counted the intro's
 * high frame rate as "incline" flips and permanently stopped monitoring after ~7 s,
 * so it never reacted to the universe running at 14 fps (Phase 1 audit).
 *
 * - samples only while the chapter is idle (transitions and shader compiles are ignored)
 * - only ever steps DOWN, so it can't oscillate
 * - disabled when the tier is pinned with ?quality=
 */
export function AdaptiveQuality() {
  const acc = useRef({ t: 0, frames: 0, strikes: 0, idleFor: 0 });

  useFrame((_, dt) => {
    const s = useExperience.getState();
    const a = acc.current;
    if (s.phase !== 'idle' || document.hidden || s.quality === 'low' || qualityLocked()) {
      a.t = 0;
      a.frames = 0;
      a.idleFor = 0;
      a.strikes = 0;
      return;
    }
    a.idleFor += Math.min(dt, 0.25);
    // a single long hitch (tab switch, GC, texture upload) is not "the device is too slow"
    if (a.idleFor < GRACE_S || dt > 0.25) {
      a.t = 0;
      a.frames = 0;
      return;
    }
    a.t += dt;
    a.frames++;
    if (a.t < WINDOW_S) return;
    const fps = a.frames / a.t;
    a.t = 0;
    a.frames = 0;
    if (fps >= MIN_FPS) {
      a.strikes = 0;
      return;
    }
    if (++a.strikes >= STRIKES) {
      a.strikes = 0;
      s.setQuality(LOWER[s.quality]);
    }
  });

  return null;
}
