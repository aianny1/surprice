'use client';

import { type ReactNode, Suspense, useEffect, useRef } from 'react';
import { gsap, useGSAP } from '@/animation/gsap';
import { fadeOut, maskLines, wordStagger } from '@/animation/text';
import { SceneIn } from '@/engine/stage/tunnel';
import { ScrollCue, useScrollAdvance } from '@/engine/ui/ScrollAdvance';
import { rig } from '@/engine/stage/rig';
import { go, registerHandles } from '@/engine/transition/manager';
import { chapterById, nextChapter, TOTAL_CHAPTERS, type ChapterId } from '@/engine/chapters';
import type { EnterMode } from '@/engine/transition/transitions';
import { useExperience } from '@/store/experience';

type TL = gsap.core.Timeline;

/**
 * Shared DOM layer for the later chapters: chapter mark + heading reveal, the 3D scene tunnel,
 * a continue button and the engine handles. Chapters add their own content as children;
 * anything with `data-reveal` fades up after the heading, anything with `data-ui` steps aside on exit.
 */
export function ChapterShell({
  id,
  scene,
  heading,
  children,
  cta,
  onCta,
  onEnter,
  exits,
  tone = 'light',
  headingClass = '',
  canAdvance = true,
  cueLabel,
}: {
  id: ChapterId;
  scene?: ReactNode;
  heading: string;
  children?: ReactNode;
  cta?: string;
  onCta?: () => void;
  /** Scene-side entrance (camera moves etc.), added at t=0. */
  onEnter?: (mode: EnterMode) => TL | void;
  exits?: Record<string, () => TL>;
  tone?: 'light' | 'dark';
  headingClass?: string;
  /** False while the chapter still has its own scroll story to tell (Travel's places, Film's reel). */
  canAdvance?: boolean;
  /** Overrides the scroll hint text (e.g. while the chapter steps through its own content). */
  cueLabel?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const eyebrow = useRef<HTMLParagraphElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const btn = useRef<HTMLDivElement>(null);
  const cb = useRef({ onEnter, exits });
  cb.current = { onEnter, exits };
  const { contextSafe } = useGSAP({ scope: root });
  const meta = chapterById(id);
  const next = nextChapter(id);

  useEffect(() => {
    const enter = contextSafe((mode: EnterMode) => {
      const reduced = useExperience.getState().reducedMotion;
      const tl = gsap.timeline();
      const s = cb.current.onEnter?.(mode);
      if (s) tl.add(s, 0);
      const t = mode === 'rewind' ? 0.4 : 0.9;
      tl.add(wordStagger(eyebrow.current!, { reduced, duration: 1 }), t);
      tl.add(maskLines(head.current!, { reduced, duration: 1.4, stagger: 0.16 }), t + 0.3);
      const reveal = root.current!.querySelectorAll('[data-reveal]');
      if (reveal.length)
        tl.fromTo(reveal, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }, '>-0.6');
      if (btn.current) tl.fromTo(btn.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '>-0.5');
      return tl;
    }) as (mode: EnterMode) => TL;
    const exits: Record<string, () => TL> = {
      stepAside: contextSafe(() => fadeOut(root.current!.querySelectorAll('[data-ui]'), 0.5)) as () => TL,
    };
    for (const [k, fn] of Object.entries(cb.current.exits ?? {})) {
      exits[k] = contextSafe(() => {
        const tl = gsap.timeline();
        tl.add(fadeOut(root.current!.querySelectorAll('[data-ui]'), 0.5), 0);
        tl.add(fn(), 0);
        return tl;
      }) as () => TL;
    }
    return registerHandles(id, { enter, exits });
  }, [contextSafe, id]);

  const ink = tone === 'light' ? 'text-[#fff4e8]' : 'text-[#2b1f22]';
  const proceed = () => {
    if (onCta) onCta();
    else if (next) void go(next.id);
  };
  // scroll to move on: the page leans in (camera zooms, the interface lifts toward the lens)
  const baseFov = useRef<number | null>(null);
  const p = useScrollAdvance({
    enabled: canAdvance && !!cta && !!(next || onCta),
    decay: true,
    onComplete: proceed,
    onProgress: (v) => {
      if (v > 0 && baseFov.current === null) baseFov.current = rig.fov;
      if (baseFov.current !== null) rig.fov = baseFov.current * (1 - v * 0.3);
      if (v === 0) baseFov.current = null;
      const r = root.current;
      if (r) {
        r.style.transform = v ? `scale(${1 + v * 0.08})` : '';
        r.querySelectorAll<HTMLElement>('header,[data-reveal]').forEach((el) => (el.style.opacity = v ? String(1 - v * 0.85) : ''));
      }
    },
  });

  return (
    <div ref={root} className={`chapter-layer fixed inset-0 ${ink}`} data-chapter={id}>
      {scene && (
        <SceneIn id={id}>
          <Suspense fallback={null}>{scene}</Suspense>
        </SceneIn>
      )}
      <header data-ui className="pointer-events-none absolute inset-x-0 top-[9vh] flex flex-col items-center px-6 text-center">
        <p ref={eyebrow} className="invisible font-grotesk text-[0.62rem] tracking-[0.45em] uppercase opacity-70">
          {String(meta.order).padStart(2, '0')} / {String(TOTAL_CHAPTERS).padStart(2, '0')} · {meta.title}
        </p>
        <h1
          ref={head}
          className={`invisible mt-4 max-w-4xl font-serif text-[clamp(1.6rem,4.2vw,3.4rem)] leading-[1.08] tracking-tight ${headingClass}`}
        >
          {heading}
        </h1>
      </header>
      {children}
      {cta && (next || onCta) && <ScrollCue ref={btn} p={p} label={cueLabel ?? `Scroll · ${cta}`} testId={`${id}-continue`} />}
    </div>
  );
}

/** Small pill used by several chapters (filters, toggles). */
export function Pill({ active, onClick, children }: { active?: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pointer-events-auto rounded-full border px-4 py-2 font-grotesk text-[0.6rem] tracking-[0.28em] uppercase backdrop-blur-md transition-colors ${
        active ? 'border-white/70 bg-white/25' : 'border-white/25 bg-black/20 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
