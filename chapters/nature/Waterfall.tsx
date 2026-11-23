'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise2D } from '@/lib/noise';
import { simplex3, fbmLite } from '@/shaders/noise';
import { FALL, heightAt } from './world';
import { wind } from './state';
import { sky } from './TimeOfDay';

/**
 * Waterfall over the rock shoulder behind the pool:
 *  - boulders (one InstancedMesh) framing the lip and the landing,
 *  - a sheet of falling water shaped like a real trajectory (leaves the lip, then drops),
 *    with streaks scrolling down it,
 *  - mist rising where it lands.
 */
function boulderGeometry() {
  // icosahedrons come with split vertices (flat facets): merge first so normals are smooth
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 4).deleteAttribute('normal').deleteAttribute('uv'));
  const n = createNoise2D(4);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + n(v.x * 1.7 + v.z, v.y * 1.7) * 0.28 + n(v.x * 4, v.z * 4 + v.y) * 0.08;
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y * 0.75, v.z);
  }
  g.computeVertexNormals();
  // moss on the up-facing tops, damp darker stone below
  const nrm = g.attributes.normal;
  const cols = new Float32Array(p.count * 3);
  const stone = new THREE.Color('#7b766e');
  const damp = new THREE.Color('#4f4b46');
  const moss = new THREE.Color('#4d6238');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const up = nrm.getY(i);
    c.copy(damp).lerp(stone, THREE.MathUtils.smoothstep(up, -0.4, 0.3));
    c.lerp(moss, THREE.MathUtils.smoothstep(up, 0.55, 0.85) * (0.6 + 0.4 * n(p.getX(i) * 3, p.getZ(i) * 3)));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

// [dx, dz, scale, height offset]; the first one is the lip stone, set at the water's edge
const ROCKS: [number, number, number, number][] = [
  [0, 0.15, 1.25, 0],
  // dx, dz (relative to the lip), scale, height offset (negative = sunk into the ground)
  [-2.1, -0.3, 1.7, -0.7],
  [2.0, -0.1, 1.6, -0.7],
  [-0.4, -2.0, 2.0, -1.0],
  [-3.2, 2.4, 1.2, -0.6],
  [3.0, 2.6, 1.1, -0.6],
  [-2.0, 4.6, 0.8, -0.4],
  [2.4, 4.8, 0.7, -0.4],
];

export function Waterfall() {
  const parts = useMemo(() => {
    // ---- rocks
    const rockGeo = boulderGeometry();
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    ROCKS.forEach(([dx, dz, s, dy], i) => {
      const x = FALL.top.x + dx;
      const z = FALL.top.z + dz;
      q.setFromEuler(new THREE.Euler(0, i * 1.7, 0.1 * (i % 3)));
      if (i === 0) {
        // lip stone: flat, wide, sitting exactly on the edge the water pours over
        q.setFromEuler(new THREE.Euler(0.05, 0.2, 0));
        m.compose(new THREE.Vector3(x, FALL.top.y - 0.12, z), q, new THREE.Vector3(s * 1.35, s * 0.32, s * 0.75));
      } else {
        m.compose(new THREE.Vector3(x, heightAt(x, z) + dy, z), q, new THREE.Vector3(s, s * 0.85, s));
      }
      rocks.setMatrixAt(i, m);
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    // ---- the falling sheet, built along a trajectory from lip to pool
    const segU = 8;
    const segS = 28;
    const drop = FALL.top.y - FALL.base.y;
    const out = new THREE.Vector3().subVectors(FALL.base, FALL.top).setY(0);
    const reach = out.length();
    out.normalize();
    const side = new THREE.Vector3(-out.z, 0, out.x);
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= segS; j++) {
      const s = j / segS; // 0 at the lip → 1 at the pool
      const horiz = reach * Math.sqrt(s);
      for (let i = 0; i <= segU; i++) {
        const u = i / segU;
        const spread = 1 + s * 0.35; // the sheet widens as it falls
        const p = FALL.top
          .clone()
          .addScaledVector(out, horiz)
          .addScaledVector(side, (u - 0.5) * FALL.width * spread);
        p.y = FALL.top.y - drop * s;
        pos.push(p.x, p.y, p.z);
        uv.push(u, s);
      }
    }
    for (let j = 0; j < segS; j++)
      for (let i = 0; i < segU; i++) {
        const a = j * (segU + 1) + i;
        const b = a + segU + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const sheetGeo = new THREE.BufferGeometry();
    sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sheetGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    sheetGeo.setIndex(idx);
    const sheetMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: wind.uTime, uSun: { value: sky.sun } },
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        varying vec2 vUv;
        void main(){
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime; uniform vec3 uSun;
        varying vec2 vUv;
        ${simplex3}
        ${fbmLite}
        void main(){
          float streak = fbm3(vec3(vUv.x * 9.0, vUv.y * 2.5 - uTime * 2.4, 0.0)) * 0.5 + 0.5;
          float fine = snoise(vec3(vUv.x * 30.0, vUv.y * 8.0 - uTime * 4.0, 1.0)) * 0.5 + 0.5;
          float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          float a = edge * (0.35 + 0.5 * streak + 0.2 * fine) * smoothstep(0.0, 0.14, vUv.y) * (0.55 + 0.45 * smoothstep(0.0, 0.3, vUv.y + streak * 0.15));
          vec3 water = mix(vec3(0.55, 0.68, 0.72), vec3(0.95, 0.98, 1.0), streak * 0.7 + vUv.y * 0.3);
          water *= 0.75 + 0.35 * uSun;
          gl_FragColor = vec4(water, clamp(a, 0.0, 0.92));
          #include <fog_fragment>
        }`,
    });
    const sheet = new THREE.Mesh(sheetGeo, sheetMat);

    // ---- mist where the water lands
    const MIST = 220;
    const seeds = new Float32Array(MIST * 4);
    for (let i = 0; i < MIST; i++) seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MIST * 3), 3));
    mistGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const mistMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: wind.uTime, uBase: { value: FALL.base.clone() }, uTint: { value: sky.fog } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uBase;
        attribute vec4 aSeed;
        varying float vA;
        void main(){
          float life = fract(uTime * (0.08 + aSeed.w * 0.08) + aSeed.z);
          float ang = aSeed.x * 6.2832;
          float r = 0.3 + life * (1.5 + aSeed.y * 2.0);
          vec3 p = uBase + vec3(cos(ang) * r, life * (1.2 + aSeed.y * 2.2), sin(ang) * r * 0.7);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = sin(life * 3.14159) * 0.16;
          gl_PointSize = min((30.0 + aSeed.y * 50.0) * (6.0 / -mv.z), 90.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTint;
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(mix(vec3(1.0), uTint, 0.3), a);
        }`,
    });
    const mist = new THREE.Points(mistGeo, mistMat);
    mist.frustumCulled = false;

    return {
      rocks,
      sheet,
      mist,
      dispose() {
        rockGeo.dispose();
        rockMat.dispose();
        rocks.dispose();
        sheetGeo.dispose();
        sheetMat.dispose();
        mistGeo.dispose();
        mistMat.dispose();
      },
    };
  }, []);

  useEffect(() => () => parts.dispose(), [parts]);

  return (
    <>
      <primitive object={parts.rocks} />
      <primitive object={parts.sheet} />
      <primitive object={parts.mist} />
    </>
  );
}
