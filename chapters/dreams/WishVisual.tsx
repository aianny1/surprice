'use client';

import { motion } from 'motion/react';
import type { Wish } from '@/data/dreams';
import { travel } from '@/data/travel';
import { person } from '@/data/person';

/** Licence credits for the photos a wish uses (they come from the Travel chapter). */
export function creditsFor(photos: string[]) {
  const c = photos.map((p) => travel.destinations.find((d) => d.photo === p)?.credit).filter(Boolean) as string[];
  return [...new Set(c)].join(' / ');
}

const SKETCH = 'grayscale(1) contrast(1.08) brightness(1.06) sepia(0.28)';

/** The picture at the top of a wish card, styled to match the wish. */
export function WishVisual({ w }: { w: Wish }) {
  if (w.style === 'storyboard') {
    // an animator's storyboard: pencil-toned panels with shot numbers and a camera note
    return (
      <div className="grid grid-cols-3 gap-2 bg-[#efe8dc] p-3">
        {w.photos.map((src, k) => (
          <motion.figure
            key={src}
            className="relative bg-white p-1 shadow-sm"
            initial={{ opacity: 0, y: 12, rotate: k % 2 ? 1.5 : -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: k % 2 ? 1 : -1, transition: { delay: 0.25 + k * 0.25, duration: 0.6 } }}
          >
            <img src={src} alt="" className="aspect-[4/3] w-full object-cover" style={{ filter: SKETCH }} />
            <figcaption className="mt-1 flex justify-between font-mono text-[0.5rem] text-[#3a2f2a]/70">
              <span>SC 01 · SH {String(k + 1).padStart(2, '0')}</span>
              <span>{['wide', 'pan →', 'close'][k] ?? ''}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    );
  }

  if (w.style === 'credits') {
    // a cinematic frame with letterbox bars and her name rolling up the screen
    const lines = ['A FILM BY', person.name.display.toUpperCase(), '', 'DIRECTED · ANIMATED · EDITED', person.name.display.toUpperCase(), '', 'COLOUR BY', person.name.display.toUpperCase()];
    return (
      <div className="relative h-44 overflow-hidden bg-black sm:h-52">
        <motion.img
          src={w.photos[0]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1, transition: { duration: 8, ease: 'easeOut' } }}
        />
        <div className="absolute inset-x-0 top-0 h-[14%] bg-black" />
        <div className="absolute inset-x-0 bottom-0 h-[14%] bg-black" />
        <motion.div
          className="absolute inset-x-0 top-full flex flex-col items-center gap-1 text-center font-grotesk text-[0.6rem] tracking-[0.4em] text-white"
          animate={{ y: ['0%', '-260%'] }}
          transition={{ duration: 9, ease: 'linear', repeat: Infinity, delay: 0.4 }}
        >
          {lines.map((l, k) =>
            l === person.name.display.toUpperCase() ? (
              <span key={k} className="font-serif text-2xl tracking-[0.25em] italic">{l}</span>
            ) : (
              <span key={k} className="opacity-75">{l || ' '}</span>
            ),
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.img
      src={w.photos[0]}
      alt=""
      className="h-44 w-full object-cover sm:h-52"
      initial={{ scale: 1.12 }}
      animate={{ scale: 1, transition: { duration: 7, ease: 'easeOut' } }}
    />
  );
}
