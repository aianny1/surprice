'use client';

import { lazy, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gsap } from '@/animation/gsap';
import { ChapterShell, Pill } from '@/engine/ui/ChapterShell';
import { backGate, useScrollDelta } from '@/engine/ui/ScrollAdvance';
import { sfx } from '@/engine/audio/AudioManager';
import { travel, type TravelCategory } from '@/data/travel';
import { travelScene, useTravel } from './state';

const TravelScene = lazy(() => import('./TravelScene'));
const CATS = [...new Set(travel.destinations.map((d) => d.category))] as TravelCategory[];
/** Scroll needed for one hop, and the rest between hops (the flight itself takes ~2.5 s). */
const STEP_PX = 180;
const STEP_REST_MS = 1300;

/** Chapter 04 · The Wanderer: scrolling flies her from place to place. */
export default function TravelChapter() {
  const { selected, filter, dreams, select, setFilter, toggleDream } = useTravel();
  const d = selected != null ? travel.destinations[selected] : null;
  const list = travel.destinations.map((x, i) => ({ ...x, i })).filter((x) => !filter || x.category === filter);
  const pos = selected == null ? -1 : list.findIndex((x) => x.i === selected);
  const atLast = pos === list.length - 1;

  // scroll steps through the (filtered) places one by one
  const acc = useRef(0);
  const lastStep = useRef(0);
  useScrollDelta((px) => {
    const st = useTravel.getState();
    const l = travel.destinations.map((x, i) => ({ ...x, i })).filter((x) => !st.filter || x.category === st.filter);
    const cur = st.selected == null ? -1 : l.findIndex((x) => x.i === st.selected);
    if (px > 0 && cur === l.length - 1) return; // the last place hands over to TAKE OFF
    if (px < 0 && cur === -1) return; // the overview hands over to scroll-back
    acc.current += px;
    if (performance.now() - lastStep.current < STEP_REST_MS || Math.abs(acc.current) < STEP_PX) return;
    const dir = Math.sign(acc.current);
    acc.current = 0;
    lastStep.current = performance.now();
    const next = cur + dir;
    st.select(next < 0 ? null : l[Math.min(next, l.length - 1)].i);
    sfx.play('whoosh');
  });

  // scroll-back to Nature only from the globe overview
  useEffect(() => {
    const gate = () => useTravel.getState().selected == null;
    backGate.fn = gate;
    return () => {
      if (backGate.fn === gate) backGate.fn = null;
    };
  }, []);

  return (
    <ChapterShell
      id="travel"
      scene={<TravelScene />}
      heading={travel.heading}
      cta={travel.continueLabel}
      canAdvance={atLast}
      cueLabel={atLast ? undefined : pos < 0 ? 'Scroll to start the journey' : `Scroll · next place (${pos + 1} / ${list.length})`}
      onEnter={(m) => travelScene.api?.arrive(m)}
      exits={{ takeOff: () => travelScene.api?.takeOff() ?? gsap.timeline() }}
    >
      <div data-ui className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] flex flex-col items-center gap-3 px-4 sm:bottom-[16vh]">
        <div data-reveal className="flex flex-wrap justify-center gap-2">
          <Pill active={!filter} onClick={() => setFilter(null)}>All</Pill>
          {CATS.map((c) => (
            <Pill key={c} active={filter === c} onClick={() => setFilter(filter === c ? null : c)}>{c}</Pill>
          ))}
        </div>
        <ul data-reveal className="flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-1" aria-label="Places">
          {list.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => select(x.i)}
                data-testid={`place-${x.id}`}
                className={`pointer-events-auto font-serif text-sm italic transition-opacity ${selected === x.i ? 'opacity-100 underline' : 'opacity-60 hover:opacity-100'}`}
              >
                {x.name}
                {dreams.includes(x.id) && ' ♥'}
              </button>
            </li>
          ))}
        </ul>
      </div>

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
            <button type="button" onClick={() => select(null)} aria-label="Close postcard" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-[#2b1f22] text-[#fbf6ee]">
              ×
            </button>
          </motion.article>
        )}
      </AnimatePresence>

      <p data-ui data-reveal className="pointer-events-none absolute top-[31vh] inset-x-0 text-center font-grotesk text-[0.55rem] tracking-[0.35em] uppercase opacity-50">
        {selected == null ? `Scroll to fly through ${list.length} places · drag to spin` : `${dreams.length} in her dream list`}
      </p>
    </ChapterShell>
  );
}
