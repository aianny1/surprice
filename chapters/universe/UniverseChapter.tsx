'use client';

import { lazy, useEffect, useRef } from 'react';
import { gsap, useGSAP } from '@/animation/gsap';
import { fadeOut, maskLines } from '@/animation/text';
import { SceneIn } from '@/engine/stage/tunnel';
import { rig } from '@/engine/stage/rig';
import { ScrollCue, useScrollAdvance } from '@/engine/ui/ScrollAdvance';
import { go, registerHandles } from '@/engine/transition/manager';
import type { EnterMode } from '@/engine/transition/transitions';
import { nextChapter } from '@/engine/chapters';
import { messages } from '@/data/messages';
import { person } from '@/data/person';
import { useExperience } from '@/store/experience';
import { universeScene } from './state';

const UniverseScene = lazy(() => import('./UniverseScene'));

export default function UniverseChapter() {
  const root = useRef<HTMLDivElement>(null);
  const welcome = useRef<HTMLHeadingElement>(null);
  const enterBtn = useRef<HTMLDivElement>(null);
  const copy = messages.universe;
  const next = nextChapter('universe');

  const { contextSafe } = useGSAP({ scope: root });

  useEffect(() => {
    const reduced = () => useExperience.getState().reducedMotion;
    const enter = contextSafe((mode: EnterMode) => {
      const tl = gsap.timeline();
      if (universeScene.api) tl.add(universeScene.api.arrive(mode), 0);
      const fast = mode === 'rewind' || reduced();
      tl.add(maskLines(welcome.current!, { reduced: reduced(), duration: 1.4, stagger: 0.16 }), fast ? 1.4 : 4.9);
      tl.fromTo(
        enterBtn.current,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' },
        '>-0.4',
      );
      return tl;
    }) as (mode: EnterMode) => gsap.core.Timeline;
    // T2 (Portal → Dawn) asks for this exit: text fades, camera dives into the portal
    const intoPortal = contextSafe(() => {
      const tl = gsap.timeline();
      tl.add(fadeOut([welcome.current!, enterBtn.current!], 0.6), 0);
      if (universeScene.api) tl.add(universeScene.api.diveIntoPortal(), 0);
      return tl;
    }) as () => gsap.core.Timeline;
    return registerHandles('universe', { enter, exits: { intoPortal } });
  }, [contextSafe]);

  const enterWorld = () => {
    if (useExperience.getState().phase !== 'idle' || !next) return;
    void go(next.id);
  };

  // scroll toward the portal to enter: the camera leans in as the ring fills
  const lean = useRef<number | null>(null);
  const pEnter = useScrollAdvance({
    enabled: true,
    decay: true,
    onProgress: (v) => {
      if (v > 0 && lean.current === null) lean.current = rig.fov;
      if (lean.current !== null) rig.fov = lean.current * (1 - v * 0.3);
      if (v === 0) lean.current = null;
    },
    onComplete: () => enterWorld(),
  });

  return (
    <div ref={root} className="chapter-layer fixed inset-0" data-chapter="universe">
      <SceneIn id="universe">
        <UniverseScene />
      </SceneIn>

      <h1 className="sr-only">{person.name.display}</h1>

      <div className="absolute inset-x-0 top-[33vh] flex justify-center px-6 text-center sm:top-[34vh]">
        <h2
          ref={welcome}
          className="invisible font-display text-[clamp(1.35rem,3.6vw,3rem)] leading-[1.15] font-normal tracking-[0.14em] text-paper uppercase"
          style={{ textShadow: '0 0 30px rgba(10,4,20,0.8)' }}
        >
          {copy.welcome[0]}{' '}
          <em className="font-serif text-[1.12em] font-light tracking-[0.02em] text-lavender normal-case italic">
            {copy.welcome[1].toLowerCase()}
          </em>{' '}
          {copy.welcome[2]}
        </h2>
      </div>

      <ScrollCue ref={enterBtn} p={pEnter} label={`Scroll · ${copy.enterLabel}`} testId="enter-world" className="text-white/75" />
    </div>
  );
}
