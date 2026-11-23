'use client';

import { lazy, useRef } from 'react';
import { gsap } from '@/animation/gsap';
import { ChapterShell } from '@/engine/ui/ChapterShell';
import { artist } from '@/data/artist';

const ArtistScene = lazy(() => import('./ArtistScene'));

/** Chapter 05 · The Artist: editorial split screen. */
export default function ArtistChapter() {
  const lens = useRef<HTMLDivElement>(null);
  return (
    <ChapterShell
      id="artist"
      scene={<ArtistScene />}
      heading={artist.heading}
      cta={artist.continueLabel}
      headingClass="sm:text-[clamp(1.6rem,3.2vw,2.8rem)]"
      // arriving from the clouds: the portrait opens like a lens iris
      onEnter={(m) =>
        m === 'light'
          ? gsap.timeline().fromTo(lens.current, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.8, ease: 'power3.inOut' }, 0.2)
          : undefined
      }
      exits={{ zoomLens: () => gsap.timeline().to(lens.current, { scale: 3, opacity: 0, duration: 1, ease: 'power2.in' }) }}
    >
      <div className="absolute inset-x-0 top-[30vh] bottom-[16vh] mx-auto grid max-w-5xl grid-cols-1 items-center gap-6 overflow-y-auto px-6 sm:top-[32vh] sm:grid-cols-2 sm:gap-12">
        <div ref={lens} data-ui className="mx-auto aspect-[4/5] w-[min(16rem,60vw)] overflow-hidden rounded-[50%/40%] border border-white/20 bg-[radial-gradient(circle_at_40%_35%,#f5c7a9,#a85f73_45%,#2a1830)] shadow-[0_0_80px_rgba(255,190,160,0.25)] sm:w-full sm:max-w-xs">
          {artist.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.portrait} alt="Megha" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-7xl text-white/70 italic">M</div>
          )}
        </div>
        <div data-ui className="space-y-4 text-center sm:text-left">
          {artist.lines.map((l) => (
            <p key={l} data-reveal className="font-serif text-lg leading-snug italic opacity-90 sm:text-xl">
              {l}
            </p>
          ))}
          <ul data-reveal className="flex flex-wrap justify-center gap-2 pt-2 sm:justify-start">
            {artist.toolkit.map((t) => (
              <li key={t} className="rounded-full border border-white/25 px-3 py-1 font-grotesk text-[0.55rem] tracking-[0.25em] uppercase opacity-80">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ChapterShell>
  );
}
