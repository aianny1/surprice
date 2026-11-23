'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { simplex3, fbmLite } from '@/shaders/noise';
import { wind } from './state';

/**
 * The butterfly she follows out of the chapter (T3: Butterfly → Sky).
 * It lives in camera space: lifts off from the flowers at the lower right, flies at the lens,
 * opens its wings flat across the whole screen, and the wing pattern melts into a cloudy sky.
 *
 * Driven by `hero` (tweened by GSAP): t = flight 0→1, open = wings flat 0→1, morph = wing→sky 0→1.
 */
export const hero = { t: 0, open: 0, morph: 0, visible: 0 };

const START = new THREE.Vector3(1.5, -0.95, -5.5);
const END = new THREE.Vector3(0, 0, -0.32);

export function HeroButterfly() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const mesh = useRef<THREE.Mesh>(null!);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 1.1, 24, 2);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: wind.uTime,
        uOpen: { value: 0 },
        uMorph: { value: 0 },
        uAspect: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uOpen;
        varying vec2 vUv;
        void main(){
          vUv = uv;
          vec3 p = position;
          // wings fold toward the camera on each beat; flat once open
          float beat = sin(uTime * 13.0) * 0.5 + 0.5;
          float ang = mix(0.15, 1.15, beat) * (1.0 - uOpen);
          float span = abs(p.x);
          p.z = span * sin(ang);
          p.x = sign(p.x) * span * cos(ang);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uMorph; uniform float uOpen;
        varying vec2 vUv;
        ${simplex3}
        ${fbmLite}
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
          // iridescent blue wing with a dark velvet margin and a glowing edge
          vec3 inner = vec3(0.05, 0.12, 0.42);
          vec3 blue = vec3(0.25, 0.6, 1.0);
          vec3 col = mix(inner, blue, smoothstep(0.05, 0.7, p.x));
          col += vec3(0.4, 0.75, 1.0) * 0.35 * (0.5 + 0.5 * sin(p.x * 10.0 - p.y * 6.0 + uTime * 2.0));
          float margin = smoothstep(-0.18, -0.03, wing);
          col = mix(col, vec3(0.02, 0.03, 0.08), margin * 0.85);
          col += vec3(0.7, 0.9, 1.0) * smoothstep(-0.03, 0.0, wing) * step(wing, 0.02) * 1.2;
          col = mix(col, vec3(0.02), step(body, 0.0) * (1.0 - uMorph));
          float alpha = smoothstep(0.03, -0.03, shape);

          // the wings become sky: the shape grows to the whole quad, colours become clouds
          vec3 skyTop = vec3(0.36, 0.62, 0.92);
          vec3 skyLow = vec3(0.96, 0.9, 0.82);
          vec3 sky = mix(skyLow, skyTop, smoothstep(0.0, 1.0, vUv.y));
          float cloud = smoothstep(0.1, 0.7, fbm3(vec3(vUv * vec2(3.0, 2.0), uTime * 0.03)) + 0.25);
          sky = mix(sky, vec3(1.0), cloud * 0.65);
          float m = smoothstep(0.0, 1.0, uMorph);
          // morph sweeps outward from the body, so the change reads as the wing pattern dissolving
          float sweep = smoothstep(m * 1.4 - 0.4, m * 1.4, length(p) * 0.8);
          float k = clamp(m * 1.2 - sweep * 0.2, 0.0, 1.0);
          gl_FragColor = vec4(mix(col, sky, k), mix(alpha, 1.0, k));
        }`,
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    // only while actually flying, so playing the flight backwards also hides it again
    m.visible = hero.visible > 0 && hero.t > 0.002;
    if (!m.visible) return;
    const t = hero.t;
    // flight in camera space: a lazy wobble that straightens as it accelerates at the lens
    tmp.p.lerpVectors(START, END, t);
    const wob = (1 - t) * 0.35;
    tmp.p.x += Math.sin(state.clock.elapsedTime * 2.1) * wob;
    tmp.p.y += Math.sin(state.clock.elapsedTime * 3.3) * wob * 0.6 + Math.sin(t * Math.PI) * 0.45;
    tmp.p.applyMatrix4(camera.matrixWorld);
    m.position.copy(tmp.p);
    m.quaternion.copy(camera.quaternion);
    // a little roll and tilt while flying, square to the lens once open
    m.rotateZ((1 - hero.open) * Math.sin(state.clock.elapsedTime * 1.7) * 0.35);
    m.rotateX((1 - hero.open) * -0.5);
    const s = THREE.MathUtils.lerp(0.18, 0.62, Math.pow(t, 1.5));
    m.scale.setScalar(s);
    material.uniforms.uOpen.value = hero.open;
    material.uniforms.uMorph.value = hero.morph;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={999} frustumCulled={false} visible={false} />;
}
