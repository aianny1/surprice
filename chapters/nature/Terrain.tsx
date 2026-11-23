'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createNoise2D } from '@/lib/noise';
import { heightAt, TERRAIN_SIZE } from './world';
import { useExperience } from '@/store/experience';

/**
 * Height-field ground. Heights come from the same function the camera path uses, so the
 * walk always stays at eye height. Colour is baked per vertex: moss on flat ground,
 * soil near the pool, rock on steep slopes and the summit.
 */
export function Terrain() {
  const quality = useExperience((s) => s.quality);
  const segments = quality === 'high' ? 220 : quality === 'medium' ? 150 : 100;

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -15);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geometry.computeVertexNormals();

    const detail = createNoise2D(21);
    const moss = new THREE.Color('#3d5a33');
    const mossDark = new THREE.Color('#263a22');
    const dry = new THREE.Color('#6b6a3c');
    const soil = new THREE.Color('#4a3b2c');
    const rock = new THREE.Color('#6a6662');
    const out = new THREE.Color();
    const colors = new Float32Array(pos.count * 3);
    const nrm = geometry.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = detail(x * 0.15, z * 0.15) * 0.5 + 0.5;
      out.copy(mossDark).lerp(moss, n);
      out.lerp(dry, Math.max(0, detail(x * 0.04 + 9, z * 0.04) * 0.6));
      const steep = 1 - nrm.getY(i);
      out.lerp(rock, THREE.MathUtils.smoothstep(steep, 0.18, 0.45));
      out.lerp(rock, THREE.MathUtils.smoothstep(y, 9, 15) * 0.7);
      const pool = Math.hypot(x + 13, z + 27);
      out.lerp(soil, (1 - THREE.MathUtils.smoothstep(pool, 6, 11)) * 0.8);
      colors.set([out.r, out.g, out.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
    return { geometry, material };
  }, [segments]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh geometry={geometry} material={material} receiveShadow />;
}
