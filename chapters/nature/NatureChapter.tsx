'use client';

import { lazy, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { gsap, useGSAP } from '@/animation/gsap';
import { fadeOut, maskLines, wordStagger } from '@/animation/text';
import { overlay } from '@/engine/transition/overlay';
import { SceneIn } from '@/engine/stage/tunnel';
import { CinematicButton } from '@/engine/ui/CinematicButton';
import { go, registerHandles } from '@/engine/transition/manager';
import { nextChapter } from '@/engine/chapters';
import type { EnterMode } from '@/engine/transition/transitions';
import { nature } from '@/data/nature';
import { backGate } from '@/engine/ui/ScrollAdvance';
import { useExperience } from '@/store/experience';
import { natureScene, SEED_STOPS, seedForStop, useSeeds, useWalkStop, walk } from './state';
import { openSeed } from './LightSeeds';
import { STOPS } from './world';

const NatureScene = lazy(() => import('./NatureScene'));

/** How far one wheel "notch" (100px) moves the walk. */
const WHEEL_STEP = 0.0009;
const TOUCH_STEP = 0.0022;

/** Chapter 03 · Her Wild Side. */
export default function NatureChapter() {
  const root = useRef<HTMLDivElement>(null);
  const eyebrow = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const header = useRef<HTMLElement>(null);
  const continueBtn = useRef<HTMLDivElement>(null);
  const stop = useWalkStop((s) => s.stop);
  const phase = useExperience((s) => s.phase);
  const opened = useSeeds((s) => s.opened);
  const showing = useSeeds((s) => s.showing);
  const [comingSoon, setComingSoon] = useState(false);
  // the coming-soon card must sit above the transition overlays, so it renders into <body>
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const next = nextChapter('nature');
  const { contextSafe } = useGSAP({ scope: root });

  // ---------------------------------------------------------------- scroll-driven story
  const cardOpenedAt = useRef(0);
  const scrubbed = useRef(false);
  /** Butterfly exit scrubbed by scroll: p 0 → 1, then the chapter hands over to Travel. */
  const fly = useRef<{ p: number; tl: gsap.core.Timeline | null; done: boolean }>({ p: 0, tl: null, done: false });
  const scrubButterfly = (delta: number) => {
    const f = fly.current;
    if (f.done || !natureScene.api) return;
    if (!f.tl) f.tl = natureScene.api.followButterfly().pause();
    f.p = Math.min(1, Math.max(0, f.p + delta));
    gsap.to(f.tl, { progress: f.p, duration: 0.5, ease: 'power2.out', overwrite: true });
    // the interface steps aside as the butterfly takes the lens
    root.current?.querySelectorAll<HTMLElement>('[data-ui]').forEach((el) => (el.style.opacity = String(Math.max(0, 1 - f.p * 3))));
    if (f.p >= 1 && next) {
      f.done = true;
      scrubbed.current = true;
      void go(next.id);
    }
  };
  useEffect(
    () => () => {
      fly.current.tl?.kill();
    },
    [],
  );

  // scrolling up only leaves the forest from the very start of the walk
  useEffect(() => {
    const gate = () => walk.target <= 0.001 && walk.progress < 0.01 && useSeeds.getState().showing === null && fly.current.p === 0;
    backGate.fn = gate;
    return () => {
      if (backGate.fn === gate) backGate.fn = null;
    };
  }, []);

  // a light-seed opens by itself once the walk settles at its stop
  useEffect(() => {
    const id = setInterval(() => {
      const s = useSeeds.getState();
      const cur = useWalkStop.getState().stop;
      const i = seedForStop(cur);
      if (i < 0 || s.opened[i] || s.showing !== null || useExperience.getState().phase !== 'idle') return;
      if (Math.abs(walk.progress - STOPS[cur]) > 0.012 || Math.abs(walk.target - STOPS[cur]) > 0.001) return;
      cardOpenedAt.current = performance.now();
      openSeed(i);
    }, 250);
    return () => clearInterval(id);
  }, []);

  // fresh seeds every visit; Esc closes an open card
  useEffect(() => {
    useSeeds.getState().reset();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useSeeds.getState().close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      useSeeds.getState().close();
    };
  }, []);

  // ---------------------------------------------------------------- engine handles
  useEffect(() => {
    const reduced = () => useExperience.getState().reducedMotion;
    const enter = contextSafe((mode: EnterMode) => {
      const tl = gsap.timeline();
      if (natureScene.api) tl.add(natureScene.api.arrive(mode), 0);
      const t = mode === 'rewind' ? 0.6 : 1.4;
      tl.add(wordStagger(eyebrow.current!, { reduced: reduced(), duration: 1.1 }), t);
      tl.add(maskLines(heading.current!, { reduced: reduced(), duration: 1.5, stagger: 0.18 }), t + 0.4);
      tl.fromTo(continueBtn.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, '>-0.3');
      return tl;
    }) as (mode: EnterMode) => gsap.core.Timeline;
    // T3 (Butterfly → Sky) asks for this exit: the UI steps aside, the butterfly takes the lens
    const followButterfly = contextSafe(() => {
      const tl = gsap.timeline();
      tl.add(fadeOut(root.current!.querySelectorAll('[data-ui]'), 0.5), 0);
      // already flown by scrolling: just hand over to the sky
      if (natureScene.api && !scrubbed.current) tl.add(natureScene.api.followButterfly(), 0);
      return tl;
    }) as () => gsap.core.Timeline;
    return registerHandles('nature', { enter, exits: { followButterfly } });
  }, [contextSafe]);

  // ---------------------------------------------------------------- walking input
  useEffect(() => {
    const canWalk = () => useExperience.getState().phase === 'idle';
    const nudge = (delta: number) => {
      if (!canWalk()) return;
      const seeds = useSeeds.getState();
      // a card that just opened stays put for a moment, so the same scroll doesn't flick it away;
      // after that, scrolling on closes it and keeps walking
      if (seeds.showing !== null) {
        if (performance.now() - cardOpenedAt.current < 1400) return;
        seeds.close();
      }
      // at the summit, once the last message is read, scrolling flies the butterfly instead
      const atEnd = walk.target >= 1 - 1e-3 && seeds.opened[seeds.opened.length - 1];
      if ((atEnd && delta > 0) || fly.current.p > 0) {
        scrubButterfly(delta * 1.6);
        return;
      }
      // she can't walk past a light-seed whose message hasn't opened yet
      const unread = SEED_STOPS.find((st, i) => !seeds.opened[i] && STOPS[st] > walk.target - 1e-3);
      const max = unread !== undefined ? STOPS[unread] : 1;
      walk.target = Math.min(max, Math.max(0, walk.target + delta));
      walk.dir = Math.sign(delta);
      walk.lastInput = performance.now() / 1000;
    };
    const onWheel = (e: WheelEvent) => nudge(e.deltaY * WHEEL_STEP);
    let lastY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (lastY = e.touches[0]?.clientY ?? null);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null || lastY == null) return;
      nudge((lastY - y) * TOUCH_STEP);
      lastY = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') nudge(0.05);
      if (e.key === 'ArrowUp' || e.key === 'PageUp') nudge(-0.05);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // the opening heading drifts away as soon as she starts walking
  useEffect(() => {
    const tick = () => {
      if (!header.current) return;
      const k = Math.min(1, walk.progress / 0.08);
      header.current.style.opacity = String(1 - k);
      header.current.style.transform = `translateY(${-k * 24}px)`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);


  const lastStop = stop === STOPS.length - 1;
  const seed = seedForStop(stop);
  const allRead = opened.every(Boolean);
  const hint =
    lastStop && allRead ? 'Scroll to follow the butterfly' : stop === 0 ? 'Scroll to walk in' : seed >= 0 && !opened[seed] ? 'A light is waking up…' : 'Scroll to keep walking';
  const card = showing !== null ? nature.stops[showing] : null;

  const preview = useRef<gsap.core.Timeline | null>(null);
  const follow = () => {
    if (useExperience.getState().phase !== 'idle' || preview.current) return;
    useSeeds.getState().close();
    if (next?.built) {
      void go(next.id);
      return;
    }
    // Travel isn't built yet: play the butterfly → sky, then say so; "Stay" plays it backwards
    const tl = gsap.timeline();
    tl.add(fadeOut(root.current!.querySelectorAll('[data-ui]'), 0.5), 0);
    if (natureScene.api) tl.add(natureScene.api.followButterfly(), 0);
    tl.add(overlay.skyIn(0.6), 3.0);
    tl.call(() => setComingSoon(true));
    preview.current = tl;
  };
  const stay = () => {
    setComingSoon(false);
    const tl = preview.current;
    preview.current = null;
    if (tl) tl.timeScale(1.8).reverse();
  };

  return (
    <div ref={root} className="chapter-layer fixed inset-0" data-chapter="nature" data-stop={stop}>
      <SceneIn id="nature">
        <NatureScene />
      </SceneIn>

      <header ref={header} className="absolute inset-x-0 top-[16vh] flex flex-col items-center px-6 text-center">
        <p
          ref={eyebrow}
          className="invisible mb-6 font-grotesk text-[0.62rem] tracking-[0.55em] text-[#3f2a2a]/70 uppercase sm:text-[0.7rem]"
        >
          {nature.title}
        </p>
        <h1
          ref={heading}
          data-testid="nature-heading"
          className="invisible max-w-[18ch] font-serif text-[clamp(2.2rem,6vw,4.8rem)] leading-[1.05] font-light text-[#2b1f22] italic"
          style={{ textShadow: '0 0 40px rgba(255,236,220,0.6)' }}
        >
          {nature.heading.charAt(0) + nature.heading.slice(1).toLowerCase()}
        </h1>
      </header>


      <AnimatePresence>
        {card && (
          <motion.div
            key={card.id}
            className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+9rem)] flex justify-center px-5 sm:bottom-[20vh]"
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: 12, filter: 'blur(6px)', transition: { duration: 0.35 } }}
          >
            <div
              className="pointer-events-auto relative w-full max-w-md rounded-3xl border border-white/50 bg-[#f7f0e6]/85 px-7 py-7 shadow-[0_30px_90px_rgba(40,25,10,0.25)] backdrop-blur-xl sm:px-9"
              role="dialog"
              aria-label={card.label}
              data-testid="nature-card"
            >
              <button
                onClick={() => useSeeds.getState().close()}
                className="absolute top-4 right-5 font-grotesk text-lg text-[#2b1f22]/50 hover:text-[#2b1f22]"
                aria-label="Close"
                data-testid="nature-card-close"
              >
                ×
              </button>
              <p className="font-grotesk text-[0.6rem] tracking-[0.4em] text-[#8a6a3a] uppercase">
                {String((showing ?? 0) + 1).padStart(2, '0')} / 03 · {card.label}
              </p>
              {card.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.photo} alt="" className="mt-4 aspect-[4/3] w-full rounded-xl object-cover" />
              )}
              <p className="mt-4 font-serif text-[1.35rem] leading-snug text-[#2b1f22] italic sm:text-[1.5rem]">{card.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* scroll is the only control: it walks, opens each light-seed's message, then flies the butterfly */}
      <div
        ref={continueBtn}
        data-ui
        data-testid="nature-scroll-hint"
        className={`pointer-events-none invisible absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] flex flex-col items-center gap-2 text-center font-grotesk text-[0.62rem] tracking-[0.4em] uppercase transition-opacity duration-500 sm:bottom-[7vh] ${
          phase === 'idle' ? 'opacity-100' : 'opacity-0'
        } ${stop === 0 ? 'text-[#2b1f22]/70' : 'text-[#fff4e8]/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]'}`}
      >
        <span>{hint}</span>
        <span aria-hidden className="relative block h-8 w-5 rounded-full border border-current opacity-70">
          <span className="absolute top-1.5 left-1/2 block h-1.5 w-0.5 -translate-x-1/2 animate-[scrollcue_1.6s_ease-in-out_infinite] rounded-full bg-current" />
        </span>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {comingSoon && (
              <motion.div
                // portalled to <body> and above the transition overlays (z-50): it sits on the butterfly's sky
                className="fixed inset-0 z-[75] flex items-center justify-center px-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                data-testid="nature-coming-soon"
              >
                <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/20 bg-[#1d1418]/80 px-8 py-10 text-center backdrop-blur-2xl">
                  <p className="font-grotesk text-[0.62rem] tracking-[0.4em] text-[#f2c3a0] uppercase">
                    Chapter {String(next?.order ?? 4).padStart(2, '0')} · {next?.title}
                  </p>
                  <p className="mt-4 font-serif text-3xl leading-tight text-[#fff4e8] italic">This world is still being painted.</p>
                  <p className="mt-3 font-grotesk text-xs tracking-[0.12em] text-white/55">It arrives in the next build stage.</p>
                  <button
                    onClick={stay}
                    className="mt-8 rounded-full border border-white/30 px-6 py-3 font-grotesk text-[0.65rem] tracking-[0.3em] text-[#fff4e8] uppercase hover:bg-white/10"
                  >
                    Stay for the sunset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
