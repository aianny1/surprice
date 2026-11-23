'use client';

import { useEffect, useState } from 'react';
import { music } from '@/engine/audio/Music';
import { AnimatePresence, motion } from 'motion/react';
import { chapterByPath, TOTAL_CHAPTERS } from '@/engine/chapters';
import { usePathname } from 'next/navigation';
import { useExperience } from '@/store/experience';
import { sfx } from '@/engine/audio/AudioManager';
import { ScrollBack } from '@/engine/ui/ScrollAdvance';

/** Persistent UI chrome: chapter mark (bottom-left) and sound toggle (bottom-right). */
export function Chrome() {
  const pathname = usePathname();
  const chapter = chapterByPath(pathname);
  const phase = useExperience((s) => s.phase);
  const sound = useExperience((s) => s.sound);
  const setSound = useExperience((s) => s.setSound);
  const visible = phase !== 'booting' && phase !== 'awaitingReady';
  // browsers keep audio locked until the first tap/click/key (a mouse-wheel scroll doesn't count),
  // so until the music is actually playing, a quiet hint says how to start it
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (live) return;
    const id = setInterval(() => setLive(sfx.context?.state === 'running'), 500);
    return () => clearInterval(id);
  }, [live]);

  const startMusic = () => {
    sfx.unlock();
    music.start();
    setSound(true);
    setLive(sfx.context?.state === 'running');
  };

  return (
    <>
    <ScrollBack />
    {/* big, obvious "play music" button while the browser still has audio locked */}
    <AnimatePresence>
      {sound && !live && visible && (
        <motion.div
          key="play-music"
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.6 } }}
          exit={{ opacity: 0, y: -14, transition: { duration: 0.4 } }}
        >
          <motion.button
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[#ffd9a8]/70 bg-black/60 px-6 py-2.5 font-grotesk text-xs font-medium tracking-[0.25em] text-[#ffd9a8] uppercase backdrop-blur-md sm:px-7 sm:py-3 sm:text-sm"
            animate={{
              boxShadow: [
                '0 0 10px rgba(255,217,168,0.25)',
                '0 0 32px rgba(255,217,168,0.65)',
                '0 0 10px rgba(255,217,168,0.25)',
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startMusic}
            aria-label="Play music"
            data-testid="play-music"
          >
            <span aria-hidden className="text-base leading-none sm:text-lg">♪</span>
            Play music
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <AnimatePresence mode="wait">
        {visible && chapter && (
          <motion.p
            key={chapter.id}
            className="font-grotesk text-[0.6rem] tracking-[0.32em] whitespace-nowrap text-white/40 uppercase sm:text-[0.65rem]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.2, duration: 0.8 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            data-testid="chapter-mark"
          >
            <span className="text-lavender/80">{String(chapter.order).padStart(2, '0')}</span>
            <span className="mx-2 text-white/25">/</span>
            {String(TOTAL_CHAPTERS).padStart(2, '0')}
            {/* title only where there is room: on phones it wrapped into the CTA buttons */}
            <span className="hidden sm:inline">
              <span className="mx-3 inline-block h-px w-6 translate-y-[-0.2em] bg-white/25" />
              {chapter.title}
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1">
      <motion.button
        className="pointer-events-auto flex items-center gap-2 rounded-full px-3 py-2 font-grotesk text-[0.6rem] tracking-[0.3em] text-white/50 uppercase hover:text-white sm:text-[0.65rem]"
        onClick={() => {
          // audio still locked: this tap should start the music, not mute it
          if (sound && !live) return startMusic();
          sfx.unlock();
          music.start();
          setSound(!sound);
          if (!sound) setTimeout(() => sfx.play('tick'), 30);
        }}
        aria-pressed={sound}
        aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
        whileTap={{ scale: 0.94 }}
        data-testid="sound-toggle"
      >
        <SoundBars on={sound} />
        <span className="hidden sm:inline">{sound ? 'Sound on' : 'Sound off'}</span>
      </motion.button>
      </div>
    </div>
    </>
  );
}

function SoundBars({ on }: { on: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0.5, 1, 0.7, 0.9].map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-lavender/80"
          animate={on ? { height: [`${h * 40}%`, '100%', `${h * 55}%`] } : { height: '20%' }}
          transition={on ? { duration: 0.8 + i * 0.15, repeat: Infinity, repeatType: 'mirror' } : { duration: 0.3 }}
        />
      ))}
    </span>
  );
}
