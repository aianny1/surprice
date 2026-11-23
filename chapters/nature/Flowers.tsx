'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, pathSamples, POOL } from './world';
import { wind } from './state';
import { sky } from './TimeOfDay';
import { useExperience, type Quality } from '@/store/experience';

/**
 * Wildflowers: a thin stem + a five-petal head, instanced, swaying on the shared wind field.
 * Densest in the glade around the pool, scattered along the meadow of the walk.
 */
const COUNT: Record<Quality, number> = { high: 1500, medium: 700, low: 250 };
const PALETTE = ['#f3efe6', '#f1b9c8', '#a98bd6', '#f2cf5b', '#86a9e0', '#f3efe6'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** R = petal mask, G = centre mask, A = coverage. */
function petalTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.translate(S / 2, S / 2);
  ctx.fillStyle = 'rgb(255,0,0)';
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i / 5) * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, -S * 0.22, S * 0.13, S * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgb(0,255,0)';
  ctx.beginPath();
  ctx.arc(0, 0, S * 0.09, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function baseGeometry() {
  // stem: thin vertical quad (y 0..1); head: horizontal quad centred at the stem top
  const pos = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, -0.5, 1, -0.5, 0.5, 1, -0.5, 0.5, 1, 0.5, -0.5, 1, 0.5];
  const uv = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  const part = [0, 0, 0, 0, 1, 1, 1, 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return g;
}

export function Flowers() {
  const quality = useExperience((s) => s.quality);
  const count = COUNT[quality];

  const { geometry, material, texture } = useMemo(() => {
    const base = baseGeometry();
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    for (const k of ['position', 'uv', 'aPart']) geometry.setAttribute(k, base.attributes[k]);

    const offset = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const color = new Float32Array(count * 3);
    const samples = pathSamples(40).slice(0, 90); // meadow along the first two legs
    const r = rng(17);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      let x: number;
      let z: number;
      if (r() < 0.55) {
        // the glade around the pool
        const a = r() * Math.PI * 2;
        const d = POOL.r + 0.8 + Math.pow(r(), 0.8) * 11;
        x = POOL.x + Math.cos(a) * d;
        z = POOL.z + Math.sin(a) * d;
      } else {
        const s = samples[Math.floor(r() * samples.length)];
        const a = r() * Math.PI * 2;
        const d = 1.2 + r() * 10;
        x = s.x + Math.cos(a) * d;
        z = s.z + Math.sin(a) * d;
      }
      offset.set([x, heightAt(x, z) - 0.02, z], i * 3);
      params.set([r() * Math.PI * 2, 0.3 + r() * 0.35, 0.13 + r() * 0.1, r() * 6.28], i * 4);
      col.set(PALETTE[Math.floor(r() * PALETTE.length)]).offsetHSL(0, 0, (r() - 0.5) * 0.08);
      color.set([col.r, col.g, col.b], i * 3);
    }
    geometry.instanceCount = count;
    geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offset, 3));
    geometry.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));

    const texture = petalTexture();
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: wind.uTime,
        uWind: wind.uWind,
        uGust: wind.uGust,
        uPetals: { value: texture },
        uSun: { value: sky.sun },
        uSunDir: { value: sky.sunDir },
        uHemiSky: { value: sky.hemiSky },
        uHemiGround: { value: sky.hemiGround },
        uSunI: { value: 1 },
        uHemiI: { value: 1 },
      },
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uTime; uniform float uWind; uniform vec4 uGust;
        attribute float aPart; attribute vec3 aOffset; attribute vec4 aParams; attribute vec3 aColor;
        varying vec2 vUv; varying float vPart; varying vec3 vColor; varying vec3 vWorld;
        void main(){
          float yaw = aParams.x; float hgt = aParams.y; float size = aParams.z; float ph = aParams.w;
          vec3 p = position;
          if (aPart < 0.5) {
            p.x *= 0.012;
            p.y *= hgt;
          } else {
            p.xz *= size;
            // heads tilt a little toward the light
            p.y = hgt + p.z * 0.35;
          }
          float c = cos(yaw); float s = sin(yaw);
          p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
          float w = (sin(uTime * 1.4 + ph + aOffset.x * 0.2) * 0.5 + 0.5) * 0.25 + 0.08 * sin(uTime * 3.7 + ph);
          vec2 bend = normalize(vec2(1.0, 0.35)) * w * uWind;
          vec2 toB = aOffset.xz - uGust.xy;
          float gd = length(toB);
          bend += (toB / max(gd, 0.001)) * uGust.z * (1.0 - smoothstep(0.0, uGust.w, gd)) * 0.9;
          float k = pow(clamp(p.y / max(hgt, 0.001), 0.0, 1.2), 2.0) * hgt;
          p.xz += bend * k;
          vec3 world = aOffset + p;
          vUv = uv; vPart = aPart; vColor = aColor; vWorld = world;
          vec4 mvPosition = viewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform sampler2D uPetals;
        uniform vec3 uSun; uniform vec3 uSunDir; uniform vec3 uHemiSky; uniform vec3 uHemiGround;
        uniform float uSunI; uniform float uHemiI;
        varying vec2 vUv; varying float vPart; varying vec3 vColor; varying vec3 vWorld;
        void main(){
          vec3 base;
          if (vPart < 0.5) {
            base = vec3(0.12, 0.22, 0.07);
          } else {
            vec4 t = texture2D(uPetals, vUv);
            if (t.a < 0.5) discard;
            base = mix(vColor * (0.82 + 0.18 * t.r), vec3(0.95, 0.75, 0.25), t.g);
          }
          vec3 ambient = mix(uHemiGround, uHemiSky, 0.7) * uHemiI;
          vec3 direct = uSun * uSunI * (0.18 + 0.3 * max(normalize(uSunDir).y, 0.0));
          gl_FragColor = vec4(base * (ambient * 0.85 + direct), 1.0);
          #include <fog_fragment>
        }`,
    });
    return { geometry, material, texture };
  }, [count]);

  useFrame(() => {
    material.uniforms.uSunI.value = sky.sunIntensity;
    material.uniforms.uHemiI.value = sky.hemiIntensity;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    [geometry, material, texture],
  );

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
