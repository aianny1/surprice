'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { heightAt, pathSamples, POOL } from './world';
import { wind } from './state';
import { sky } from './TimeOfDay';
import { useExperience, type Quality } from '@/store/experience';

/**
 * Meadow butterflies. Same GPU technique as the Universe ones (flight + flapping in the vertex
 * shader, wing shape as an SDF) but with natural colours, a slower wingbeat, and lazy wandering
 * loops low over the flowers instead of orbits.
 */
const COUNT: Record<Quality, number> = { high: 18, medium: 10, low: 6 };
const WINGS = [
  ['#f08a2a', '#2a1608'], // orange with dark margins
  ['#4f86e8', '#10203f'], // blue
  ['#f4efe2', '#6b6255'], // cream white
  ['#f2cf4a', '#3a2a08'], // yellow
];

export function NatureButterflies() {
  const quality = useExperience((s) => s.quality);
  const count = COUNT[quality];

  const { geo, mat } = useMemo(() => {
    const base = new THREE.PlaneGeometry(2, 1.1, 2, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    geo.instanceCount = count;

    const centers = [new THREE.Vector3(POOL.x, 0, POOL.z), ...pathSamples(8).slice(2, 14)];
    const center = new Float32Array(count * 3);
    const path = new Float32Array(count * 4);
    const colA = new Float32Array(count * 3);
    const colB = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const k = centers[i % centers.length];
      const x = k.x + (Math.random() - 0.5) * 6;
      const z = k.z + (Math.random() - 0.5) * 6;
      center.set([x, heightAt(x, z) + 0.9, z], i * 3);
      path.set([2 + Math.random() * 3.5, 0.12 + Math.random() * 0.12, Math.random() * 6.28, 0.17 + Math.random() * 0.1], i * 4);
      const [a, b] = WINGS[i % WINGS.length];
      c.set(a);
      colA.set([c.r, c.g, c.b], i * 3);
      c.set(b);
      colB.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(center, 3));
    geo.setAttribute('aPath', new THREE.InstancedBufferAttribute(path, 4));
    geo.setAttribute('aColA', new THREE.InstancedBufferAttribute(colA, 3));
    geo.setAttribute('aColB', new THREE.InstancedBufferAttribute(colB, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: wind.uTime,
        uHemiSky: { value: sky.hemiSky },
        uSun: { value: sky.sun },
      },
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uTime;
        attribute vec3 aCenter; attribute vec4 aPath; attribute vec3 aColA; attribute vec3 aColB;
        varying vec2 vUv; varying vec3 vA; varying vec3 vB;
        void main(){
          // lazy figure-of-eight wander with a gentle bob
          float t = uTime * aPath.y + aPath.z;
          vec3 c = aCenter + vec3(sin(t) * aPath.x, sin(t * 2.3) * 0.35 + sin(t * 0.7) * 0.25, sin(t * 2.0) * aPath.x * 0.5);
          vec3 fwd = normalize(vec3(cos(t) * aPath.x, cos(t * 2.3) * 0.8, cos(t * 2.0) * aPath.x));
          vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
          vec3 up = cross(right, fwd);
          // slower, irregular wingbeat with short glides
          float beat = sin(uTime * 9.0 + aPath.z * 10.0);
          float glide = smoothstep(0.6, 1.0, sin(uTime * 0.9 + aPath.z * 3.0));
          float ang = mix(mix(0.1, 1.3, beat * 0.5 + 0.5), 0.35, glide);
          float side = sign(position.x);
          float span = abs(position.x);
          vec3 local = right * side * span * cos(ang) + up * span * sin(ang) + fwd * position.y;
          vec3 world = c + local * aPath.w;
          vUv = uv; vA = aColA; vB = aColB;
          vec4 mvPosition = viewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uHemiSky; uniform vec3 uSun;
        varying vec2 vUv; varying vec3 vA; varying vec3 vB;
        float ell(vec2 p, vec2 c, vec2 r, float rot){
          p -= c; float cs = cos(rot), sn = sin(rot);
          p = mat2(cs, -sn, sn, cs) * p;
          return length(p / r) - 1.0;
        }
        void main(){
          vec2 p = vec2(abs(vUv.x - 0.5) * 2.0, vUv.y - 0.5);
          float fore = ell(p, vec2(0.47, 0.16), vec2(0.5, 0.3), -0.55);
          float hind = ell(p, vec2(0.31, -0.2), vec2(0.29, 0.24), 0.5);
          float wing = min(fore, hind);
          float body = length(vec2(p.x / 0.05, p.y / 0.4)) - 1.0;
          float shape = min(wing, body);
          float alpha = smoothstep(0.03, -0.03, shape);
          if (alpha < 0.05) discard;
          // dark wing margins and veins, a couple of pale spots
          float margin = smoothstep(-0.2, -0.04, wing);
          float veins = smoothstep(0.9, 1.0, abs(sin(atan(p.y, p.x) * 8.0))) * smoothstep(0.1, 0.4, p.x);
          vec3 col = mix(vA, vB, max(margin, veins * 0.6));
          col = mix(col, vec3(0.96), smoothstep(0.05, 0.0, length(p - vec2(0.78, 0.22))) * margin);
          col = mix(col, vec3(0.05), step(body, 0.0));
          col *= 0.55 + 0.45 * (uHemiSky + uSun * 0.5);
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }`,
    });
    return { geo, mat };
  }, [count]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}
