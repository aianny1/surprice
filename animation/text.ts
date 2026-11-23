'use client';

import { gsap, SplitText, STAGGER } from './gsap';

/**
 * Text animation primitives (ANIMATION_SYSTEM.md §4).
 * Each returns a (non-paused) timeline meant to be nested in a parent timeline.
 * The original text stays readable to screen readers via aria-label on the element.
 */

function keepAccessible(el: HTMLElement) {
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent ?? '');
}

export function charReveal(
  el: HTMLElement,
  { duration = 1.1, stagger = STAGGER.chars, reduced = false } = {},
) {
  keepAccessible(el);
  const tl = gsap.timeline();
  tl.set(el, { autoAlpha: 1 });
  if (reduced) return tl.from(el, { autoAlpha: 0, duration: 0.5 });
  const split = SplitText.create(el, { type: 'chars,words', mask: 'chars' });
  tl.from(split.chars, {
    yPercent: 115,
    rotateX: -55,
    transformOrigin: '50% 100%',
    duration,
    ease: 'power4.out',
    stagger,
  });
  // Remove the per-character masks once revealed: they clip text-shadow glows (Phase 1 bug I1).
  tl.call(() => split.revert());
  return tl;
}

export function wordStagger(
  el: HTMLElement,
  { duration = 1.0, stagger = STAGGER.words, reduced = false } = {},
) {
  keepAccessible(el);
  const tl = gsap.timeline();
  tl.set(el, { autoAlpha: 1 });
  if (reduced) return tl.from(el, { autoAlpha: 0, duration: 0.5 });
  const split = SplitText.create(el, { type: 'words' });
  tl.from(split.words, {
    autoAlpha: 0,
    y: 18,
    filter: 'blur(8px)',
    duration,
    ease: 'power3.out',
    stagger,
  });
  tl.call(() => split.revert());
  return tl;
}

export function maskLines(
  el: HTMLElement,
  { duration = 1.2, stagger = STAGGER.lines, reduced = false } = {},
) {
  keepAccessible(el);
  const tl = gsap.timeline();
  tl.set(el, { autoAlpha: 1 });
  if (reduced) return tl.from(el, { autoAlpha: 0, duration: 0.5 });
  const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
  tl.from(split.lines, { yPercent: 105, duration, ease: 'power4.out', stagger });
  tl.call(() => split.revert());
  return tl;
}

/** Fades and lifts any element(s) out. */
export function fadeOut(targets: gsap.TweenTarget, duration = 0.6) {
  return gsap.timeline().to(targets, {
    autoAlpha: 0,
    y: -12,
    filter: 'blur(6px)',
    duration,
    ease: 'power3.in',
    stagger: 0.05,
  });
}
