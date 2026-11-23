'use client';

import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { fbmLite, simplex3 } from '@/shaders/noise';
import { U, WORLD } from './state';
import { useExperience } from '@/store/experience';

/**
 * The glowing portal: swirling shader disc with a hot ring, a polished silver frame,
 * and particles spiralling into it. Inside, a glimpse of the warm "next world".
 */
export const Portal = forwardRef<THREE.Group>(function Portal(_, ref) {
  const quality = useExperience((s) => s.quality);
  const R = WORLD.portal.radius;

  const disc = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: { uTime: U.time, uOpen: U.portalOpen, uSpin: U.portalSpin, uFill: U.portalFill },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uOpen; uniform float uSpin; uniform float uFill;
          varying vec2 vUv;
          ${simplex3}
          ${fbmLite}
          void main(){
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            float a = atan(p.y, p.x);
            float t = uTime * (0.22 + uSpin * 0.9);
            float sw = a + t + (1.0 - r) * (3.5 + uSpin * 2.0);
            vec3 q = vec3(cos(sw) * r * 2.0, sin(sw) * r * 2.0, uTime * 0.08);
            float n = fbm3(q * 1.3);
            float ringR = 0.6;
            float rr = r + n * 0.045;
            float open = smoothstep(0.0, 1.0, uOpen);
            float ring = exp(-pow((rr - ringR) / (0.022 + 0.01 * uSpin), 2.0));
            float halo = exp(-pow((rr - ringR) / 0.13, 2.0)) * 0.45;
            float wisps = smoothstep(0.15, 0.85, fbm3(vec3(sw * 1.3, r * 5.0 - t * 1.4, uTime * 0.05)))
                        * exp(-pow((r - ringR - 0.05) / 0.2, 2.0));
            float inside = smoothstep(ringR + 0.015, ringR - 0.06, rr);

            vec3 deep = vec3(0.09, 0.025, 0.2);
            vec3 warm = vec3(1.0, 0.95, 0.9);
            float glimpse = smoothstep(0.58, 0.0, r) * (0.4 + 0.6 * smoothstep(-0.3, 0.6, n));
            vec3 insideCol = mix(deep, warm * 0.85, clamp(glimpse * 0.22 + uFill, 0.0, 1.0));
            insideCol += vec3(0.5, 0.32, 0.95) * pow(max(n, 0.0), 2.0) * 0.55 * (1.0 - uFill);

            vec3 ringCol = mix(vec3(0.8, 0.72, 1.0), vec3(1.0, 0.72, 0.85), 0.5 + 0.5 * sin(a * 2.0 + t * 1.5));
            vec3 col = insideCol * inside
                     + ringCol * (ring * (3.2 + uSpin) + halo)
                     + ringCol * wisps * 0.9;
            float alpha = clamp(inside * 0.97 + ring + halo + wisps * 0.7, 0.0, 1.0);
            alpha *= smoothstep(1.0, 0.86, r);
            // irising open from the centre
            alpha *= smoothstep(open * 1.05, open * 1.05 - 0.15, r);
            gl_FragColor = vec4(col, alpha * open);
          }`,
      }),
    [],
  );

  const particles = useMemo(() => {
    const count = quality === 'high' ? 1800 : 900;
    const angle = new Float32Array(count);
    const radius = new Float32Array(count);
    const speed = new Float32Array(count);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      angle[i] = Math.random() * Math.PI * 2;
      radius[i] = Math.random();
      speed[i] = 0.4 + Math.random() * 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: U.time, uOpen: U.portalOpen, uSpin: U.portalSpin, uR: { value: R }, uPixelRatio: U.pixelRatio },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uOpen; uniform float uSpin; uniform float uR; uniform float uPixelRatio;
        attribute float aAngle; attribute float aRadius; attribute float aSpeed;
        varying float vA;
        void main(){
          float k = fract(aRadius - uTime * 0.05 * aSpeed * (1.0 + uSpin * 3.0));
          float r = uR * (1.0 + k * 1.4);
          float a = aAngle + uTime * aSpeed * (0.25 + uSpin) + (1.0 - k) * 2.5;
          vec3 p = vec3(cos(a) * r, sin(a) * r, -k * 0.6 + 0.05);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = smoothstep(0.0, 0.25, k) * smoothstep(1.0, 0.5, k) * uOpen;
          gl_PointSize = (1.2 + aSpeed * 1.6) * uPixelRatio * (16.0 / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float c = pow(smoothstep(0.5, 0.0, d), 2.0);
          gl_FragColor = vec4(vec3(0.85, 0.78, 1.0) * c * vA * 1.4, 1.0);
        }`,
    });
    return { geo, mat };
  }, [quality, R]);

  const frame = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d9dbe6',
        metalness: 1,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 2.2,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  useEffect(
    () => () => {
      disc.dispose();
      particles.geo.dispose();
      particles.mat.dispose();
      frame.dispose();
    },
    [disc, particles, frame],
  );

  return (
    <group ref={ref} position={[WORLD.portal.x, WORLD.portal.y, WORLD.portal.z]}>
      <mesh material={disc} scale={(R / 0.6) * 2} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <points geometry={particles.geo} material={particles.mat} frustumCulled={false} renderOrder={3} />
      <mesh material={frame} name="portal-frame">
        <torusGeometry args={[R * 1.06, 0.028, 24, 256]} />
      </mesh>
      <mesh material={frame} rotation-z={0.3}>
        <torusGeometry args={[R * 1.16, 0.008, 12, 256]} />
      </mesh>
      <pointLight color="#c9b6ff" intensity={18} distance={14} decay={2} position={[0, 0, 0.6]} name="portal-light" />
    </group>
  );
});
