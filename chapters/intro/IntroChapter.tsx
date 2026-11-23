'use client';

import { lazy, useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/animation/gsap';
import { charReveal, fadeOut, wordStagger } from '@/animation/text';
import { SceneIn } from '@/engine/stage/tunnel';
import { ScrollCue, useScrollAdvance } from '@/engine/ui/ScrollAdvance';
import { go, registerHandles } from '@/engine/transition/manager';
import type { EnterMode } from '@/engine/transition/transitions';
import { messages } from '@/data/messages';
import { useExperience } from '@/store/experience';
import { introScene, useIntroState } from './state';

const IntroScene = lazy(() => import('./IntroScene'));

export default function IntroChapter() {
  const root = useRef<HTMLDivElement>(null);
  const greeting = useRef<HTMLHeadingElement>(null);
  const subline = useRef<HTMLParagraphElement>(null);
  const eyebrow = useRef<HTMLParagraphElement>(null);
  const openBtn = useRef<HTMLDivElement>(null);
  const stepBtn = useRef<HTMLDivElement>(null);
  const stage = useIntroState((s) => s.stage);
  const copy = messages.intro;

  const { contextSafe } = useGSAP({ scope: root });

  // ---------------------------------------------------------------- handles for the engine
  useEffect(() => {
    const reduced = () => useExperience.getState().reducedMotion;

    const enter = contextSafe((mode: EnterMode) => {
      const tl = gsap.timeline();
      if (introScene.api) tl.add(introScene.api.arrive(mode), 0);
      tl.add(wordStagger(eyebrow.current!, { reduced: reduced(), duration: 1.2 }), mode === 'cold' ? 1.4 : 0.6);
      tl.add(charReveal(greeting.current!, { reduced: reduced(), duration: 1.3, stagger: 0.045 }), '>-0.7');
      tl.add(wordStagger(subline.current!, { reduced: reduced() }), '>-0.6');
      tl.fromTo(
        openBtn.current,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' },
        '>-0.2',
      );
      return tl;
    }) as (mode: EnterMode) => gsap.core.Timeline;

    const intoLight = contextSafe(() => {
      const tl = gsap.timeline();
      tl.add(fadeOut(stepBtn.current!, 0.5), 0);
      const z = zoom.current;
      if (z.tl) tl.add(z.tl.tweenTo(z.tl.duration(), { ease: 'none' }), 0);
      else if (introScene.api) tl.add(introScene.api.intoLight(), 0);
      return tl;
    }) as () => gsap.core.Timeline;

    return registerHandles('intro', { enter, exits: { intoLight } });
  }, [contextSafe]);

  // ---------------------------------------------------------------- open the envelope
  const open = contextSafe(() => {
    if (useIntroState.getState().stage !== 'closed') return;
    if (useExperience.getState().phase !== 'idle' || !introScene.api) return;
    document.body.style.cursor = '';
    const tl = gsap.timeline();
    tl.add(fadeOut([openBtn.current!, subline.current!, greeting.current!, eyebrow.current!], 0.7), 0);
    tl.add(introScene.api.open(), 0.1);
  });

  useEffect(() => {
    const onOpen = () => open();
    window.addEventListener('intro:open', onOpen);
    return () => {
      window.removeEventListener('intro:open', onOpen);
      document.body.style.cursor = '';
    };
  }, [open]);

  // ---------------------------------------------------------------- scroll controls
  // 1) the first scroll opens the envelope
  const pOpen = useScrollAdvance({ enabled: stage === 'closed', distance: 260, onComplete: () => open() });
  // 2) once the letter has been readable for a moment, scrolling zooms it toward the light;
  //    a full scroll steps inside (T1 finishes the flight)
  const [canZoom, setCanZoom] = useState(false);
  useEffect(() => {
    if (stage !== 'open') return setCanZoom(false);
    const t = setTimeout(() => setCanZoom(true), 1800);
    return () => clearTimeout(t);
  }, [stage]);
  const zoom = useRef<{ tl: gsap.core.Timeline | null }>({ tl: null });
  const pZoom = useScrollAdvance({
    enabled: canZoom,
    distance: 1100,
    decay: true,
    onProgress: (v) => {
      if (!introScene.api) return;
      if (!zoom.current.tl) zoom.current.tl = introScene.api.intoLight().pause();
      gsap.to(zoom.current.tl, { progress: v * 0.7, duration: 0.4, ease: 'power2.out', overwrite: true });
    },
    onComplete: () => void go('universe'),
  });
  useEffect(
    () => () => {
      zoom.current.tl?.kill();
    },
    [],
  );

  // reveal the scroll cue once the letter is open
  useGSAP(
    () => {
      if (stage !== 'open') return;
      gsap.fromTo(
        stepBtn.current,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.6 },
      );
    },
    { dependencies: [stage], scope: root },
  );

  return (
    <div ref={root} className="chapter-layer fixed inset-0" data-chapter="intro">
      <SceneIn id="intro">
        <IntroScene />
      </SceneIn>

      <header className="absolute inset-x-0 top-[9vh] flex flex-col items-center px-6 text-center sm:top-[8vh]">
        <p
          ref={eyebrow}
          className="invisible mb-5 font-grotesk text-[0.62rem] font-light tracking-[0.55em] text-lavender/70 uppercase sm:text-[0.7rem]"
        >
          A private invitation
        </p>
        <h1
          ref={greeting}
          className="invisible font-serif text-[clamp(3.4rem,11vw,8.5rem)] leading-[0.9] font-light tracking-[-0.01em] text-paper italic [perspective:600px]"
          style={{ textShadow: '0 0 40px rgba(201,182,255,0.25)' }}
        >
          {copy.greeting}
        </h1>
        <p
          ref={subline}
          className="invisible mt-5 max-w-[28ch] font-grotesk text-[0.78rem] font-light tracking-[0.24em] text-white/60 uppercase sm:max-w-none sm:text-[0.82rem]"
        >
          {copy.subline}
        </p>
      </header>

      {stage === 'closed' && <ScrollCue ref={openBtn} p={pOpen} label="Scroll to open" testId="open" className="text-white/70" />}
      <ScrollCue
        ref={stepBtn}
        p={pZoom}
        label={canZoom ? 'Scroll to step inside' : 'Read it slowly…'}
        testId="step-inside"
        className={`text-white/75 ${stage === 'open' ? '' : 'hidden'}`}
      />

      {/* Readable letter for screen readers (the 3D letter is aria-hidden). */}
      <div className="sr-only" aria-live="polite">
        {stage === 'open' && (
          <>
            <p>{copy.letter.salutation}</p>
            {copy.letter.lines.filter(Boolean).map((l) => (
              <p key={l}>{l}</p>
            ))}
            <p>{copy.letter.signature}</p>
          </>
        )}
      </div>
    </div>
  );
}
