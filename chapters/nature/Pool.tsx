'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { FALL, POOL, WATER_Y } from './world';
import { sky } from './TimeOfDay';
import { wind } from './state';
import { useExperience } from '@/store/experience';

/**
 * The pool under the waterfall: a real reflection (three's Reflector, low-res + mip blur, like the
 * Universe floor) distorted by small wind ripples and rings spreading from where the water lands.
 * Grass and pollen live on layer 1, which the reflection camera does not render (big saving).
 * Low tier: no reflection pass, the surface reflects the sky colours only.
 */
const FRAG = /* glsl */ `
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uFog;
  uniform float uFogNear; uniform float uFogFar;
  uniform vec2 uImpact;
  uniform float uHasReflection;
  varying vec4 vUv;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    // wind ripples + rings spreading from the waterfall's landing point
    vec2 ripple = vec2(sin(p.x * 2.1 + uTime * 1.3) + sin(p.y * 1.7 - uTime * 1.1),
                       cos(p.y * 2.3 + uTime * 1.2) + cos(p.x * 1.5 + uTime * 0.9)) * 0.004;
    float d = distance(p, uImpact);
    ripple += normalize(p - uImpact + 0.0001) * sin(d * 7.0 - uTime * 5.0) * 0.012 * exp(-d * 0.35);
    vec3 V = normalize(cameraPosition - vWorld);
    float fresnel = 0.06 + 0.8 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
    // low tier (no reflection pass): a dimmed sky tint plus glints on the ripples, so it still
    // reads as dark water rather than a flat, sand-coloured sheet
    vec3 skyRefl = mix(uHorizon, uZenith, clamp(V.y * 1.5, 0.0, 1.0)) * 0.5;
    float glint = pow(max(sin(p.x * 3.1 + uTime * 1.4) * sin(p.y * 2.7 - uTime * 1.1), 0.0), 12.0);
    vec3 refl = skyRefl + uHorizon * glint * 0.6;
    if (uHasReflection > 0.5) {
      vec2 uv = vUv.xy / vUv.w + ripple;
      vec2 o = vec2(0.0025, 0.0015);
      refl = (texture2D(tDiffuse, uv + o, 2.4).rgb + texture2D(tDiffuse, uv - o, 2.4).rgb) * 0.41;
    }
    // foam where the water lands
    float foam = exp(-d * 1.4) * (0.6 + 0.4 * sin(uTime * 9.0 + d * 12.0));
    vec3 col = mix(color, refl, fresnel) + vec3(0.9) * foam * 0.35;
    float fog = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }`;

const VERT = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = textureMatrix * vec4(position, 1.0);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

function uniforms() {
  return {
    color: { value: new THREE.Color('#0d2420') },
    tDiffuse: { value: null as THREE.Texture | null },
    textureMatrix: { value: new THREE.Matrix4() },
    uTime: wind.uTime,
    uZenith: { value: sky.zenith },
    uHorizon: { value: sky.horizon },
    uFog: { value: sky.fog },
    uFogNear: { value: 20 },
    uFogFar: { value: 120 },
    uImpact: { value: new THREE.Vector2(FALL.base.x, FALL.base.z) },
    uHasReflection: { value: 0 },
  };
}

export function Pool() {
  const quality = useExperience((s) => s.quality);
  const scene = useThree((s) => s.scene);

  const water = useMemo(() => {
    const geometry = new THREE.CircleGeometry(POOL.r * 1.05, 64);
    if (quality === 'low') {
      const material = new THREE.ShaderMaterial({ uniforms: uniforms(), vertexShader: VERT, fragmentShader: FRAG });
      const mesh = new THREE.Mesh(geometry, material);
      return { mesh, geometry, dispose: () => material.dispose() };
    }
    const size = quality === 'high' ? 512 : 384;
    const reflector = new Reflector(geometry, {
      textureWidth: size,
      textureHeight: size,
      multisample: 0,
      color: new THREE.Color('#0d2420'),
      shader: { name: 'PoolShader', uniforms: uniforms(), vertexShader: VERT, fragmentShader: FRAG },
    });
    const target = reflector.getRenderTarget();
    target.texture.generateMipmaps = true;
    target.texture.minFilter = THREE.LinearMipmapLinearFilter;
    // Reflector clones the uniforms; re-link the live ones (wind clock, time-of-day colours)
    const u = (reflector.material as THREE.ShaderMaterial).uniforms;
    u.uTime = wind.uTime;
    u.uZenith.value = sky.zenith;
    u.uHorizon.value = sky.horizon;
    u.uFog.value = sky.fog;
    u.uHasReflection.value = 1;
    return { mesh: reflector as THREE.Mesh, geometry, dispose: () => reflector.dispose() };
  }, [quality]);

  useEffect(() => {
    water.mesh.rotation.x = -Math.PI / 2;
    water.mesh.position.set(POOL.x, WATER_Y, POOL.z);
    return () => {
      water.dispose();
      water.geometry.dispose();
    };
  }, [water]);

  useFrame(() => {
    const u = (water.mesh.material as THREE.ShaderMaterial).uniforms;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      u.uFogNear.value = fog.near;
      u.uFogFar.value = fog.far;
    }
  });

  return <primitive object={water.mesh} />;
}
