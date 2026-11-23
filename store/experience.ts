import { create } from 'zustand';
import type { ChapterId } from '@/engine/chapters';

export type Phase = 'booting' | 'idle' | 'exiting' | 'awaitingReady' | 'entering';
export type Quality = 'low' | 'medium' | 'high';

interface ExperienceState {
  current: ChapterId | null;
  previous: ChapterId | null;
  phase: Phase;
  transitionId: string | null;
  /** True while the user should not be able to interact (transitions). */
  locked: boolean;
  visited: ChapterId[];
  sound: boolean;
  reducedMotion: boolean;
  quality: Quality;
  /** Chapter whose direct-URL gate is showing. */
  gate: ChapterId | null;
  /** 0..1 progress shown by the preloader when a chapter is slow. */
  loadingVisible: boolean;

  setCurrent(id: ChapterId | null): void;
  setPhase(phase: Phase, transitionId?: string | null): void;
  markVisited(id: ChapterId): void;
  setSound(on: boolean): void;
  setQuality(q: Quality): void;
  setGate(id: ChapterId | null): void;
  setLoadingVisible(v: boolean): void;
}

const VISITED_KEY = 'her-universe:visited';

function readVisited(): ChapterId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VISITED_KEY);
    return raw ? (JSON.parse(raw) as ChapterId[]) : [];
  } catch {
    return [];
  }
}

function writeVisited(v: ChapterId[]) {
  try {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable: progress simply isn't remembered */
  }
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `?quality=low|medium|high` pins the tier (used by tests); adaptive downgrades are then disabled. */
let forcedCache: Quality | null | undefined;
function forcedQuality(): Quality | null {
  if (typeof window === 'undefined') return null;
  // Read once: the query string disappears after the first in-app navigation.
  if (forcedCache === undefined) {
    const q = new URLSearchParams(window.location.search).get('quality');
    forcedCache = q === 'low' || q === 'medium' || q === 'high' ? q : null;
  }
  return forcedCache;
}

/** The GPU the browser is actually rendering with (on hybrid laptops Chrome usually picks the integrated one). */
export function gpuRenderer(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

const DISCRETE_GPU = /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|apple m\d/i;

/**
 * Initial tier from the real GPU (Phase 1 audit: core count alone put integrated
 * laptops on "high", where the universe ran at 14 fps). Refined at runtime by <AdaptiveQuality/>.
 */
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high';
  const forced = forcedQuality();
  if (forced) return forced;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse) return cores <= 4 || mem <= 3 ? 'low' : 'medium';
  return DISCRETE_GPU.test(gpuRenderer()) ? 'high' : 'medium';
}

export const qualityLocked = () => forcedQuality() !== null;

export const useExperience = create<ExperienceState>((set, get) => ({
  current: null,
  previous: null,
  phase: 'booting',
  transitionId: null,
  locked: true,
  visited: readVisited(),
  sound: true,
  reducedMotion: detectReducedMotion(),
  quality: detectQuality(),
  gate: null,
  loadingVisible: false,

  setCurrent(id) {
    const cur = get().current;
    if (cur === id) return;
    set({ previous: cur, current: id });
  },
  setPhase(phase, transitionId = get().transitionId) {
    set({ phase, transitionId: phase === 'idle' ? null : transitionId, locked: phase !== 'idle' });
  },
  markVisited(id) {
    const v = get().visited;
    if (v.includes(id)) return;
    const next = [...v, id];
    writeVisited(next);
    set({ visited: next });
  },
  setSound(on) {
    set({ sound: on });
  },
  setQuality(q) {
    set({ quality: q });
  },
  setGate(id) {
    set({ gate: id });
  },
  setLoadingVisible(v) {
    set({ loadingVisible: v });
  },
}));
