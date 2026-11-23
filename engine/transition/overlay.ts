'use client';

import { gsap } from '@/animation/gsap';

/**
 * DOM transition art that sits above the page (PAGE_ARCHITECTURE.md §3, z-50).
 * Elements are registered by <OverlayLayer/>; transitions drive them through these helpers.
 */
export const overlayEls: {
  light: HTMLDivElement | null;
  dawn: HTMLDivElement | null;
  sky: HTMLDivElement | null;
  dark: HTMLDivElement | null;
  loader: HTMLDivElement | null;
} = { light: null, dawn: null, sky: null, dark: null, loader: null };

export const overlay = {
  /** Lavender-white bloom that fills the screen (T1 "into the light"). */
  lightIn(duration = 0.8) {
    const tl = gsap.timeline();
    if (!overlayEls.light) return tl;
    tl.set(overlayEls.light, { display: 'block' });
    tl.fromTo(
      overlayEls.light,
      { opacity: 0, '--r': '0%' },
      { opacity: 1, '--r': '140%', duration, ease: 'power2.in' },
    );
    return tl;
  },
  /** Warm sunrise-coloured light (Portal → Dawn): the portal's glow becomes morning mist. */
  dawnIn(duration = 1.0) {
    const tl = gsap.timeline();
    if (!overlayEls.dawn) return tl;
    tl.set(overlayEls.dawn, { display: 'block' });
    tl.fromTo(
      overlayEls.dawn,
      { opacity: 0, '--r': '0%' },
      { opacity: 1, '--r': '150%', duration, ease: 'power2.in' },
    );
    return tl;
  },
  dawnOut(duration = 1.8) {
    const tl = gsap.timeline();
    if (!overlayEls.dawn) return tl;
    tl.to(overlayEls.dawn, { opacity: 0, duration, ease: 'power1.inOut' });
    tl.set(overlayEls.dawn, { display: 'none' });
    return tl;
  },
  /** Open daylight sky with clouds (Butterfly → Sky): what the butterfly's wings become. */
  skyIn(duration = 0.6) {
    const tl = gsap.timeline();
    if (!overlayEls.sky) return tl;
    tl.set(overlayEls.sky, { display: 'block' });
    tl.fromTo(overlayEls.sky, { opacity: 0 }, { opacity: 1, duration, ease: 'power1.inOut' });
    return tl;
  },
  skyOut(duration = 1.6) {
    const tl = gsap.timeline();
    if (!overlayEls.sky) return tl;
    tl.to(overlayEls.sky, { opacity: 0, duration, ease: 'power1.inOut' });
    tl.set(overlayEls.sky, { display: 'none' });
    return tl;
  },
  lightOut(duration = 1.2) {
    const tl = gsap.timeline();
    if (!overlayEls.light) return tl;
    tl.to(overlayEls.light, { opacity: 0, duration, ease: 'power2.out' });
    tl.set(overlayEls.light, { display: 'none' });
    return tl;
  },
  coverDarkInstant() {
    if (!overlayEls.dark) return;
    gsap.set(overlayEls.dark, { display: 'block', opacity: 1 });
  },
  darkIn(duration = 0.6) {
    const tl = gsap.timeline();
    if (!overlayEls.dark) return tl;
    tl.set(overlayEls.dark, { display: 'block' });
    tl.to(overlayEls.dark, { opacity: 1, duration, ease: 'power2.inOut' });
    return tl;
  },
  darkOut(duration = 1.0) {
    const tl = gsap.timeline();
    const els = [overlayEls.dark, overlayEls.loader].filter(Boolean);
    if (!els.length) return tl;
    tl.to(els, { opacity: 0, duration, ease: 'power2.inOut' });
    tl.set(els, { display: 'none' });
    return tl;
  },
  /** Scroll-back exit: the dark cover sweeps in from the right, like film winding backwards. */
  rewindIn(duration = 0.8) {
    const tl = gsap.timeline();
    if (!overlayEls.dark) return tl;
    tl.set(overlayEls.dark, { display: 'block', opacity: 1 });
    tl.fromTo(
      overlayEls.dark,
      { clipPath: 'inset(0% 0% 0% 100%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration, ease: 'power3.inOut' },
    );
    return tl;
  },
  /** "Rewind" wipe for browser back/forward: dark cover with a horizontal film-burn sweep. */
  rewindOut(duration = 0.9) {
    const tl = gsap.timeline();
    if (!overlayEls.dark) return tl;
    tl.fromTo(
      overlayEls.dark,
      { clipPath: 'inset(0% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 100%)', duration, ease: 'power3.inOut' },
    );
    tl.set(overlayEls.dark, { display: 'none', opacity: 0, clipPath: 'none' });
    return tl;
  },
};
