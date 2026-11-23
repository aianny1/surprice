'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createNoise2D, fbm2 } from '@/lib/noise';
import { sky } from './TimeOfDay';
import { SUN_GAPS } from './world';
import { fbmLite, simplex3 } from '@/shaders/noise';

/**
 * Three rings of distant ridges around the whole valley. Each farther ring is taller and hazier
 * (aerial perspective), so wherever the camera looks there are layered mountains fading into mist.
 */
const LAYERS = [
  { radius: 120, base: 6, height: 20, haze: 0.35, seed: 3, freq: 5, snowLine: 999 },
  { radius: 170, base: 14, height: 34, haze: 0.58, seed: 11, freq: 4, snowLine: 999 },
  { radius: 240, base: 24, height: 58, haze: 0.78, seed: 29, freq: 3, snowLine: 62 },
];

const angleDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

function ridgeGeometry(radius: number, base: number, height: number, seed: number, freq: number) {
  const noise = createNoise2D(seed);
  const seg = 720;
  const positions: number[] = [];
  const heights: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius - 15;
    // ridged noise: sharp peaks, rounded valleys
    const u = Math.cos(a) * freq;
    const w = Math.sin(a) * freq;
    const ridged = 1 - Math.abs(fbm2(noise, u, w, 5) * 1.6);
    let gap = 1;
    for (const g of SUN_GAPS) gap *= 1 - g.depth * Math.exp(-(angleDist(a, g.angle) ** 2) / (2 * g.width ** 2));
    const top = (base + height * Math.pow(THREE.MathUtils.clamp(ridged, 0, 1), 1.8)) * gap;
    positions.push(x, -10, z, x, top, z);
    heights.push(0, 1);
    if (i < seg) {
      const k = i * 2;
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aH', new THREE.Float32BufferAttribute(heights, 1));
  g.setIndex(index);
  return g;
}

export function Mountains() {
  const layers = useMemo(
    () =>
      LAYERS.map((l) => {
        const geometry = ridgeGeometry(l.radius, l.base, l.height, l.seed, l.freq);
        const material = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          fog: false,
          uniforms: {
            uRidge: { value: sky.ridge },
            uFog: { value: sky.fog },
            uSun: { value: sky.sun },
            uSunDir: { value: sky.sunDir },
            uHaze: { value: l.haze },
            uSnowLine: { value: l.snowLine },
          },
          vertexShader: /* glsl */ `
            attribute float aH;
            varying float vH; varying vec3 vPos;
            void main(){ vH = aH; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uRidge; uniform vec3 uFog; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uHaze;
            uniform float uSnowLine;
            varying float vH; varying vec3 vPos;
            ${simplex3}
            ${fbmLite}
            void main(){
              // rock: vertical gullies and strata, so the faces read as stone, not paper cut-outs
              float ang = atan(vPos.z + 15.0, vPos.x);
              float rock = fbm3(vec3(ang * 40.0, vPos.y * 0.08, 0.0)) * 0.5 + 0.5;
              vec3 base = uRidge * mix(0.78, 1.15, rock);
              // snow on the highest far peaks, tinted by the sun (pink at dawn, white at noon, orange at sunset)
              float snow = smoothstep(uSnowLine, uSnowLine + 6.0, vPos.y + rock * 4.0);
              base = mix(base, mix(vec3(0.93, 0.95, 0.98), uSun, 0.35), snow * 0.85);
              vec3 col = mix(base, uFog, uHaze);
              // valley mist pooling at the base of every range
              col = mix(col, uFog, (1.0 - smoothstep(0.0, 0.55, vH)) * 0.6);
              // ridges facing the sun catch a thin warm rim
              vec2 toSun = normalize(uSunDir.xz);
              vec2 out2 = normalize(vPos.xz + vec2(0.0, 15.0));
              float facing = pow(max(dot(out2, -toSun), 0.0), 6.0);
              col += uSun * facing * smoothstep(0.6, 1.0, vH) * 0.12 * (1.0 - uHaze);
              gl_FragColor = vec4(col, 1.0);
            }`,
        });
        return { geometry, material };
      }),
    [],
  );

  useEffect(
    () => () =>
      layers.forEach((l) => {
        l.geometry.dispose();
        l.material.dispose();
      }),
    [layers],
  );

  return (
    <>
      {layers.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={l.material} renderOrder={-9 + i} frustumCulled={false} />
      ))}
    </>
  );
}
