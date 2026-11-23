'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { overlayEls } from './overlay';
import { passGate } from './manager';
import { useExperience } from '@/store/experience';

/**
 * Persistent DOM transition layer (z-50) + input lock (z-60).
 * The dark cover starts opaque in the server HTML, so the first paint is black, never a flash of layout.
 */
export function OverlayLayer() {
  const light = useRef<HTMLDivElement>(null);
  const dawn = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const locked = useExperience((s) => s.locked);
  const gate = useExperience((s) => s.gate);
  const loadingVisible = useExperience((s) => s.loadingVisible);

  useEffect(() => {
    overlayEls.light = light.current;
    overlayEls.dawn = dawn.current;
    overlayEls.sky = sky.current;
    overlayEls.dark = dark.current;
    overlayEls.loader = loader.current;
  }, []);


  return (
    <>
      <div
        ref={light}
        className="pointer-events-none fixed inset-0 z-50 hidden opacity-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #ffffff 0%, #f4efff calc(var(--r, 0%) * 0.35), #e4daff calc(var(--r, 0%) * 0.7), #c9b6ff var(--r, 0%), #c9b6ff 100%)',
        }}
      />
      <div
        ref={dawn}
        className="pointer-events-none fixed inset-0 z-50 hidden opacity-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, #fffaf3 0%, #fdeee0 calc(var(--r, 0%) * 0.35), #f6d6c2 calc(var(--r, 0%) * 0.7), #e8c0b4 var(--r, 0%), #e8c0b4 100%)',
        }}
      />
      <div
        ref={sky}
        className="pointer-events-none fixed inset-0 z-50 hidden opacity-0"
        style={{
          background: [
            'radial-gradient(ellipse 38% 14% at 22% 30%, rgba(255,255,255,0.75), transparent 70%)',
            'radial-gradient(ellipse 30% 10% at 70% 22%, rgba(255,255,255,0.6), transparent 70%)',
            'radial-gradient(ellipse 45% 16% at 60% 62%, rgba(255,255,255,0.55), transparent 70%)',
            'radial-gradient(ellipse 26% 9% at 15% 74%, rgba(255,255,255,0.5), transparent 70%)',
            'linear-gradient(to bottom, #9fcdf4 0%, #c6def2 45%, #faf1e8 100%)',
          ].join(', '),
        }}
      />
      <div ref={dark} className="pointer-events-none fixed inset-0 z-50 bg-void" data-overlay="dark" />
      <div
        ref={loader}
        className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
        style={{ visibility: gate ? 'hidden' : undefined }}
        data-overlay="loader"
      >
        <span className="animate-pulse font-serif text-2xl text-lavender/80">✦</span>
        <span className="h-px w-24 overflow-hidden bg-white/10">
          <span className="block h-full w-full origin-left animate-[load_2.4s_ease-in-out_infinite] bg-lavender/70" />
        </span>
      </div>

      <AnimatePresence>
        {loadingVisible && (
          <motion.div
            className="pointer-events-none fixed inset-x-0 bottom-16 z-[55] text-center font-grotesk text-[0.7rem] tracking-[0.3em] text-lavender/70 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Preparing the next world…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input lock: swallows clicks/touches while a transition runs. */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ pointerEvents: locked && !gate ? 'auto' : 'none' }}
        data-input-lock={locked ? 'on' : 'off'}
      />


      <AnimatePresence>{gate && <Gate />}</AnimatePresence>
    </>
  );
}

function Gate() {
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      data-testid="gate"
    >
      <div className="max-w-md text-center">
        <p className="mb-4 font-grotesk text-[0.65rem] tracking-[0.35em] text-lavender/70 uppercase">Wait a second</p>
        <h2 id="gate-title" className="font-serif text-3xl leading-tight text-paper italic sm:text-4xl">
          This part of the story is better from the beginning.
        </h2>
        <div className="mt-10 flex flex-col items-center gap-4">
          <a
            href="/intro"
            className="rounded-full border border-lavender/60 px-8 py-3 font-grotesk text-xs tracking-[0.3em] text-paper uppercase hover:bg-lavender/10"
          >
            Start from the beginning
          </a>
          <button
            onClick={() => passGate()}
            className="font-grotesk text-[0.65rem] tracking-[0.3em] text-white/45 uppercase hover:text-white/80"
          >
            Show me anyway
          </button>
        </div>
      </div>
    </motion.div>
  );
}
