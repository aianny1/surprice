import * as THREE from 'three';
import { createNoise2D, fbm2 } from '@/lib/noise';

/**
 * The geography and the clock of "Her Wild Side". Pure data + functions, no React.
 *
 * One number drives everything: `progress` (0 → 1) along the walk.
 *   stop 0  forest edge      dawn
 *   stop 1  inside forest    late morning
 *   stop 2  waterfall pool   afternoon
 *   stop 3  summit           sunset
 */
export const STOPS = [0, 1 / 3, 2 / 3, 1] as const;
export const EYE_HEIGHT = 1.7;

// ------------------------------------------------------------------ terrain

const noise = createNoise2D(7);
export const POOL = { x: -13, z: -27, r: 8 };
const SUMMIT = { x: 10, z: -62, h: 16, r: 20 };
/** The rocky rise the waterfall pours over, just beyond the pool. */
export const CLIFF = { x: -16, z: -40.5, h: 9, r: 3.8 };

/** Ground height at (x, z), in metres. Used by the terrain mesh AND the camera path. */
export function heightAt(x: number, z: number) {
  let h = fbm2(noise, x * 0.03, z * 0.03, 4) * 2.2;
  // the summit hill the walk ends on
  const ds = ((x - SUMMIT.x) ** 2 + (z - SUMMIT.z) ** 2) / (2 * SUMMIT.r ** 2);
  h += SUMMIT.h * Math.exp(-ds);
  // the waterfall's rock shoulder
  h += CLIFF.h * Math.exp(-((x - CLIFF.x) ** 2 + (z - CLIFF.z) ** 2) / (2 * CLIFF.r ** 2));
  // a gentle bowl for the waterfall pool
  const dp = Math.hypot(x - POOL.x, z - POOL.z) / POOL.r;
  h -= 1.4 * Math.exp(-dp * dp * 1.5);
  // a gentle rise far out, so the terrain's border sits behind the first mountain ring (r = 120).
  // (A steep rise from r = 70 read as a giant fog-coloured wall that hid the ranges.)
  const r = Math.hypot(x, z + 15);
  if (r > 100) h += (r - 100) * 0.12;
  return h;
}

export const TERRAIN_SIZE = 260;

// ------------------------------------------------------------------ the walk

const v = (x: number, z: number, lift = 0) => new THREE.Vector3(x, heightAt(x, z) + EYE_HEIGHT + lift, z);

/** One curve per leg between stops, so each stop sits exactly at an anchor. */
const LEGS = [
  new THREE.CatmullRomCurve3([v(0, 34), v(1.5, 22), v(1, 10), v(-2, 0)]),
  new THREE.CatmullRomCurve3([v(-2, 0), v(-4, -9), v(-7, -16), v(-9, -21)]),
  new THREE.CatmullRomCurve3([v(-9, -21), v(-4, -32, 0.5), v(3, -45, 1), v(8, -55, 1.2)]),
];

/** Where the camera looks at each stop (and smoothly in between). */
const LOOK = [
  new THREE.Vector3(3, 5, -40), // dawn: toward the rising sun over the forest
  new THREE.Vector3(-10, 4, -24), // forest: deeper into the trees
  new THREE.Vector3(-17, 4.5, -40), // pool: the waterfall
  new THREE.Vector3(70, 12, -110), // summit: across the ranges into the sunset
];

const smooth = (t: number) => t * t * (3 - 2 * t);

export function cameraAt(progress: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const p = THREE.MathUtils.clamp(progress, 0, 1) * LEGS.length;
  const i = Math.min(LEGS.length - 1, Math.floor(p));
  const u = p - i;
  LEGS[i].getPointAt(u, pos);
  look.lerpVectors(LOOK[i], LOOK[i + 1], smooth(u));
}

// ------------------------------------------------------------------ the clock (time of day)

interface Key {
  at: number;
  /** sun elevation in degrees */
  elev: number;
  zenith: string;
  mid: string;
  horizon: string;
  sun: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  /** colour of the distant mountain silhouettes before haze */
  ridge: string;
}

const KEYS: Key[] = [
  {
    at: 0, elev: 3,
    zenith: '#2a3552', mid: '#b88aa6', horizon: '#f4c49e', sun: '#ffb184',
    fog: '#cdb2ad', fogNear: 4, fogFar: 85, sunIntensity: 1.1,
    hemiSky: '#e8c3c0', hemiGround: '#2a2a26', hemiIntensity: 0.7, ridge: '#3c3a4c',
  },
  {
    at: 1 / 3, elev: 52,
    zenith: '#3b6ca6', mid: '#8fb4d6', horizon: '#dbe6ec', sun: '#fff3de',
    fog: '#c6d4dc', fogNear: 18, fogFar: 170, sunIntensity: 2.6,
    hemiSky: '#cfe0f0', hemiGround: '#3a4a2c', hemiIntensity: 0.9, ridge: '#4c5e60',
  },
  {
    at: 2 / 3, elev: 28,
    zenith: '#3a649a', mid: '#9cb8d0', horizon: '#f1e2c8', sun: '#ffe3b8',
    fog: '#d8d4c8', fogNear: 14, fogFar: 150, sunIntensity: 2.2,
    hemiSky: '#e6dcc8', hemiGround: '#3c4228', hemiIntensity: 0.85, ridge: '#4f5a58',
  },
  {
    at: 1, elev: 5,
    zenith: '#2a2454', mid: '#8b5a8f', horizon: '#ff9a5a', sun: '#ff7f45',
    fog: '#c88c7e', fogNear: 10, fogFar: 140, sunIntensity: 1.3,
    hemiSky: '#d79a8e', hemiGround: '#2c2224', hemiIntensity: 0.6, ridge: '#3a2c42',
  },
];

/** Sun azimuth: rises ahead of the forest (−z, a little +x), sets beyond the summit (+x, −z). */
const AZ_START = Math.atan2(0.25, -1);
const AZ_END = Math.atan2(0.85, -0.55);

/** Angles (around the valley centre) where the ranges dip so the rising / setting sun is visible. */
export const SUN_GAPS = [
  { angle: Math.atan2(-1, 0.25), depth: 0.45, width: 0.3 }, // sunrise, ahead of the forest edge
  { angle: Math.atan2(-0.55, 0.85), depth: 0.7, width: 0.38 }, // sunset, beyond the summit
];

const colorCache = new Map<string, THREE.Color>();
const c = (hex: string) => {
  let col = colorCache.get(hex);
  if (!col) colorCache.set(hex, (col = new THREE.Color(hex)));
  return col;
};

export interface Sky {
  sunDir: THREE.Vector3;
  zenith: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  fog: THREE.Color;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ridge: THREE.Color;
}

export function createSkyState(): Sky {
  return {
    sunDir: new THREE.Vector3(),
    zenith: new THREE.Color(), mid: new THREE.Color(), horizon: new THREE.Color(), sun: new THREE.Color(),
    fog: new THREE.Color(), fogNear: 0, fogFar: 0, sunIntensity: 0,
    hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiIntensity: 0, ridge: new THREE.Color(),
  };
}

/** Fills `out` with the sky at time `t` (0 dawn → 1 sunset). Allocation-free; call every frame. */
export function skyAt(t: number, out: Sky) {
  const tt = THREE.MathUtils.clamp(t, 0, 1);
  let i = 0;
  while (i < KEYS.length - 2 && tt > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const k = smooth((tt - a.at) / (b.at - a.at));
  const mixC = (target: THREE.Color, x: string, y: string) => target.copy(c(x)).lerp(c(y), k);
  const mixN = (x: number, y: number) => x + (y - x) * k;

  mixC(out.zenith, a.zenith, b.zenith);
  mixC(out.mid, a.mid, b.mid);
  mixC(out.horizon, a.horizon, b.horizon);
  mixC(out.sun, a.sun, b.sun);
  mixC(out.fog, a.fog, b.fog);
  mixC(out.hemiSky, a.hemiSky, b.hemiSky);
  mixC(out.hemiGround, a.hemiGround, b.hemiGround);
  mixC(out.ridge, a.ridge, b.ridge);
  out.fogNear = mixN(a.fogNear, b.fogNear);
  out.fogFar = mixN(a.fogFar, b.fogFar);
  out.sunIntensity = mixN(a.sunIntensity, b.sunIntensity);
  out.hemiIntensity = mixN(a.hemiIntensity, b.hemiIntensity);

  const elev = THREE.MathUtils.degToRad(mixN(a.elev, b.elev));
  const az = AZ_START + (AZ_END - AZ_START) * tt;
  out.sunDir.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).normalize();
  return out;
}

// ------------------------------------------------------------------ vegetation layout

/** Evenly spaced points along the whole walk (used to keep trees off the path and grass on it). */
export function pathSamples(perLeg = 40) {
  const out: THREE.Vector3[] = [];
  for (const leg of LEGS) for (let i = 0; i <= perLeg; i++) out.push(leg.getPointAt(i / perLeg));
  return out;
}

/** Horizontal distance from (x, z) to the walk. */
export function distanceToPath(samples: THREE.Vector3[], x: number, z: number) {
  let best = Infinity;
  for (const p of samples) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * 0..1 likelihood of a tree at (x, z): dense forest between the edge and the pool,
 * open around the water, thinning out up the summit, none on the bare top.
 */
export function forestDensity(x: number, z: number) {
  const h = heightAt(x, z);
  if (h > 11) return 0;
  const pool = Math.hypot(x - POOL.x, z - POOL.z);
  if (pool < POOL.r + 2) return 0;
  let d = 0.15;
  // the forest band the walk passes through
  if (z < 28 && z > -36) d = 0.85;
  // clearings: a glade around the pool, thinning up the summit slope
  d *= THREE.MathUtils.smoothstep(pool, POOL.r + 2, POOL.r + 10);
  d *= 1 - THREE.MathUtils.smoothstep(h, 5, 11);
  return d;
}

// ------------------------------------------------------------------ water

/** Pool surface height: just below the rim, so the terrain forms a natural shoreline. */
export const WATER_Y = heightAt(POOL.x + POOL.r * 0.85, POOL.z) - 0.3;

/** Where the waterfall leaves the lip and where it lands in the pool. */
export const FALL = {
  top: new THREE.Vector3(-15.4, heightAt(-15.4, -36.2) + 0.5, -36.2),
  base: new THREE.Vector3(-14.4, WATER_Y, -31.6),
  width: 2.6,
};

// ------------------------------------------------------------------ light-seeds

/**
 * Where each glowing seed floats: a few metres ahead of the camera at its stop, a little to the
 * right of centre so it never hides behind the message card. The water seed is kept on the shore.
 */
export function seedPosition(stopProgress: number, forward: number, right: number, lift = 1.4) {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  cameraAt(stopProgress, pos, look);
  const fwd = look.clone().sub(pos).setY(0).normalize();
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const p = pos.clone().addScaledVector(fwd, forward).addScaledVector(side, right);
  const toPool = new THREE.Vector2(p.x - POOL.x, p.z - POOL.z);
  if (toPool.length() < POOL.r + 0.6) {
    toPool.setLength(POOL.r + 0.6);
    p.x = POOL.x + toPool.x;
    p.z = POOL.z + toPool.y;
  }
  p.y = heightAt(p.x, p.z) + lift;
  return p;
}
