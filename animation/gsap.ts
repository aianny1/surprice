'use client';

import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

let registered = false;

/** Registers plugins and the custom eases from ANIMATION_SYSTEM.md exactly once. */
export function ensureGsap() {
  if (registered || typeof window === 'undefined') return gsap;
  gsap.registerPlugin(CustomEase, SplitText, useGSAP);
  CustomEase.create('cinema', 'M0,0 C0.7,0 0.2,1 1,1');
  CustomEase.create('paper', 'M0,0 C0.3,0 0.1,1.12 1,1');
  CustomEase.create('drift', 'M0,0 C0.37,0 0.63,1 1,1');
  registered = true;
  return gsap;
}

ensureGsap();

export const DUR = {
  instant: 0.12,
  quick: 0.25,
  base: 0.6,
  reveal: 1.1,
  scene: 1.8,
  epic: 3.0,
  hold: 2.0,
};

export const STAGGER = {
  chars: 0.025,
  charsLong: 0.015,
  words: 0.06,
  lines: 0.12,
};

export { gsap, SplitText, useGSAP };
