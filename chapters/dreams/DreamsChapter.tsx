'use client';

import { lazy, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChapterShell } from '@/engine/ui/ChapterShell';
import { useBackGate, useScrollStepper } from '@/engine/ui/ScrollAdvance';
import { sfx } from '@/engine/audio/AudioManager';
import { dreams } from '@/data/dreams';
import { lanterns } from './lanterns';
import { creditsFor, WishVisual } from './WishVisual';

const DreamsScene = lazy(() => import('./DreamsScene'));
const N = dreams.wishes.length;

/** Chapter 07 · Her Dreams: one wish per scroll, each one sends a lantern up into the night. */
export default function DreamsChapter() {
  const [i, setI] = useState(-1);
  const ref = useRef(i);
  ref.current = i;
  useScrollStepper({
    min: -1,
    max: N - 1,
    get: () => ref.current,
    set: (n) => {
      if (n > ref.current) {
        lanterns.release();
        sfx.play('shimmer');
      }
      setI(n);
    },
  });
  useBackGate(() => ref.current === -1);
  const w = i >= 0 ? dreams.wishes[i] : null;

  return (
    <ChapterShell
      id="dimension"
      scene={<DreamsScene />}
      heading={dreams.heading}
      cta={dreams.continueLabel}
      canAdvance={i === N - 1}
      cueLabel={i === N - 1 ? undefined : i < 0 ? 'Scroll to light the first lantern' : `Scroll · next wish (${i + 1} / ${N})`}
    >
      <div data-ui className="pointer-events-none absolute inset-x-0 top-[30vh] bottom-[18vh] flex items-center justify-center px-5">
        <AnimatePresence mode="wait">
          {w ? (
            <motion.article
              key={i}
              data-testid="dream-card"
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#ffd9a0]/25 bg-[#120f24]/60 text-center shadow-[0_0_80px_rgba(255,170,90,0.18)] backdrop-blur-xl"
              initial={{ opacity: 0, y: 40, scale: 0.94, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, y: -50, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.45 } }}
            >
              <WishVisual w={w} />
              <div className="px-7 py-7 sm:px-9">
                <p className="font-grotesk text-[0.58rem] tracking-[0.4em] text-[#ffcf8a] uppercase">
                  Wish {String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[#fff4e8] italic sm:text-4xl">{w.title}</h2>
                <p className="mt-3 font-serif text-lg leading-snug text-[#fff4e8]/85">{w.line}</p>
                {creditsFor(w.photos) && (
                  <p className="mt-4 truncate font-grotesk text-[0.45rem] tracking-[0.08em] text-[#fff4e8]/35" title={creditsFor(w.photos)}>
                    {creditsFor(w.photos)}
                  </p>
                )}
              </div>
            </motion.article>
          ) : (
            <motion.p
              key="intro"
              data-reveal
              className="max-w-md text-center font-serif text-xl text-[#fff4e8]/80 italic"
              exit={{ opacity: 0, y: -20 }}
            >
              A few wishes for you. Each one gets its own lantern.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </ChapterShell>
  );
}
