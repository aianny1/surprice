import { travel } from '@/data/travel';

/** Frames on the reel and the photos printed on them (cycled). */
export const FRAMES = 18;
export const REEL_PHOTOS = travel.destinations.filter((d) => d.photo).map((d) => ({ src: d.photo!, name: d.name }));

/** Scroll-driven reel rotation (radians); the scene eases `angle` toward `target`. */
export const reel = { target: 0, angle: 0 };

/** Index of the frame currently facing the camera. */
export function frontFrame(angle: number) {
  const step = (Math.PI * 2) / FRAMES;
  return (((Math.round(angle / step) % FRAMES) + FRAMES) % FRAMES);
}
