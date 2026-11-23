'use client';

import { create } from 'zustand';
import type { gsap } from '@/animation/gsap';
import type { EnterMode } from '@/engine/transition/transitions';

export type IntroStage = 'closed' | 'opening' | 'open';

export const useIntroState = create<{ stage: IntroStage; setStage(s: IntroStage): void }>((set) => ({
  stage: 'closed',
  setStage: (stage) => set({ stage }),
}));

/** Imperative API the 3D scene exposes to the DOM layer / transition engine. */
export interface IntroSceneApi {
  arrive(mode: EnterMode): gsap.core.Timeline;
  open(): gsap.core.Timeline;
  intoLight(): gsap.core.Timeline;
}

export const introScene: { api: IntroSceneApi | null } = { api: null };

/** Envelope & letter dimensions (world units). */
export const ENV = { W: 3.2, H: 2.1, FLAP: 1.22 } as const;
export const LETTER = { W: 2.7, PANEL: 1.45 } as const;
