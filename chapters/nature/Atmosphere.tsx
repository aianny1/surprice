'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, pathSamples } from './world';
import { REFLECTION_EXCLUDED, walk, wind } from './state';
import { sky } from './TimeOfDay';
import { rig } from '@/engine/stage/rig';
import { useExperience, type Quality } from '@/store/experience';

/**
 * Air you can see: floating pollen around the camera (brighter when it catches the sun) and
 * morning light shafts slanting through the forest along the real sun direction.
 */
const POLLEN: Record<Quality, number> = { high: 1500, medium: 800, low: 300 };

export function Pollen() {
  const quality = useExperience((s) => s.quality);
  const count = POLLEN[quality];

  const { geo, mat } = useMemo(() => {
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: wind.uTime,
        uCam: { value: new THREE.Vector3() },
        uSun: { value: sky.sun },
        uSunDir: { value: sky.sunDir },
      },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uCam;
        attribute vec4 aSeed;
        varying float vA; varying vec3 vDir;
        void main(){
          // particles live in a 24 m box that travels with the camera (wrapped with mod)
          vec3 drift = vec3(0.25, 0.08 + 0.05 * sin(aSeed.w * 6.0), 0.12) * uTime;
          vec3 wobble = vec3(sin(uTime * 0.7 + aSeed.x * 20.0), sin(uTime * 0.5 + aSeed.y * 17.0), cos(uTime * 0.6 + aSeed.z * 13.0)) * 0.35;
          vec3 p = mod(aSeed.xyz * 24.0 + drift - uCam + 12.0, 24.0) - 12.0 + uCam + wobble;
          p.y = uCam.y - 1.5 + mod(aSeed.y * 6.0 + drift.y, 6.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vDir = normalize(p - uCam);
          float dist = -mv.z;
          vA = smoothstep(24.0, 6.0, dist) * smoothstep(1.2, 3.5, dist);
          gl_PointSize = min((1.0 + aSeed.w * 2.0) * (45.0 / dist), 9.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; uniform vec3 uSunDir;
        varying float vA; varying vec3 vDir;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          // glints when looking toward the sun
          float glint = 0.25 + 1.2 * pow(max(dot(vDir, normalize(uSunDir)), 0.0), 6.0);
          gl_FragColor = vec4(uSun * core * vA * glint * 0.55, 1.0);
        }`,
    });
    return { geo, mat };
  }, [count]);

  useFrame(() => {
    mat.uniforms.uCam.value.copy(rig.position);
  });

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  return <points geometry={geo} material={mat} frustumCulled={false} ref={(o: THREE.Object3D | null) => o?.layers.set(REFLECTION_EXCLUDED)} />;
}

/** Slanted light shafts through the forest; strongest in the morning, gone by sunset. */
export function LightShafts() {
  const { geo, mat } = useMemo(() => {
    const roots = pathSamples(6).slice(1, 9);
    const N = roots.length * 2;
    const base = new THREE.PlaneGeometry(1, 1, 1, 1);
    base.translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    geo.instanceCount = N;
    const root = new Float32Array(N * 3);
    const shape = new Float32Array(N * 3);
    roots.forEach((r, i) => {
      for (let k = 0; k < 2; k++) {
        const x = r.x + (Math.random() - 0.5) * 16;
        const z = r.z + (Math.random() - 0.5) * 16;
        root.set([x, heightAt(x, z), z], (i * 2 + k) * 3);
        shape.set([14 + Math.random() * 10, 0.8 + Math.random() * 1.6, Math.random()], (i * 2 + k) * 3);
      }
    });
    geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 3));
    geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(shape, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: wind.uTime,
        uSun: { value: sky.sun },
        uSunDir: { value: sky.sunDir },
        uStrength: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform vec3 uSunDir;
        attribute vec3 aRoot; attribute vec3 aShape;
        varying vec2 vUv; varying float vSeed;
        void main(){
          vec3 axis = normalize(uSunDir);
          // the shaft always turns its face to the camera around its own axis
          vec3 toCam = normalize(cameraPosition - aRoot);
          vec3 side = normalize(cross(axis, toCam));
          float len = aShape.x; float wid = aShape.y;
          vec3 p = aRoot + axis * (position.y * len) + side * position.x * wid * (1.0 + position.y * 0.8);
          vUv = uv; vSeed = aShape.z;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uSun; uniform float uStrength;
        varying vec2 vUv; varying float vSeed;
        void main(){
          float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
          float flicker = 0.75 + 0.25 * sin(uTime * 0.6 + vSeed * 30.0);
          float a = pow(across, 2.0) * along * flicker * uStrength;
          gl_FragColor = vec4(uSun * a * 0.16, 1.0);
        }`,
    });
    return { geo, mat };
  }, []);

  useFrame(() => {
    // morning only: rises after dawn, peaks in the forest, fades by the pool, gone at sunset
    const p = walk.progress;
    mat.uniforms.uStrength.value = THREE.MathUtils.smoothstep(p, 0.02, 0.18) * (1 - THREE.MathUtils.smoothstep(p, 0.45, 0.7));
  });

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  return <mesh geometry={geo} material={mat} frustumCulled={false} ref={(o: THREE.Object3D | null) => o?.layers.set(REFLECTION_EXCLUDED)} />;
}
