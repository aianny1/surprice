'use client';

import { gsap } from '@/animation/gsap';
import { CHAPTERS, chapterById, type ChapterId } from '@/engine/chapters';
import { site } from '@/data/site';
import { useExperience } from '@/store/experience';
import { overlay } from './overlay';
import { TRANSITIONS, type ChapterHandles, type TransitionCtx, type TransitionDef } from './transitions';

/**
 * Centralised transition engine (PAGE_ARCHITECTURE.md §5).
 *
 *   go(to) → exiting → [route swap hidden under a bridge] → awaitingReady → entering → idle
 *
 * Route changes only happen while something covers the viewport, so a hard cut is never visible.
 */

type Router = { push(href: string, opts?: { scroll?: boolean }): void };

let router: Router | null = null;
export function setRouter(r: Router) {
  router = r;
}

// ---------------------------------------------------------------- chapter handles

const handles = new Map<ChapterId, ChapterHandles>();

/** No WebGL: there are no scenes to wait for, so a chapter is ready as soon as its DOM registers. */
let staticMode = false;
export function setStaticMode(v: boolean) {
  staticMode = v;
  // release anyone already waiting for a scene that will never render
  if (v) for (const id of [...waiters.keys()]) markReady(id);
}

export function registerHandles(id: ChapterId, h: ChapterHandles) {
  handles.set(id, h);
  if (staticMode) queueMicrotask(() => markReady(id));
  return () => {
    if (handles.get(id) === h) handles.delete(id);
  };
}

export function getHandles(id: ChapterId) {
  return handles.get(id) ?? null;
}

// ---------------------------------------------------------------- ready signalling

const ready = new Set<ChapterId>();
const waiters = new Map<ChapterId, Array<() => void>>();

/** Called by a chapter scene once it has compiled and rendered its first frames. */
export function markReady(id: ChapterId) {
  ready.add(id);
  waiters.get(id)?.forEach((fn) => fn());
  waiters.delete(id);
}

export function markUnready(id: ChapterId) {
  if (staticMode && handles.has(id)) return;
  ready.delete(id);
}

async function waitReady(id: ChapterId, timeoutMs: number): Promise<boolean> {
  const fonts = typeof document !== 'undefined' ? document.fonts.ready : Promise.resolve();
  const sceneReady = new Promise<boolean>((resolve) => {
    if (ready.has(id) && handles.has(id)) return resolve(true);
    if (staticMode) {
      // no scenes: just wait for the chapter's DOM to register
      const t0 = performance.now();
      const poll = () =>
        handles.has(id) ? resolve(true) : performance.now() - t0 > timeoutMs ? resolve(false) : requestAnimationFrame(poll);
      return poll();
    }
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const list = waiters.get(id) ?? [];
    list.push(() => {
      clearTimeout(timer);
      requestAnimationFrame(() => resolve(true));
    });
    waiters.set(id, list);
  });
  const [ok] = await Promise.all([sceneReady, fonts]);
  return ok && handles.has(id);
}

// ---------------------------------------------------------------- timeline playback
// (`skipping` fast-forwards a transition that a browser back/forward interrupts)

let active: { tl: gsap.core.Timeline; finish: () => void } | null = null;
let skipping = false;

function play(tl: gsap.core.Timeline | null | undefined): Promise<void> {
  if (!tl) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      active = null;
      resolve();
    };
    active = { tl, finish };
    tl.eventCallback('onComplete', finish);
    if (skipping) {
      tl.progress(1);
      finish();
    } else {
      tl.play(0);
    }
  });
}

function wrap(tl: gsap.core.Timeline | null | undefined) {
  if (!tl) return null;
  const outer = gsap.timeline({ paused: true });
  outer.add(tl);
  return outer;
}

/** Jumps the running timeline to its end. Captures the reference first: progress(1) fires
 *  onComplete, which clears `active` synchronously. */
function finishActive() {
  const current = active;
  if (!current) return;
  current.tl.progress(1);
  current.finish();
}

// ---------------------------------------------------------------- navigation

let pending: { to: ChapterId } | null = null;
/** Incremented on every navigation; a superseded arrival aborts quietly. */
let navToken = 0;

function resolveTransition(from: ChapterId | null, to: ChapterId): TransitionDef {
  if (useExperience.getState().reducedMotion) return TRANSITIONS.reduced;
  // going to an earlier chapter (scroll back) always winds backwards
  if (from && chapterById(to).order < chapterById(from).order) return TRANSITIONS.back;
  return (
    TRANSITIONS.list.find((t) => t.from === from && t.to === to) ??
    TRANSITIONS.list.find((t) => t.from === '*' && t.to === to) ??
    TRANSITIONS.fallback
  );
}

/** Forward navigation via a story CTA. */
export async function go(to: ChapterId) {
  const store = useExperience.getState();
  if (store.phase !== 'idle' || !router) return;
  const from = store.current;
  const def = resolveTransition(from, to);
  skipping = false;
  const token = ++navToken;

  store.setPhase('exiting');
  const ctx: TransitionCtx = {
    from: from ? getHandles(from) : null,
    to: () => getHandles(to),
    reduced: store.reducedMotion,
  };

  try {
    // Leave the caller's synchronous scope before building anything. Chapters call go() from
    // contextSafe handlers; tweens created inside that scope were recorded in the OUTGOING chapter's
    // GSAP context and reverted when it unmounted, so the cover vanished mid-transition (Chunk 3G).
    await Promise.resolve();
    await play(wrap(def.exit(ctx)));
    if (token !== navToken) return;

    pending = { to };
    markUnready(to);
    store.setPhase('awaitingReady');
    router.push(chapterById(to).route, { scroll: false });
    await arrive(to, def, ctx, token);
  } catch (err) {
    console.error('[transition] failed, recovering', err);
    recover();
  }
}

async function arrive(to: ChapterId, def: TransitionDef, ctx: TransitionCtx, token: number) {
  const slow = setTimeout(() => {
    if (token === navToken) useExperience.getState().setLoadingVisible(true);
  }, 1500);
  const ok = await waitReady(to, 12000);
  clearTimeout(slow);
  useExperience.getState().setLoadingVisible(false);
  if (token !== navToken) return;
  if (!ok) console.warn(`[transition] "${to}" was not ready in time; revealing anyway`);

  useExperience.getState().setPhase('entering');
  if (ok) await play(wrap(def.enter(ctx)));
  else await play(wrap(overlay.darkOut(0.6)));
  if (token !== navToken) return;

  pending = null;
  skipping = false;
  const store = useExperience.getState();
  store.markVisited(to);
  store.setPhase('idle');
}

function recover() {
  pending = null;
  skipping = false;
  overlay.lightOut(0.4);
  overlay.dawnOut(0.4);
  overlay.skyOut(0.4);
  overlay.darkOut(0.6);
  useExperience.getState().setPhase('idle');
}

/**
 * Called by <HistoryWatcher/> on every pathname change.
 * If go() did not initiate it, it is a direct visit (cold open) or browser back/forward (rewind).
 */
export async function onRouteChanged(to: ChapterId, kind: 'initial' | 'history') {
  const store = useExperience.getState();
  store.setCurrent(to);
  if (pending?.to === to) return; // go() is driving this arrival

  // A history jump in the middle of a transition: finish the old one instantly.
  if (active) {
    skipping = true;
    finishActive();
  }
  skipping = false;
  const token = ++navToken;
  if (kind === 'history') {
    overlay.lightOut(0.01);
    overlay.dawnOut(0.01);
    overlay.skyOut(0.01);
    overlay.coverDarkInstant();
  }
  const def = kind === 'initial' ? TRANSITIONS.coldOpen : TRANSITIONS.rewind;
  store.setPhase('awaitingReady');
  pending = { to };

  if (kind === 'initial' && needsGate(to)) {
    store.setGate(to);
    await new Promise<void>((resolve) => (gateResolver = resolve));
    store.setGate(null);
  }

  try {
    await arrive(to, def, { from: null, to: () => getHandles(to), reduced: store.reducedMotion }, token);
  } catch (err) {
    console.error('[transition] arrival failed, recovering', err);
    recover();
  }
}

// ---------------------------------------------------------------- direct-URL gate

let gateResolver: (() => void) | null = null;

function needsGate(to: ChapterId) {
  if (!site.navigation.enforceOrder) return false;
  const meta = chapterById(to);
  if (meta.order === 1) return false;
  if (new URLSearchParams(window.location.search).has('preview')) return false;
  const visited = useExperience.getState().visited;
  const prev = CHAPTERS.find((c) => c.order === meta.order - 1);
  return !!prev && !visited.includes(prev.id);
}

/** "Show me anyway" on the gate. */
export function passGate() {
  gateResolver?.();
  gateResolver = null;
}
