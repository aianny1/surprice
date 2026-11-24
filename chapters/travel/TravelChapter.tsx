'use client';

import { lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gsap } from '@/animation/gsap';
import { ChapterShell } from '@/engine/ui/ChapterShell';
import { useBackGate } from '@/engine/ui/ScrollAdvance';
import { sfx } from '@/engine/audio/AudioManager';
import { travel } from '@/data/travel';
import { useExperience } from '@/store/experience';
import { travelScene, useTravel } from './state';

const TravelScene = lazy(() => import('./TravelScene'));
/** The film: how long each place stays on screen, and the pause before the first flight. */
const AUTO_HOP_MS = 5200;
const AUTO_START_DELAY_MS = 3500;
const list = travel.destinations.map((x, i) => ({ ...x, i }));

function timecode(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const f = Math.floor((ms % 1000) / 41.7);
  return `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

/**
 * Chapter 04 · The Wanderer, played like a short travel film: letterbox, a progress bar per place,
 * and the plane flying from place to place on its own. Scroll only takes off once the film ends.
 */
export default function TravelChapter() {
  const { selected, dreams, toggleDream } = useTravel();
  const d = selected != null ? travel.destinations[selected] : null;
  const pos = selected == null ? -1 : list.findIndex((x) => x.i === selected);
  const atLast = pos === list.length - 1;

  const lastStep = useRef(0);
  const started = useRef(0);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const reset = () => {
      lastStep.current = performance.now() + AUTO_START_DELAY_MS - AUTO_HOP_MS;
      started.current = 0;
    };
    reset();
    const id = setInterval(() => {
      // while a transition plays, hold the film so the first flight waits for the arrival
      if (useExperience.getState().phase !== 'idle') return reset();
      const now = performance.now();
      if (started.current) setClock(now - started.current);
      const st = useTravel.getState();
      const cur = st.selected == null ? -1 : list.findIndex((x) => x.i === st.selected);
      if (cur >= list.length - 1 || now - lastStep.current < AUTO_HOP_MS) return;
      if (!started.current) started.current = now;
      lastStep.current = now;
      st.select(list[cur + 1].i);
      sfx.play('whoosh');
    }, 120);
    return () => clearInterval(id);
  }, []);

  // scroll-back to Nature only before the film starts
  useBackGate(() => useTravel.getState().selected == null);

  return (
    <ChapterShell
      id="travel"
      scene={<TravelScene />}
      heading={travel.heading}
      cta={travel.continueLabel}
      canAdvance={atLast}
      cueLabel={atLast ? undefined : 'The film is about to begin…'}
      hideCue={pos >= 0 && !atLast}
      onEnter={(m) => travelScene.api?.arrive(m)}
      exits={{ takeOff: () => travelScene.api?.takeOff() ?? gsap.timeline() }}
    >
      {/* cinema letterbox */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[7vh] bg-black"
        initial={{ y: '-100%' }}
        animate={{ y: pos >= 0 ? '0%' : '-100%', transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[13vh] bg-black"
        initial={{ y: '100%' }}
        animate={{ y: pos >= 0 ? '0%' : '100%', transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
      />

      {/* the film's timeline: one segment per place, the current one filling as it plays */}
      <AnimatePresence>
        {pos >= 0 && !atLast && (
          <motion.div
            data-ui
            data-testid="travel-timeline"
            className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.6vh)] mx-auto flex w-[min(44rem,calc(100vw-2.5rem))] flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.8 } }}
            exit={{ opacity: 0 }}
          >
            <div className="flex gap-1">
              {list.map((x, k) => (
                <span key={x.id} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
                  {k < pos && <span className="absolute inset-0 bg-[#ffd9a8]" />}
                  {k === pos && (
                    <motion.span
                      key={pos}
                      className="absolute inset-y-0 left-0 bg-[#ffd9a8]"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%', transition: { duration: AUTO_HOP_MS / 1000, ease: 'linear' } }}
                    />
                  )}
                </span>
              ))}
            </div>
            <div className="flex justify-between font-mono text-[0.6rem] tracking-[0.15em] text-white/60">
              <span><span className="text-red-400">●</span> THE WANDERER · {String(pos + 1).padStart(2, '0')}/{String(list.length).padStart(2, '0')}</span>
              <span>{timecode(clock)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {d && (
          <motion.article
            key={d.id}
            data-card
            data-ui
            data-testid="travel-postcard"
            className="pointer-events-auto absolute top-[24vh] right-6 w-[min(23rem,calc(100vw-3rem))] rounded-sm bg-[#fbf6ee] p-3 text-[#2b1f22] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:top-[27vh] sm:right-[5vw]"
            initial={{ opacity: 0, x: 60, rotate: 7, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, rotate: 1.5, scale: 1, transition: { delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, x: -40, rotate: -4, transition: { duration: 0.35 } }}
          >
            <div className="relative aspect-[3/2] overflow-hidden rounded-sm bg-[linear-gradient(160deg,#9fc3e6,#e9eef3_55%,#7d8f84)]">
              {d.photo && (
                <motion.img
                  src={d.photo}
                  alt={`${d.name}, ${d.region}`}
                  className="h-full w-full object-cover"
                  // a slow Ken Burns drift keeps the photo alive while she reads
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1, transition: { duration: 7, ease: 'easeOut' } }}
                />
              )}
              <span className="absolute top-2 right-2 rounded-sm bg-[#fbf6ee]/85 px-1.5 py-0.5 font-grotesk text-[0.5rem] tracking-[0.2em] uppercase">
                {d.visited ? 'Been here' : 'On her list'}
              </span>
              <span className="absolute bottom-2 left-2 font-grotesk text-[0.55rem] tracking-[0.25em] text-white uppercase [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
                {pos + 1} / {list.length}
              </span>
            </div>
            <p className="mt-3 font-grotesk text-[0.55rem] tracking-[0.3em] uppercase opacity-60">
              {d.region} · {d.category}
            </p>
            <h2 className="font-serif text-2xl italic">{d.name}</h2>
            <p className="mt-1 font-serif text-[0.95rem] leading-snug">{d.note}</p>
            <div className="mt-3 flex items-center justify-between font-grotesk text-[0.55rem] tracking-[0.2em] uppercase">
              <span className="opacity-60">From {travel.home.name}</span>
              <button type="button" onClick={() => toggleDream(d.id)} className="rounded-full border border-[#2b1f22]/30 px-3 py-1.5 hover:bg-[#2b1f22]/10">
                {dreams.includes(d.id) ? '♥ In dreams' : '♡ Add to dreams'}
              </button>
            </div>
            {d.credit && <p className="mt-2 truncate font-grotesk text-[0.45rem] tracking-[0.08em] opacity-45" title={d.credit}>{d.credit}</p>}
          </motion.article>
        )}
      </AnimatePresence>
    </ChapterShell>
  );
}
