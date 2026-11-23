'use client';

import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fontFamily, sampleTextPoints } from '@/lib/textures';
import { U, WORLD } from './state';
import { visibleHeight } from '@/engine/stage/rig';
import { useExperience } from '@/store/experience';

/**
 * Her name, assembled from thousands of glowing particles that drift in from
 * the galaxy and settle into Bodoni Moda letterforms.
 */
export function NameParticles({ text }: { text: string }) {
  const size = useThree((s) => s.size);
  const quality = useExperience((s) => s.quality);
  const [obj, setObj] = useState<{ geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial; aspect: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const family = fontFamily('--font-bodoni-src', 'Georgia, serif');
    void document.fonts.load(`500 200px ${family}`).then(() => {
      if (cancelled) return;
      const max = quality === 'high' ? 14000 : quality === 'medium' ? 9000 : 6000;
      const { points, aspect } = sampleTextPoints(text, '--font-bodoni-src', { weight: '500', maxPoints: max });
      const n = points.length / 2;
      const target = new Float32Array(n * 3);
      const start = new Float32Array(n * 3);
      const delay = new Float32Array(n);
      const sz = new Float32Array(n);
      const v = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        target.set([points[i * 2], points[i * 2 + 1], (Math.random() - 0.5) * 0.02], i * 3);
        v.randomDirection().multiplyScalar(1.5 + Math.random() * 4);
        start.set([v.x * 1.6, v.y, v.z - 2], i * 3);
        // letters assemble left → right with jitter
        delay[i] = (points[i * 2] / aspect + 0.5) * 0.7 + Math.random() * 0.3;
        sz[i] = 0.6 + Math.random() * 0.9;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(target, 3));
      geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
      geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.time, uP: U.name, uPixelRatio: U.pixelRatio, uScale: { value: 1 } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uP; uniform float uPixelRatio; uniform float uScale;
          attribute vec3 aStart; attribute float aDelay; attribute float aSize;
          varying float vE; varying float vSeed;
          void main(){
            float e = clamp(uP * 1.9 - aDelay, 0.0, 1.0);
            e = 1.0 - pow(1.0 - e, 3.0);
            vec3 tgt = position * uScale;
            vec3 p = mix(aStart * uScale, tgt, e);
            float w = (1.0 - e) * 0.35 + 0.004;
            p += vec3(sin(uTime * 0.9 + aDelay * 40.0), cos(uTime * 0.8 + aDelay * 31.0), sin(uTime * 0.6 + aDelay * 17.0)) * w;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vE = e; vSeed = aDelay;
            gl_PointSize = aSize * uPixelRatio * (1.0 + (1.0 - e) * 1.2) * (34.0 / -mv.z) * max(uScale, 0.6);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying float vE; varying float vSeed;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float c = pow(smoothstep(0.5, 0.0, d), 1.6);
            vec3 lav = vec3(0.78, 0.7, 1.0);
            vec3 white = vec3(1.0, 0.97, 0.99);
            float tw = 0.85 + 0.15 * sin(uTime * 2.0 + vSeed * 50.0);
            vec3 col = mix(lav, white, vE) * (0.35 + 0.65 * vE) * tw;
            gl_FragColor = vec4(col * c * 0.9, 1.0);
          }`,
      });
      setObj({ geo, mat, aspect });
    });
    return () => {
      cancelled = true;
    };
  }, [text, quality]);

  useEffect(
    () => () => {
      obj?.geo.dispose();
      obj?.mat.dispose();
    },
    [obj],
  );

  if (!obj) return null;

  // Fit the name to the viewport and place it at ~24% from the top.
  const d = WORLD.cam.z - WORLD.nameZ;
  const vh = visibleHeight(d, WORLD.fov);
  const vw = vh * (size.width / size.height);
  const scale = Math.min(vh * 0.2, (vw * 0.78) / obj.aspect);
  obj.mat.uniforms.uScale.value = scale;
  const y = WORLD.cam.y + (0.5 - 0.235) * vh;

  return <points geometry={obj.geo} material={obj.mat} position={[0, y, WORLD.nameZ]} frustumCulled={false} renderOrder={5} />;
}
