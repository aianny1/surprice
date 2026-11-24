'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/animation/gsap';
import { charReveal, maskLines } from '@/animation/text';
import { SceneIn } from '@/engine/stage/tunnel';
import { backGate, ScrollCue, useScrollAdvance } from '@/engine/ui/ScrollAdvance';
import { registerHandles } from '@/engine/transition/manager';
import type { EnterMode } from '@/engine/transition/transitions';
import { useExperience } from '@/store/experience';
import { surprise } from '@/data/surprise';
import { cake } from './SurpriseScene';
import { music } from '@/engine/audio/Music';
import { sfx } from '@/engine/audio/AudioManager';

const SurpriseScene = lazy(() => import('./SurpriseScene'));
type Step = 'intro' | 'opened' | 'wished';

/** Chapter 09 · the finale. */
export default function SurpriseChapter() {
  const root = useRef<HTMLDivElement>(null);
  const l1 = useRef<HTMLParagraphElement>(null);
  const l2 = useRef<HTMLParagraphElement>(null);
  const openBtn = useRef<HTMLDivElement>(null);
  const wishWrap = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const msg = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const wishBtn = useRef<HTMLDivElement>(null);
  const finale = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState<Step>('intro');
  const [ready, setReady] = useState({ open: false, wish: false });
  const { contextSafe } = useGSAP({ scope: root });

  // the tab may say it out loud on this page only
  useEffect(() => {
    // Next's metadata can rewrite the title after mount, so hold it while this page is open
    const prev = document.title;
    const hold = () => document.title !== surprise.pageTitle && (document.title = surprise.pageTitle);
    hold();
    const id = setInterval(hold, 500);
    return () => {
      clearInterval(id);
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    const enter = contextSafe((mode: EnterMode) => {
      const reduced = useExperience.getState().reducedMotion;
      const tl = gsap.timeline();
      const t = mode === 'rewind' ? 0.3 : 0.8;
      tl.fromTo(l1.current, { autoAlpha: 0, letterSpacing: '0.6em' }, { autoAlpha: 1, letterSpacing: '0.35em', duration: reduced ? 0.4 : 2, ease: 'power2.out' }, t);
      tl.to(l1.current, { autoAlpha: 0, duration: 0.8 }, '+=0.9');
      tl.add(maskLines(l2.current!, { reduced, duration: 1.4 }), '>-0.1');
      tl.fromTo(openBtn.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9 }, '+=0.4');
      tl.call(() => setReady((r) => ({ ...r, open: true })));
      return tl;
    }) as (mode: EnterMode) => gsap.core.Timeline;
    return registerHandles('surprise', { enter });
  }, [contextSafe]);

  const open = contextSafe(() => {
    if (step !== 'intro') return;
    setStep('opened');
    const reduced = useExperience.getState().reducedMotion;
    const k = reduced ? 0.3 : 1;
    const tl = gsap.timeline();
    tl.to([l2.current, openBtn.current], { autoAlpha: 0, duration: 0.6 }, 0);
    tl.to(cake, { lid: 1, duration: 1.4 * k, ease: 'power3.out' }, 0.2);
    tl.to(cake, { box: 0, duration: 0.8 * k, ease: 'power2.in' }, 0.9 * k);
    tl.to(cake, { rise: 1, duration: 1.8 * k, ease: 'power3.out' }, 1.3 * k);
    tl.call(() => sfx.play('crack'), [], 0.2);
    // the score fades out and the celesta's birthday tune begins as the candles light
    tl.call(() => music.birthday(), [], 0.1);
    cake.flames.forEach((_, i) => {
      tl.to(cake.flames, { [i]: 1, duration: 0.45, ease: 'back.out(3)' }, (3.0 + i * 0.35) * k);
    });
    tl.to(cake, { confetti: 1, duration: 0.6 }, (3.4 + cake.flames.length * 0.35) * k);
    tl.set(wishWrap.current, { autoAlpha: 1 }, '<');
    tl.add(charReveal(title.current!, { reduced, duration: 1.2 }), '<');
    tl.fromTo(msg.current!.children, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.5 }, '>-0.3');
    if (photo.current) tl.fromTo(photo.current, { autoAlpha: 0, x: -60, rotate: -14 }, { autoAlpha: 1, x: 0, rotate: -5, duration: 1.2, ease: 'power3.out' }, '<');
    tl.fromTo(wishBtn.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8 }, '>');
    // give her time to read the message before scrolling can blow the candles out
    tl.call(() => setReady((r) => ({ ...r, wish: true })), [], '+=2.5');
  });

  const wish = contextSafe(() => {
    if (step !== 'opened') return;
    setStep('wished');
    const tl = gsap.timeline();
    tl.to([msg.current, wishBtn.current], { autoAlpha: 0, duration: 0.6 }, 0);
    tl.to(cake, { confetti: 0, duration: 0.8 }, 0);
    // she closes her eyes… then the candles go out together
    tl.to(cake.flames, { ...Object.fromEntries(cake.flames.map((_, i) => [i, 0])), duration: 0.35, ease: 'power2.in' }, 1.6);
    tl.set(cake, { smoke: 1 }, 1.7);
    tl.call(() => sfx.play('shimmer'), [], 1.7);
    tl.to(cake, { smoke: 0, duration: 0.1 }, 5.5);
    tl.to(cake, { confetti: 1, duration: 0.8 }, 2.4);
    tl.add(maskLines(finale.current!, { duration: 1.6, stagger: 0.2 }), 2.6);
  });

  // once the gift is open, this moment shouldn't be scrolled away from
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const gate = () => stepRef.current === 'intro';
    backGate.fn = gate;
    return () => {
      if (backGate.fn === gate) backGate.fn = null;
    };
  }, []);

  const pOpen = useScrollAdvance({ enabled: step === 'intro' && ready.open, distance: 700, onComplete: () => open() });
  const pWish = useScrollAdvance({ enabled: step === 'opened' && ready.wish, distance: 900, onComplete: () => wish() });

  return (
    <div ref={root} className="chapter-layer fixed inset-0 text-[#fff4e8]" data-chapter="surprise" data-step={step}>
      <SceneIn id="surprise">
        <Suspense fallback={null}>
          <SurpriseScene />
        </Suspense>
      </SceneIn>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p ref={l1} className="invisible absolute font-grotesk text-sm tracking-[0.35em] uppercase sm:text-base">
          {surprise.lines[0]}
        </p>
        <p ref={l2} className="invisible absolute font-serif text-[clamp(1.6rem,4vw,3.2rem)] leading-tight">
          {surprise.lines[1]}
        </p>
      </div>
      <ScrollCue ref={openBtn} p={pOpen} label={`Scroll · ${surprise.openLabel}`} testId="surprise-open" className={step === 'intro' ? '' : 'hidden'} />

      {/* her photo, pinned beside the cake once the gift is open (wide screens only) */}
      {surprise.photo && (
        <div
          ref={photo}
          data-testid="surprise-photo"
          className="pointer-events-none invisible absolute top-[34vh] left-[5vw] hidden w-[min(15rem,18vw)] bg-[#fbf7f0] p-2.5 pb-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] lg:block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={surprise.photo} alt="Megha" className="aspect-[9/16] w-full object-cover" />
          <p className="mt-2 text-center font-serif text-sm text-[#2b1f22] italic">the birthday girl ♡</p>
        </div>
      )}
      <div ref={wishWrap} className="invisible absolute inset-x-0 top-[6vh] flex flex-col items-center px-5 text-center" data-testid="surprise-wish">
        <h1 ref={title} className="font-serif text-[clamp(2rem,6vw,4.6rem)] leading-none text-[#ffe7c7] drop-shadow-[0_0_24px_rgba(255,190,130,0.45)]">
          {surprise.wish}
        </h1>
        <div ref={msg} className="mt-4 max-w-xl space-y-1.5 font-serif text-[1.02rem] leading-snug italic sm:text-lg">
          {surprise.message.map((m) => (
            <p key={m} className="invisible">{m}</p>
          ))}
          <p className="invisible pt-1 font-grotesk text-[0.6rem] tracking-[0.35em] uppercase not-italic opacity-70">— {surprise.signature}</p>
        </div>
      </div>
      <ScrollCue ref={wishBtn} p={pWish} label={ready.wish ? `Scroll · ${surprise.wishLabel}` : 'Read it first…'} testId="surprise-make-wish" className={step === 'opened' ? '' : 'hidden'} />
      <p
        ref={finale}
        className="pointer-events-none invisible absolute inset-x-0 bottom-[14vh] px-6 text-center font-serif text-[clamp(1.3rem,3.2vw,2.4rem)] leading-tight text-[#ffe7c7]"
      >
        {surprise.finale}
      </p>
    </div>
  );
}
