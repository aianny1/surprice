'use client';

import { lazy, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ChapterShell } from '@/engine/ui/ChapterShell';
import { AmbientScene } from '@/engine/stage/AmbientScene';
import { useBackGate, useScrollStepper } from '@/engine/ui/ScrollAdvance';
import { memories, type Memory } from '@/data/memories';

const Scene = lazy(async () => ({
  default: () => <AmbientScene id="memories" bg="#120d0a" dust="#ffd6a0" keyColor="#ffe2c0" fill="#ff9fb8" />,
}));

const TILT = [-7, 4, -3, 6, -5, 3, -6, 5];
const N = memories.items.length;
const spring = { type: 'spring', stiffness: 120, damping: 20, mass: 0.9 } as const;

function Photo({ m, i, big }: { m: Memory; i: number; big?: boolean }) {
  return (
    <div className="aspect-square overflow-hidden bg-[linear-gradient(135deg,#d9c7b8,#b89a8e_60%,#8c7a8f)]">
      {m.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.photo} alt={m.caption} className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full items-center justify-center font-serif text-white/60 italic ${big ? 'text-8xl' : 'text-4xl'}`}>{i + 1}</div>
      )}
    </div>
  );
}

/**
 * Chapter 08 · Friendship Memories.
 * Scrolling lifts one polaroid at a time out of the pile: it grows to the centre with its note,
 * then the next scroll sends it back to its place as the next one rises.
 */
export default function MemoriesChapter() {
  // -1 = the pile, 0..N-1 = that photo is up close, N = all seen (scroll on to the finale)
  const [focus, setFocus] = useState(-1);
  const ref = useRef(focus);
  ref.current = focus;
  useScrollStepper({ min: -1, max: N, get: () => ref.current, set: setFocus, restMs: 1000 });
  useBackGate(() => ref.current === -1);
  const cur = focus >= 0 && focus < N ? memories.items[focus] : null;

  return (
    <ChapterShell
      id="memories"
      scene={<Scene />}
      heading={memories.heading}
      cta={memories.continueLabel}
      canAdvance={focus === N}
      cueLabel={focus === N ? undefined : focus < 0 ? 'Scroll to look closer' : `Scroll · next memory (${focus + 1} / ${N})`}
    >
      <LayoutGroup>
        <div data-ui className="absolute inset-x-0 top-[30vh] bottom-[16vh] flex flex-wrap content-center items-center justify-center gap-4 px-4 sm:gap-8">
          {memories.items.map((m, i) => (
            <motion.button
              key={i}
              type="button"
              data-reveal
              data-testid={`memory-${i}`}
              onClick={() => setFocus(i)}
              className="pointer-events-auto"
              style={{ rotate: TILT[i % TILT.length] }}
              animate={{ y: [0, -8, 0], opacity: focus === i ? 0 : focus >= 0 && focus < N ? 0.45 : 1 }}
              transition={{ y: { duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }, opacity: { duration: 0.4 } }}
              whileHover={{ scale: 1.06, rotate: 0 }}
            >
              {focus !== i && (
                <motion.div layoutId={`mem-${i}`} transition={spring} className="w-32 bg-[#fbf7f0] p-2 pb-7 text-[#2b1f22] shadow-2xl sm:w-40">
                  <Photo m={m} i={i} />
                  <p className="mt-2 text-center font-serif text-sm italic">{m.caption}</p>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        {/* the photo up close */}
        <AnimatePresence>
          {cur && (
            <motion.div
              key="stage"
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/35 px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <motion.div
                layoutId={`mem-${focus}`}
                transition={spring}
                data-testid="memory-focus"
                className="pointer-events-auto w-[min(26rem,82vw)] bg-[#fbf7f0] p-4 pb-6 text-[#2b1f22] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
                style={{ rotate: 0 }}
                onClick={() => setFocus(-1)}
              >
                <Photo m={cur} i={focus} big />
                <p className="mt-3 font-serif text-2xl italic">{cur.caption}</p>
                <p className="mt-1 font-serif leading-snug">{cur.message}</p>
                <p className="mt-3 font-grotesk text-[0.55rem] tracking-[0.3em] uppercase opacity-50">
                  {focus + 1} / {N}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </ChapterShell>
  );
}
