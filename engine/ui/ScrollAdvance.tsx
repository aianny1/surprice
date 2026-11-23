'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { gsap } from '@/animation/gsap';
import { useExperience } from '@/store/experience';
import { go } from '@/engine/transition/manager';
import { CHAPTERS, chapterById } from '@/engine/chapters';

/** Forward advances currently in progress (scroll-back waits until they are back at 0). */
const forwardBusy = new Set<object>();
/** A chapter with its own scroll story (Nature's walk, the finale) says when it is at its start. */
export const backGate: { fn: (() => boolean) | null } = { fn: null };

/**
 * Scroll is the site's "next" control. Wheel, touch swipe and ArrowDown/PageDown/Space all
 * push a progress value 0 → 1; at 1 the chapter moves on. With `decay`, letting go for a moment
 * eases it back to 0 so a stray scroll never changes the page.
 */
export function useScrollAdvance(opts: {
  enabled: boolean;
  /** Pixels of scroll for a full advance. */
  distance?: number;
  decay?: boolean;
  onProgress?: (p: number) => void;
  onComplete: () => void;
}) {
  const o = useRef(opts);
  o.current = opts;
  const st = useRef({ p: 0, fired: false, idle: 0 as ReturnType<typeof setTimeout> | 0, tween: null as gsap.core.Tween | null });
  const [p, setP] = useState(0);

  // re-arm when it becomes enabled again (e.g. a new stage)
  useEffect(() => {
    if (opts.enabled) {
      st.current.fired = false;
      st.current.p = 0;
      setP(0);
    }
  }, [opts.enabled]);

  useEffect(() => {
    const s = st.current;
    const set = (v: number) => {
      s.p = v;
      if (v > 0) forwardBusy.add(s);
      else forwardBusy.delete(s);
      setP(v);
      o.current.onProgress?.(v);
    };
    const push = (px: number, target: EventTarget | null) => {
      if (!o.current.enabled || s.fired || useExperience.getState().phase !== 'idle') return;
      if (scrollsInside(target as Element | null, px)) return;
      if (px < 0 && s.p === 0) return; // upward scroll at rest belongs to scroll-back
      s.tween?.kill();
      const v = Math.min(1, Math.max(0, s.p + px / (o.current.distance ?? 900)));
      set(v);
      if (v >= 1) {
        s.fired = true;
        o.current.onComplete();
        return;
      }
      if (o.current.decay) {
        clearTimeout(s.idle);
        s.idle = setTimeout(() => {
          const obj = { v: s.p };
          s.tween = gsap.to(obj, { v: 0, duration: 0.9, ease: 'power2.inOut', onUpdate: () => set(obj.v) });
        }, 900);
      }
    };
    const wheel = (e: WheelEvent) => push(e.deltaY, e.target);
    let y: number | null = null;
    const ts = (e: TouchEvent) => (y = e.touches[0]?.clientY ?? null);
    const tm = (e: TouchEvent) => {
      const ny = e.touches[0]?.clientY;
      if (ny == null || y == null) return;
      push((y - ny) * 2.2, e.target);
      y = ny;
    };
    const key = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) push(140, null);
      if (['ArrowUp', 'PageUp'].includes(e.key)) push(-140, null);
    };
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('keydown', key);
      clearTimeout(s.idle);
      s.tween?.kill();
      forwardBusy.delete(s);
    };
  }, []);

  return p;
}

/** True when the event happened inside a panel that can still scroll that way by itself. */
function scrollsInside(el: Element | null, dir: number) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) {
      return dir > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 2 : n.scrollTop > 2;
    }
  }
  return false;
}

/**
 * Global scroll-back: scrolling up while a chapter is at its start fills a ring at the top;
 * when it is full the previous chapter returns with the rewind ("B-back") transition.
 */
export function ScrollBack() {
  const current = useExperience((st) => st.current);
  const phase = useExperience((st) => st.phase);
  const prev = current ? CHAPTERS.find((c) => c.order === chapterById(current).order - 1) ?? null : null;
  const [b, setB] = useState(0);
  const st = useRef({ b: 0, idle: 0 as ReturnType<typeof setTimeout> | 0, tween: null as gsap.core.Tween | null, fired: false });
  const prevRef = useRef(prev);
  prevRef.current = prev;

  useEffect(() => {
    st.current.fired = false;
    st.current.b = 0;
    setB(0);
  }, [current]);

  useEffect(() => {
    const s = st.current;
    const set = (v: number) => {
      s.b = v;
      setB(v);
    };
    const push = (px: number, target: EventTarget | null) => {
      const p = prevRef.current;
      if (!p || s.fired || useExperience.getState().phase !== 'idle') return;
      if (px > 0) {
        if (s.b > 0) set(Math.max(0, s.b - px / 500));
        return;
      }
      if (forwardBusy.size || (backGate.fn && !backGate.fn()) || scrollsInside(target as Element | null, -1)) return;
      s.tween?.kill();
      const v = Math.min(1, s.b - px / 700);
      set(v);
      if (v >= 1) {
        s.fired = true;
        void go(p.id);
        return;
      }
      clearTimeout(s.idle);
      s.idle = setTimeout(() => {
        const o = { v: s.b };
        s.tween = gsap.to(o, { v: 0, duration: 0.8, ease: 'power2.inOut', onUpdate: () => set(o.v) });
      }, 900);
    };
    const wheel = (e: WheelEvent) => push(e.deltaY, e.target);
    let y: number | null = null;
    const ts = (e: TouchEvent) => (y = e.touches[0]?.clientY ?? null);
    const tm = (e: TouchEvent) => {
      const ny = e.touches[0]?.clientY;
      if (ny == null || y == null) return;
      push((y - ny) * 2.2, e.target);
      y = ny;
    };
    const key = (e: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp'].includes(e.key)) push(-140, null);
    };
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('keydown', key);
      clearTimeout(s.idle);
      s.tween?.kill();
    };
  }, []);

  if (!prev) return null;
  const C = 2 * Math.PI * 14;
  return (
    <div
      aria-hidden={b === 0}
      data-testid="scroll-back"
      className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[65] flex flex-col items-center gap-1.5 font-grotesk text-[0.55rem] tracking-[0.35em] text-white/80 uppercase transition-opacity duration-300 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]"
      style={{ opacity: phase === 'idle' && b > 0.02 ? 1 : 0 }}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - b)} />
      </svg>
      <span>↑ Back to {prev.title}</span>
    </div>
  );
}

/** The scroll hint: a label and a mouse icon ringed by the advance progress. */
export const ScrollCue = forwardRef<HTMLDivElement, { label: string; p: number; className?: string; testId?: string }>(
  function ScrollCue({ label, p, className = '', testId }, ref) {
    const C = 2 * Math.PI * 22;
    return (
      <div
        ref={ref}
        data-ui
        data-testid={testId}
        className={`pointer-events-none invisible absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] flex flex-col items-center gap-2 text-center font-grotesk text-[0.6rem] tracking-[0.4em] uppercase sm:bottom-[6vh] ${className}`}
      >
        <span className="[text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">{label}</span>
        <span aria-hidden className="relative block h-12 w-12">
          <svg viewBox="0 0 50 50" className="absolute inset-0 -rotate-90">
            <circle cx="25" cy="25" r="22" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
            <circle cx="25" cy="25" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
          </svg>
          <span className="absolute top-1/2 left-1/2 block h-6 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-80">
            <span className="absolute top-1 left-1/2 block h-1.5 w-0.5 -translate-x-1/2 animate-[scrollcue_1.6s_ease-in-out_infinite] rounded-full bg-current" />
          </span>
        </span>
      </div>
    );
  },
);

/**
 * Raw scroll input (wheel, swipe, arrow keys) in pixels, for chapters that turn scrolling into
 * their own motion (stepping through places, rolling a film reel). Positive = down.
 */
export function useScrollDelta(cb: (px: number) => void, enabled = true) {
  const o = useRef({ cb, enabled });
  o.current = { cb, enabled };
  useEffect(() => {
    const push = (px: number, target: EventTarget | null) => {
      if (!o.current.enabled || useExperience.getState().phase !== 'idle') return;
      if (scrollsInside(target as Element | null, px)) return;
      o.current.cb(px);
    };
    const wheel = (e: WheelEvent) => push(e.deltaY, e.target);
    let y: number | null = null;
    const ts = (e: TouchEvent) => (y = e.touches[0]?.clientY ?? null);
    const tm = (e: TouchEvent) => {
      const ny = e.touches[0]?.clientY;
      if (ny == null || y == null) return;
      push((y - ny) * 2.2, e.target);
      y = ny;
    };
    const key = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) push(200, null);
      if (['ArrowUp', 'PageUp'].includes(e.key)) push(-200, null);
    };
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('keydown', key);
    };
  }, []);
}

/**
 * Scroll that moves one item at a time through `min..max` (e.g. -1 = overview, 0..n-1 = items).
 * Upward scroll at `min` is left for scroll-back; downward at `max` is left for the chapter's advance.
 */
export function useScrollStepper(opts: { min: number; max: number; get: () => number; set: (i: number) => void; px?: number; restMs?: number }) {
  const o = useRef(opts);
  o.current = opts;
  const acc = useRef(0);
  const last = useRef(0);
  useScrollDelta((px) => {
    const { min, max, get, set } = o.current;
    const cur = get();
    if ((px > 0 && cur >= max) || (px < 0 && cur <= min)) return;
    acc.current += px;
    if (performance.now() - last.current < (o.current.restMs ?? 900) || Math.abs(acc.current) < (o.current.px ?? 160)) return;
    const dir = Math.sign(acc.current);
    acc.current = 0;
    last.current = performance.now();
    set(Math.min(max, Math.max(min, cur + dir)));
  });
}

/** Registers a scroll-back gate for the lifetime of the calling chapter. */
export function useBackGate(gate: () => boolean) {
  const g = useRef(gate);
  g.current = gate;
  useEffect(() => {
    const fn = () => g.current();
    backGate.fn = fn;
    return () => {
      if (backGate.fn === fn) backGate.fn = null;
    };
  }, []);
}
