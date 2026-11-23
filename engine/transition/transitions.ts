'use client';

import { gsap } from '@/animation/gsap';
import type { ChapterId } from '@/engine/chapters';
import { overlay } from './overlay';
import { rig } from '@/engine/stage/rig';
import { sfx } from '@/engine/audio/AudioManager';

/** How a chapter was arrived at; chapters adapt their entrance choreography to it. */
export type EnterMode = 'light' | 'cold' | 'rewind' | 'fade';

/** What a chapter exposes to the engine (registered by the chapter's DOM root). */
export interface ChapterHandles {
  enter(mode: EnterMode): gsap.core.Timeline;
  /** Named exit choreographies that transitions can ask for. */
  exits?: Partial<Record<string, () => gsap.core.Timeline>>;
}

export interface TransitionCtx {
  from: ChapterHandles | null;
  to: () => ChapterHandles | null;
  reduced: boolean;
}

export interface TransitionDef {
  id: string;
  from: ChapterId | '*';
  to: ChapterId | '*';
  exit(ctx: TransitionCtx): gsap.core.Timeline | null;
  enter(ctx: TransitionCtx): gsap.core.Timeline | null;
}

function enterOf(ctx: TransitionCtx, mode: EnterMode) {
  return ctx.to()?.enter(mode) ?? gsap.timeline();
}

/**
 * T1 — Envelope → Light → Galaxy.
 * The unfolded letter's glow swallows the camera; the route swaps inside pure light;
 * the light shatters into the stars of the universe.
 */
const T1: TransitionDef = {
  id: 'T1-envelope-light',
  from: 'intro',
  to: 'universe',
  exit(ctx) {
    const tl = gsap.timeline();
    tl.call(() => sfx.play('whoosh'));
    const intoLight = ctx.from?.exits?.intoLight;
    if (intoLight) tl.add(intoLight(), 0);
    tl.add(overlay.lightIn(0.75), intoLight ? '-=0.8' : 0);
    tl.to({}, { duration: 0.25 }); // hold in pure light
    return tl;
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.call(() => sfx.play('shimmer'));
    tl.add(enterOf(ctx, 'light'), 0);
    tl.add(overlay.lightOut(1.3), 0.05);
    return tl;
  },
};

/**
 * T2 — Galaxy portal → Dawn.
 * The camera dives into the portal while it fills with warm light; that light covers the screen,
 * the route swaps inside it, and it dissolves into the thick morning mist of Her Wild Side.
 */
const T2: TransitionDef = {
  id: 'T2-portal-dawn',
  from: 'universe',
  to: 'nature',
  exit(ctx) {
    const tl = gsap.timeline();
    const dive = ctx.from?.exits?.intoPortal;
    if (dive) tl.add(dive(), 0);
    tl.add(overlay.dawnIn(1.0), dive ? 1.6 : 0);
    tl.to({}, { duration: 0.2 }); // hold in the light
    return tl;
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.call(() => sfx.play('shimmer'));
    tl.add(enterOf(ctx, 'light'), 0);
    tl.add(overlay.dawnOut(1.9), 0.15);
    return tl;
  },
};

/**
 * T3 — Butterfly → Sky.
 * A butterfly flies at the camera, its wings open across the whole screen and melt into a cloudy
 * daylight sky; the route swaps inside that sky and the next chapter (The Wanderer) begins from it.
 */
const T3: TransitionDef = {
  id: 'T3-butterfly-sky',
  from: 'nature',
  to: 'travel',
  exit(ctx) {
    const tl = gsap.timeline();
    const fly = ctx.from?.exits?.followButterfly?.();
    if (fly) tl.add(fly, 0);
    // the sky arrives as the wings fill the lens (≈3 s into a full flight; at once if she already
    // flew the butterfly there by scrolling)
    tl.add(overlay.skyIn(0.6), fly ? Math.max(0, Math.min(3.0, fly.duration() - 0.6)) : 0);
    tl.to({}, { duration: 0.15 });
    return tl;
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.add(enterOf(ctx, 'light'), 0);
    tl.add(overlay.skyOut(1.8), 0.1);
    return tl;
  },
};

/**
 * T4 — Flight → Clouds → Lens.
 * The camera follows the plane into a cloud bank (the sky cover); the Artist chapter opens
 * out of it through a lens iris.
 */
const T4: TransitionDef = {
  id: 'T4-clouds-lens',
  from: 'travel',
  to: 'artist',
  exit(ctx) {
    const tl = gsap.timeline();
    const fly = ctx.from?.exits?.takeOff;
    if (fly) tl.add(fly(), 0);
    tl.add(overlay.skyIn(0.7), fly ? 1.0 : 0);
    tl.to({}, { duration: 0.15 });
    return tl;
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.add(enterOf(ctx, 'light'), 0);
    tl.add(overlay.skyOut(1.2), 0.1);
    return tl;
  },
};

/** Generic: fade through black. Used when no bespoke transition exists yet. */
const fallback: TransitionDef = {
  id: 'fade',
  from: '*',
  to: '*',
  exit() {
    return overlay.darkIn(0.7);
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.add(enterOf(ctx, 'fade'), 0);
    tl.add(overlay.darkOut(0.9), 0);
    return tl;
  },
};

/** C — Cold open: direct URL / refresh. The preloader's black lifts as the chapter plays its own intro. */
const coldOpen: TransitionDef = {
  id: 'C-cold-open',
  from: '*',
  to: '*',
  exit: () => null,
  enter(ctx) {
    const tl = gsap.timeline();
    tl.add(overlay.darkOut(1.2), 0);
    tl.add(enterOf(ctx, 'cold'), 0.2);
    return tl;
  },
};

/** R — Rewind: browser back/forward. A dark cover wipes away sideways like a film rewinding. */
const rewind: TransitionDef = {
  id: 'R-rewind',
  from: '*',
  to: '*',
  exit: () => null,
  enter(ctx) {
    const tl = gsap.timeline();
    tl.call(() => sfx.play('rewind'));
    tl.add(overlay.rewindOut(0.9), 0);
    tl.add(enterOf(ctx, 'rewind'), 0.1);
    return tl;
  },
};

/**
 * B — Back: scrolling up past the start of a chapter returns to the previous one.
 * The camera pulls back, the interface steps aside and a dark cover winds in from the right;
 * the earlier chapter then plays its "rewind" entrance as the cover winds away.
 */
const back: TransitionDef = {
  id: 'B-back',
  from: '*',
  to: '*',
  exit(ctx) {
    const tl = gsap.timeline();
    tl.call(() => sfx.play('rewind'));
    const aside = ctx.from?.exits?.stepAside;
    if (aside) tl.add(aside(), 0);
    tl.to(rig, { fov: Math.min(90, rig.fov * 1.35), duration: 0.9, ease: 'power2.in' }, 0);
    tl.add(overlay.rewindIn(0.8), 0.15);
    return tl;
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.add(overlay.rewindOut(0.9), 0);
    tl.add(enterOf(ctx, 'rewind'), 0.1);
    return tl;
  },
};

/** Reduced motion: every forward transition becomes a gentle dissolve. */
const reduced: TransitionDef = {
  id: 'reduced',
  from: '*',
  to: '*',
  exit() {
    return overlay.darkIn(0.5);
  },
  enter(ctx) {
    const tl = gsap.timeline();
    tl.add(enterOf(ctx, 'fade'), 0);
    tl.add(overlay.darkOut(0.6), 0);
    return tl;
  },
};

export const TRANSITIONS = {
  list: [T1, T2, T3, T4],
  fallback,
  coldOpen,
  rewind,
  back,
  reduced,
};
