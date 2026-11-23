'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { HORIZON, WORLD } from './state';

/**
 * Dark polished floor with soft reflections of the bright things above it (portal, name, planets).
 *
 * Replaces drei's MeshReflectorMaterial, which never disposes its two render targets nor its
 * BlurPass targets: ~8 MB of GPU memory leaked per visit on the medium tier (Phase 2 audit).
 * three's Reflector owns a single low-res target and frees everything in dispose().
 * Softness comes from sampling the target's mipmaps with an LOD bias (a smooth, nearly free blur;
 * a small tap blur on the raw texture made point lights look like square pixels). A threshold keeps
 * the dim nebula out of the reflection so only bright things (portal, name, planets) mirror.
 * Distance fog matches the scene fog so the floor melts into the horizon haze.
 */
const MirrorShader = {
  name: 'MirrorFloorShader',
  uniforms: {
    color: { value: null as THREE.Color | null },
    tDiffuse: { value: null as THREE.Texture | null },
    textureMatrix: { value: null as THREE.Matrix4 | null },
    uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
    uStrength: { value: 0.5 },
    uBias: { value: 2.2 },
    uThreshold: { value: 0.05 },
    uHorizon: { value: new THREE.Color(HORIZON) },
    uFogNear: { value: 18 },
    uFogFar: { value: 80 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    uniform float uStrength;
    uniform float uBias;
    uniform float uThreshold;
    uniform vec3 uHorizon;
    uniform float uFogNear;
    uniform float uFogFar;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vec2 uv = vUv.xy / vUv.w;
      // 4 rotated taps on a blurred mip level → soft, round highlights
      vec2 o = uTexel * 2.5;
      vec3 r = (
        texture2D(tDiffuse, uv + vec2( o.x,  o.y * 0.5), uBias).rgb +
        texture2D(tDiffuse, uv + vec2(-o.x * 0.5,  o.y), uBias).rgb +
        texture2D(tDiffuse, uv + vec2(-o.x, -o.y * 0.5), uBias).rgb +
        texture2D(tDiffuse, uv + vec2( o.x * 0.5, -o.y), uBias).rgb
      ) * 0.25;
      r = max(r - uThreshold, 0.0);
      vec3 V = normalize(cameraPosition - vWorld);
      // stronger at grazing angles, like real polished stone
      float fresnel = mix(0.35, 1.0, pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0));
      vec3 col = color + r * uStrength * fresnel;
      float fog = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
      gl_FragColor = vec4(mix(col, uHorizon, fog), 1.0);
    }`,
};

export function MirrorFloor({ resolution }: { resolution: number }) {
  const mirror = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(260, 260);
    const reflector = new Reflector(geometry, {
      textureWidth: resolution,
      textureHeight: resolution,
      color: new THREE.Color('#06030b'),
      multisample: 0,
      shader: MirrorShader,
    });
    // mipmapped reflection target: the shader samples a blurred LOD
    const target = reflector.getRenderTarget();
    target.texture.generateMipmaps = true;
    target.texture.minFilter = THREE.LinearMipmapLinearFilter;
    const mat = reflector.material as THREE.ShaderMaterial;
    mat.uniforms.uTexel.value.set(1 / resolution, 1 / resolution);
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = WORLD.floorY;
    return { reflector, geometry };
  }, [resolution]);

  useEffect(
    () => () => {
      mirror.reflector.dispose();
      mirror.geometry.dispose();
    },
    [mirror],
  );

  return <primitive object={mirror.reflector} />;
}
