import { create } from 'zustand';
import * as THREE from 'three';
import type { TravelCategory } from '@/data/travel';

export const GLOBE_R = 2;

/** lat/lng (degrees) → point on a sphere matching three's equirectangular UVs. */
export function latLng(lat: number, lng: number, r = GLOBE_R, out = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const DREAM_KEY = 'hu-dreams';
function loadDreams(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DREAM_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export const useTravel = create<{
  selected: number | null;
  filter: TravelCategory | null;
  dreams: string[];
  select(i: number | null): void;
  setFilter(c: TravelCategory | null): void;
  toggleDream(id: string): void;
  init(): void;
}>((set, get) => ({
  selected: null,
  filter: null,
  dreams: [],
  select: (selected) => set({ selected }),
  setFilter: (filter) => set({ filter }),
  init: () => set({ selected: null, filter: null, dreams: loadDreams() }),
  toggleDream: (id) => {
    const d = get().dreams;
    const dreams = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
    try {
      localStorage.setItem(DREAM_KEY, JSON.stringify(dreams));
    } catch {}
    set({ dreams });
  },
}));

/** Camera orbit around the globe (degrees + distance); the scene writes it into the rig every frame. */
export const orbit = { lat: 22, lng: 40, dist: 9, vLng: 0, vLat: 0, dragging: false, idle: true };

export const travelScene: { api: null | { arrive(mode: string): gsap.core.Timeline; takeOff(): gsap.core.Timeline } } = {
  api: null,
};
