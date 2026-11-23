'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { chapterByPath } from '@/engine/chapters';
import { onRouteChanged, setRouter } from './manager';

/**
 * Bridges Next.js routing to the transition engine.
 * App Router has no route-change events, so we watch the pathname ourselves:
 * the first one is a cold open, later ones not started by go() are history jumps.
 */
export function HistoryWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const first = useRef(true);

  useEffect(() => {
    setRouter(router);
  }, [router]);

  useEffect(() => {
    const chapter = chapterByPath(pathname);
    if (!chapter) return;
    const kind = first.current ? 'initial' : 'history';
    first.current = false;
    void onRouteChanged(chapter.id, kind);
  }, [pathname]);

  return null;
}
