import * as THREE from 'three';

/**
 * Camera rig driver (ANIMATION_SYSTEM.md §6).
 * GSAP tweens these plain values; <CameraRig/> composes them with pointer
 * parallax and shake every frame. Nothing else writes to the camera.
 */
export const rig = {
  position: new THREE.Vector3(0, 0, 8),
  target: new THREE.Vector3(0, 0, 0),
  fov: 35,
  /** World-units of pointer parallax. */
  parallax: 0.25,
  shake: 0,
  roll: 0,
};

/** Post-processing driver, read every frame by <PostFX/>. */
export const fx = {
  bloom: 0.9,
  bloomThreshold: 0.62,
  bloomSmoothing: 0.25,
  vignette: 0.72,
  aberration: 0.0006,
  grain: 0.05,
};

export const FX_DEFAULTS = { ...fx };

/** Smoothed, normalised pointer (-1..1), updated from window events so DOM layers never block it. */
export const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

if (typeof window !== 'undefined') {
  const update = (cx: number, cy: number) => {
    pointer.tx = (cx / window.innerWidth) * 2 - 1;
    pointer.ty = -((cy / window.innerHeight) * 2 - 1);
    pointer.active = true;
  };
  window.addEventListener('pointermove', (e) => update(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => update(e.clientX, e.clientY), { passive: true });
}

/** Distance needed for an object of size (w,h) to fill `fill` of the viewport. */
export function fitDistance(w: number, h: number, fovDeg: number, aspect: number, fill = 0.8) {
  const t = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const byH = h / fill / (2 * t);
  const byW = w / fill / (2 * t * aspect);
  return Math.max(byH, byW);
}

/** Visible world height at a given distance. */
export function visibleHeight(distance: number, fovDeg: number) {
  return 2 * distance * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
}
