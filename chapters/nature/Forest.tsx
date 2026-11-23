'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { distanceToPath, forestDensity, heightAt, pathSamples } from './world';
import { wind } from './state';
import { useExperience, type Quality } from '@/store/experience';

/**
 * Conifer forest. Each tree: a tapered trunk + whorls of drooping branches, every branch a pair of
 * crossed alpha-tested needle cards (so it reads as a branch from the side AND from below).
 * 3 variants, each drawn as 2 InstancedMeshes (trunks, foliage) → 6 draw calls for the whole forest.
 * Wind is injected into the standard material, so lighting, fog and shadows all still work.
 */

const COUNT: Record<Quality, number> = { high: 240, medium: 150, low: 80 };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fir twig: tapered stem with dense needles, darker at the base. u = along the branch. */
function needleTexture() {
  const W = 256;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const r = rng(5);
  const drawTwig = (x0: number, y0: number, x1: number, y1: number, len: number, alpha: number) => {
    ctx.strokeStyle = `rgba(60,42,26,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const steps = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 2.2);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const l = len * (1 - t * 0.55) * (0.7 + r() * 0.5);
      const g = 48 + r() * 38 + t * 26;
      ctx.strokeStyle = `rgba(${18 + r() * 16},${g},${34 + r() * 18},${alpha})`;
      ctx.lineWidth = 1.6;
      for (const side of [-1, 1]) {
        const a = Math.atan2(y1 - y0, x1 - x0) + side * (0.7 + r() * 0.4);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
    }
  };
  // main twig along the card, with side twigs
  drawTwig(4, H / 2, W - 6, H / 2 + 4, 30, 1);
  for (let i = 0; i < 16; i++) {
    const t = 0.06 + i * 0.055;
    const x = 4 + (W - 10) * t;
    const side = i % 2 ? -1 : 1;
    drawTwig(x, H / 2, x + 46 * (1 - t * 0.5), H / 2 + side * (44 - t * 26), 17, 0.95);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

interface Built {
  trunk: THREE.BufferGeometry;
  foliage: THREE.BufferGeometry;
}

function buildConifer(seed: number, height: number, radius: number, whorls: number, perWhorl: number): Built {
  const r = rng(seed);
  const trunk = new THREE.CylinderGeometry(0.05, 0.26, height, 7, 3, true);
  trunk.translate(0, height / 2, 0);
  {
    const cols = new Float32Array(trunk.attributes.position.count * 3);
    for (let i = 0; i < cols.length / 3; i++) {
      const v = 0.75 + r() * 0.3;
      cols.set([0.36 * v, 0.27 * v, 0.2 * v], i * 3);
    }
    trunk.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3, tint: number) => {
    const base = pos.length / 3;
    for (const p of [a, b, c, d]) pos.push(p.x, p.y, p.z);
    for (let k = 0; k < 4; k++) nor.push(n.x, n.y, n.z);
    uv.push(0, 0, 0, 1, 1, 1, 1, 0);
    for (let k = 0; k < 4; k++) col.push(tint, tint * (0.95 + r() * 0.1), tint * 0.9);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1);
    const y = height * (0.2 + 0.78 * t);
    const reach = radius * Math.pow(1 - t, 0.85) * (0.85 + r() * 0.3) + 0.35;
    const n = Math.max(3, perWhorl - Math.floor(t * 3));
    for (let b = 0; b < n; b++) {
      const yaw = (b / n) * Math.PI * 2 + r() * 0.7 + w * 0.6;
      const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
      const droop = 0.25 + r() * 0.25;
      const start = new THREE.Vector3(0, y, 0).addScaledVector(dir, 0.08);
      const tip = start.clone().addScaledVector(dir, reach).addScaledVector(up, -droop * reach);
      const width = reach * 0.95 + 0.35;
      const roll = (r() - 0.5) * 0.7;
      const flatSide = side.clone().multiplyScalar(Math.cos(roll)).addScaledVector(up, Math.sin(roll));
      // soft, rounded lighting: normals lean outward and up like a canopy
      const normal = dir.clone().multiplyScalar(0.55).addScaledVector(up, 0.85).normalize();
      const tint = 0.72 + t * 0.35 + r() * 0.12;
      // card 1: the branch seen from above/below
      quad(
        start.clone().addScaledVector(flatSide, -width * 0.18),
        start.clone().addScaledVector(flatSide, width * 0.18),
        tip.clone().addScaledVector(flatSide, width * 0.5),
        tip.clone().addScaledVector(flatSide, -width * 0.5),
        normal,
        tint,
      );
      // card 2: crossed, so the branch also has a silhouette from the side
      const vSide = up.clone().multiplyScalar(Math.cos(roll)).addScaledVector(side, Math.sin(roll) * 0.3);
      quad(
        start.clone().addScaledVector(vSide, -width * 0.2),
        start.clone().addScaledVector(vSide, width * 0.2),
        tip.clone().addScaledVector(vSide, width * 0.45),
        tip.clone().addScaledVector(vSide, -width * 0.45),
        normal,
        tint * 0.92,
      );
    }
  }
  const foliage = new THREE.BufferGeometry();
  foliage.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  foliage.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  foliage.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  foliage.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  foliage.setIndex(idx);
  return { trunk, foliage };
}

/** Wind sway (quadratic with height) + needle flutter, injected into a built-in material. */
function addWind(mat: THREE.Material, sway: number, flutter: boolean, canopyNormals = false) {
  mat.onBeforeCompile = (shader) => {
    if (canopyNormals) {
      // DoubleSide flips the normal on back faces, which turned branch undersides pure black.
      // Foliage keeps its soft "canopy" normal on both sides instead.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''),
      );
    }
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uWind = wind.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 iOrigin = vec3(0.0);
        #endif
        float ph = iOrigin.x * 0.13 + iOrigin.z * 0.17;
        float hh = max(transformed.y, 0.0);
        float swayAmt = (sin(uTime * 0.9 + ph) + 0.4 * sin(uTime * 2.1 + ph * 1.7)) * uWind * hh * hh * ${sway.toFixed(5)};
        transformed.x += swayAmt;
        transformed.z += swayAmt * 0.6;
        ${flutter ? 'transformed += objectNormal * sin(uTime * 5.0 + position.x * 4.0 + position.z * 3.0 + ph) * 0.004 * hh;' : ''}`,
      );
  };
  mat.customProgramCacheKey = () => `wind-${sway}-${flutter}-${canopyNormals}`;
}

export function Forest() {
  const quality = useExperience((s) => s.quality);
  const count = COUNT[quality];

  const forest = useMemo(() => {
    const needles = needleTexture();
    const variants = [
      buildConifer(11, 11, 2.8, 16, 9),
      buildConifer(23, 8, 2.3, 13, 8),
      buildConifer(37, 14, 3.2, 19, 9),
    ];

    const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    addWind(trunkMat, 0.0012, false);
    const foliageMat = new THREE.MeshStandardMaterial({
      map: needles,
      vertexColors: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    addWind(foliageMat, 0.0012, true, true);
    // shadows must respect the needle alpha, otherwise every card casts a solid square
    const depthMat = new THREE.MeshDepthMaterial({ map: needles, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking });
    addWind(depthMat, 0.0012, false);

    // scatter: forest density, off the path, and not too close to each other
    const samples = pathSamples(30);
    const r = rng(42);
    const placed: { x: number; z: number; s: number; rot: number; v: number }[] = [];
    let attempts = 0;
    while (placed.length < count && attempts < count * 60) {
      attempts++;
      const x = -90 + r() * 180;
      const z = 45 - r() * 135;
      if (r() > forestDensity(x, z)) continue;
      if (distanceToPath(samples, x, z) < 5.5) continue; // crowns reach ~3 m: keep them out of the camera
      if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 5.5)) continue;
      placed.push({ x, z, s: 0.7 + r() * 0.6, rot: r() * Math.PI * 2, v: Math.floor(r() * variants.length) });
    }

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const meshes: THREE.InstancedMesh[] = [];
    variants.forEach((variant, vi) => {
      const mine = placed.filter((p) => p.v === vi);
      if (!mine.length) return;
      const trunks = new THREE.InstancedMesh(variant.trunk, trunkMat, mine.length);
      const crowns = new THREE.InstancedMesh(variant.foliage, foliageMat, mine.length);
      crowns.customDepthMaterial = depthMat;
      mine.forEach((p, i) => {
        e.set((r() - 0.5) * 0.06, p.rot, (r() - 0.5) * 0.06);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
        trunks.setMatrixAt(i, m);
        crowns.setMatrixAt(i, m);
      });
      for (const im of [trunks, crowns]) {
        im.castShadow = quality !== 'low';
        im.receiveShadow = quality !== 'low';
        im.frustumCulled = false; // one mesh spans the whole valley
        meshes.push(im);
      }
    });

    return {
      meshes,
      dispose() {
        variants.forEach((v) => {
          v.trunk.dispose();
          v.foliage.dispose();
        });
        meshes.forEach((im) => im.dispose());
        [trunkMat, foliageMat, depthMat].forEach((mat) => mat.dispose());
        needles.dispose();
      },
    };
  }, [count, quality]);

  useEffect(() => () => forest.dispose(), [forest]);

  return (
    <>
      {forest.meshes.map((im, i) => (
        <primitive key={i} object={im} />
      ))}
    </>
  );
}
