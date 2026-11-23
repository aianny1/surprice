'use client';

import dynamic from 'next/dynamic';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { HistoryWatcher } from './transition/HistoryWatcher';
import { OverlayLayer } from './transition/OverlayLayer';
import { Chrome } from './ui/Chrome';
import '@/animation/gsap';

// three.js never runs on the server; the canvas mounts once and persists across routes.
const Stage = dynamic(() => import('./stage/Stage'), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <Stage />
      <main id="chapter" className="relative z-20">
        {children}
      </main>
      <Chrome />
      <OverlayLayer />
      <HistoryWatcher />
    </MotionConfig>
  );
}
