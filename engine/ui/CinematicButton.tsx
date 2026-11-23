'use client';

import { motion, useMotionValue, useSpring } from 'motion/react';
import { forwardRef, type ReactNode } from 'react';

/**
 * Magnetic call-to-action (ANIMATION_SYSTEM.md §8).
 * Motion owns hover/press on the inner button; GSAP may animate the outer wrapper
 * (the ref) for entrances and exits without conflicting.
 */
export const CinematicButton = forwardRef<
  HTMLDivElement,
  { children: ReactNode; onClick(): void; disabled?: boolean; testId?: string; className?: string }
>(function CinematicButton({ children, onClick, disabled, testId, className = '' }, ref) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20 });
  const sy = useSpring(y, { stiffness: 260, damping: 20 });

  return (
    <div ref={ref} className={`invisible ${className}`}>
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onClick}
        data-testid={testId}
        style={{ x: sx, y: sy }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
          y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
        }}
        onPointerLeave={() => {
          x.set(0);
          y.set(0);
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        className="group relative isolate flex min-h-12 items-center gap-4 overflow-hidden rounded-full border border-lavender/45 px-9 py-4 font-grotesk text-[0.72rem] tracking-[0.42em] text-paper uppercase backdrop-blur-md transition-colors duration-500 hover:border-lavender disabled:pointer-events-none"
      >
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-violet/30 via-lavender/10 to-violet/30 opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute inset-0 -z-10 translate-y-full rounded-full bg-lavender/15 transition-transform duration-700 ease-out group-hover:translate-y-0" />
        <span className="h-1.5 w-1.5 rounded-full bg-lavender shadow-[0_0_12px_2px_rgba(201,182,255,0.8)]" />
        <span className="pl-[0.42em]">{children}</span>
      </motion.button>
    </div>
  );
});
