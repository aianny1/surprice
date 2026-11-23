'use client';

import { lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChapterShell } from '@/engine/ui/ChapterShell';
import { backGate, useScrollDelta } from '@/engine/ui/ScrollAdvance';
import { film } from '@/data/film';
import { FRAMES, REEL_PHOTOS, frontFrame, reel } from './reel';

const FilmScene = lazy(() => import('./FilmScene'));
const LEN = 80;
const TURN = Math.PI * 2;
/** Radians of reel per pixel of scroll (one full turn ≈ 3000 px). */
const REEL_PER_PX = TURN / 3000;

function timecode(f: number) {
  const s = Math.floor(f / 24);
  return `00:00:${String(s).padStart(2, '0')}:${String(f % 24).padStart(2, '0')}`;
}

/** Chapter 06 · The Video Editor: an editing suite inside a turning film reel. */
export default function FilmChapter() {
  const [frame, setFrame] = useState(0);
  const [active, setActive] = useState(0);
  const [front, setFront] = useState(0);
  const [turned, setTurned] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % (LEN * 12)), 1000 / 24);
    return () => clearInterval(id);
  }, []);

  // scrolling rolls the reel; each frame that passes the lens lands on the program monitor
  useScrollDelta((px) => {
    reel.target = Math.min(TURN, Math.max(0, reel.target + px * REEL_PER_PX));
    setFront(frontFrame(reel.target));
    setTurned(reel.target / TURN);
  });
  useEffect(() => {
    const gate = () => reel.target <= 0.01;
    backGate.fn = gate;
    return () => {
      if (backGate.fn === gate) backGate.fn = null;
    };
  }, []);

  const rolled = turned >= 0.999;
  const head = (frame / (LEN * 12)) * 100;
  const p = film.projects[active];
  const shot = REEL_PHOTOS[front % REEL_PHOTOS.length];

  return (
    <ChapterShell
      id="film"
      scene={<FilmScene />}
      heading={film.heading}
      cta={film.continueLabel}
      canAdvance={rolled}
      cueLabel={rolled ? undefined : `Scroll to roll the reel · ${front + 1} / ${FRAMES}`}
      headingClass="sm:text-[clamp(1.5rem,3vw,2.6rem)]"
    >
      <div data-ui className="absolute inset-x-0 top-[44vh] bottom-[15vh] mx-auto flex max-w-5xl flex-col gap-3 overflow-y-auto px-4 sm:top-[46vh]">
        <div data-reveal className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.3fr]">
          <ul className="space-y-2">
            {film.projects.map((x, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`pointer-events-auto w-full rounded-lg border px-4 py-2.5 text-left backdrop-blur-md transition-colors ${i === active ? 'border-[#ffb36b]/70 bg-white/10' : 'border-white/15 bg-black/40 hover:bg-white/5'}`}
                >
                  <span className="block font-serif text-lg italic">{x.title}</span>
                  <span className="font-grotesk text-[0.55rem] tracking-[0.25em] uppercase opacity-60">
                    {x.role} · {x.year}
                    {x.placeholder && ' · placeholder'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="relative aspect-video overflow-hidden rounded-lg border border-white/15 bg-black/70">
            {/* program monitor: the frame in front of the lens, or her project thumbnail */}
            <AnimatePresence mode="popLayout">
              <motion.img
                key={p.thumb ?? shot.src}
                src={p.thumb ?? shot.src}
                alt={p.thumb ? p.title : shot.name}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.5 } }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <span className="absolute top-2 left-3 font-grotesk text-[0.55rem] tracking-[0.25em] text-red-400 uppercase">● Program</span>
            <span className="absolute bottom-2 left-3 font-serif text-lg italic">{p.thumb ? p.title : shot.name}</span>
            <span className="absolute right-3 bottom-2 font-mono text-xs opacity-80">{timecode(frame)}</span>
          </div>
        </div>

        <div data-reveal className="relative rounded-lg border border-white/15 bg-black/55 p-2 backdrop-blur-md" aria-hidden>
          {film.tracks.map((t) => (
            <div key={t.name} className="flex items-center gap-2 py-0.5">
              <span className="w-6 font-mono text-[0.6rem] opacity-60">{t.name}</span>
              <div className="relative h-5 flex-1">
                {t.clips.map(([s, l, n]) => (
                  <span
                    key={n}
                    className={`absolute inset-y-0 truncate rounded-sm px-1 font-grotesk text-[0.5rem] leading-5 ${t.name.startsWith('V') ? 'bg-[#6f8cff]/60' : 'bg-[#5fd39a]/50'}`}
                    style={{ left: `${(s / LEN) * 100}%`, width: `${(l / LEN) * 100}%` }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <span className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `calc(2rem + (100% - 2.5rem) * ${head / 100})` }} />
          {/* reel progress under the tracks */}
          <span className="absolute right-2 bottom-0 left-8 h-0.5 bg-white/10">
            <span className="block h-full bg-[#ffb36b]" style={{ width: `${turned * 100}%` }} />
          </span>
        </div>
      </div>
    </ChapterShell>
  );
}
