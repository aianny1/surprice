'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, pathSamples } from './world';
import { REFLECTION_EXCLUDED, wind } from './state';
import { sky } from './TimeOfDay';
import { useExperience, type Quality } from '@/store/experience';

/**
 * Instanced grass along the walk. Every blade is placed, bent by the shared wind field, pushed away
 * from her pointer (uGust) and lit in its own tiny shader (hemisphere + sun + backlit translucency),
 * which is far cheaper than a standard material for tens of thousands of blades.
 */
const COUNT: Record<Quality, number> = { high: 50000, medium: 22000, low: 8000 };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function Grass() {
  const quality = useExperience((s) => s.quality);
  const count = COUNT[quality];

  const { geometry, material } = useMemo(() => {
    const blade = new THREE.PlaneGeometry(1, 1, 1, 4);
    blade.translate(0, 0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = blade.index;
    geometry.setAttribute('position', blade.attributes.position);

    const offset = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const tint = new Float32Array(count);
    const samples = pathSamples(60);
    const r = rng(9);
    let n = 0;
    let guard = 0;
    while (n < count && guard++ < count * 6) {
      const s = samples[Math.floor(r() * samples.length)];
      // denser near the path, thinning out to ~16 m either side
      const rad = Math.pow(r(), 0.7) * 16;
      const a = r() * Math.PI * 2;
      const x = s.x + Math.cos(a) * rad;
      const z = s.z + Math.sin(a) * rad;
      if (Math.hypot(x + 13, z + 27) < 6.2) continue; // the pool itself
      const h = heightAt(x, z);
      if (h > 13 && r() > 0.25) continue; // sparse on the rocky summit
      offset.set([x, h - 0.02, z], n * 3);
      params.set([r() * Math.PI, 0.25 + r() * r() * 0.55, 0.05 + r() * 0.05, r() * 6.28], n * 4);
      tint[n] = r() < 0.18 ? 0.6 + r() * 0.4 : r() * 0.25;
      n++;
    }
    geometry.instanceCount = n;
    geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offset, 3));
    geometry.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: wind.uTime,
        uWind: wind.uWind,
        uGust: wind.uGust,
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
        attribute vec3 aOffset; attribute vec4 aParams; attribute float aTint;
        varying float vY; varying float vTint; varying vec3 vWorld;
        void main(){
          float yaw = aParams.x; float hgt = aParams.y; float wid = aParams.z; float ph = aParams.w;
          vec3 p = position;
          float y = p.y;
          p.x *= wid * (1.0 - y * 0.85);
          p.y *= hgt;
          float c = cos(yaw); float s = sin(yaw);
          p = vec3(c * p.x, p.y, s * p.x);
          // wind: slow swell + quicker shiver, along one prevailing direction
          float w = (sin(uTime * 1.6 + ph + aOffset.x * 0.15 + aOffset.z * 0.1) * 0.5 + 0.5) * 0.35
                  + 0.12 * sin(uTime * 3.3 + ph * 2.0);
          vec2 bend = normalize(vec2(1.0, 0.35)) * w * uWind;
          // her pointer: blades lean away from where she moves
          vec2 toB = aOffset.xz - uGust.xy;
          float gd = length(toB);
          bend += (toB / max(gd, 0.001)) * uGust.z * (1.0 - smoothstep(0.0, uGust.w, gd)) * 1.4;
          float k = y * y * hgt;
          p.xz += bend * k;
          p.y -= length(bend) * k * 0.35;
          vec3 world = aOffset + p;
          vWorld = world; vY = y; vTint = aTint;
          vec4 mvPosition = viewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uSun; uniform vec3 uSunDir; uniform vec3 uHemiSky; uniform vec3 uHemiGround;
        uniform float uSunI; uniform float uHemiI;
        varying float vY; varying float vTint; varying vec3 vWorld;
        void main(){
          vec3 green = mix(vec3(0.03, 0.06, 0.02), vec3(0.22, 0.34, 0.1), vY);
          vec3 dry = mix(vec3(0.08, 0.07, 0.03), vec3(0.45, 0.4, 0.18), vY);
          vec3 base = mix(green, dry, vTint);
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 L = normalize(uSunDir);
          float back = pow(max(dot(-V, L), 0.0), 3.0) * vY;
          vec3 ambient = mix(uHemiGround, uHemiSky, 0.4 + 0.6 * vY) * uHemiI;
          vec3 direct = uSun * uSunI * (0.12 + 0.26 * max(L.y, 0.0));
          vec3 col = base * (ambient * 0.85 + direct) + base * uSun * uSunI * back * 0.7;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    });
    return { geometry, material };
  }, [count]);

  useFrame(() => {
    material.uniforms.uSunI.value = sky.sunIntensity;
    material.uniforms.uHemiI.value = sky.hemiIntensity;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // layer 1: drawn by the main camera, skipped by the pool's reflection camera (the biggest saving)
  return <mesh geometry={geometry} material={material} frustumCulled={false} ref={(o: THREE.Object3D | null) => o?.layers.set(REFLECTION_EXCLUDED)} />;
}
