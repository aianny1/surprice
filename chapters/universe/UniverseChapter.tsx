'use client';

import { lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  const dive = useRef<gsap.core.Timeline | null>(null);
  const [comingSoon, setComingSoon] = useState(false);
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

  const enterWorld = contextSafe(() => {
    if (useExperience.getState().phase !== 'idle' || !universeScene.api) return;
    if (next?.built) {
      void go(next.id);
      return;
    }
    // The next chapter is not built yet: play the portal dive, then say so honestly.
    const tl = gsap.timeline();
    tl.add(fadeOut([welcome.current!, enterBtn.current!], 0.6), 0);
    tl.add(universeScene.api.diveIntoPortal(), 0);
    tl.call(() => setComingSoon(true), [], '>-0.3');
    dive.current = tl;
  });

  // scroll toward the portal to enter: the camera leans in as the ring fills
  const lean = useRef<number | null>(null);
  const pEnter = useScrollAdvance({
    enabled: !comingSoon,
    decay: true,
    onProgress: (v) => {
      if (v > 0 && lean.current === null) lean.current = rig.fov;
      if (lean.current !== null) rig.fov = lean.current * (1 - v * 0.3);
      if (v === 0) lean.current = null;
    },
    onComplete: () => enterWorld(),
  });

  const back = () => {
    setComingSoon(false);
    const tl = dive.current;
    if (!tl) return;
    tl.timeScale(1.6).reverse();
    dive.current = null;
  };

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

      <AnimatePresence>
        {comingSoon && (
          <motion.div
            className="fixed inset-0 z-30 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="coming-soon"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-lavender/20 bg-[#120a22]/85 px-8 py-10 text-center shadow-[0_30px_120px_rgba(40,10,80,0.55)] backdrop-blur-2xl">
              <p className="font-grotesk text-[0.62rem] tracking-[0.4em] text-lavender uppercase">
                Chapter {String(next?.order ?? 3).padStart(2, '0')} · {next?.title}
              </p>
              <p className="mt-4 font-serif text-3xl leading-tight text-paper italic">This world is still being painted.</p>
              <p className="mt-3 font-grotesk text-xs tracking-[0.12em] text-white/55">It arrives in the next build stage.</p>
              <button
                onClick={back}
                className="mt-8 rounded-full border border-lavender/40 px-6 py-3 font-grotesk text-[0.65rem] tracking-[0.3em] text-paper uppercase transition-colors hover:bg-lavender/10"
                data-testid="back-to-universe"
              >
                Return to the universe
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
