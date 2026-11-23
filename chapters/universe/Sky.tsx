'use client';

import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fbmLite, simplex3 } from '@/shaders/noise';
import { HORIZON, U } from './state';
import { useExperience } from '@/store/experience';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main(){
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }`;

/**
 * The nebula's look: ~20 simplex evaluations per pixel. Far too expensive to run every frame
 * on integrated GPUs (Phase 1 audit: the universe was fill-rate bound), so it is only ever
 * rendered ONCE, into a cubemap, when the chapter mounts.
 */
function nebulaBakeMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uHorizon: { value: new THREE.Color(HORIZON) } },
    vertexShader: SKY_VERTEX,
    fragmentShader: /* glsl */ `
          uniform vec3 uHorizon;
          varying vec3 vDir;
          ${simplex3}
          void main(){
            vec3 d = normalize(vDir);
            float n = fbm(d * 1.5);
            float n2 = fbm(d * 3.1 + n * 1.6);
            float n3 = fbm(d * 7.0 + n2 * 0.8);
            // tilted galactic band
            float band = exp(-pow((d.y - 0.12 + d.x * 0.18 + n * 0.22) / 0.38, 2.0));
            vec3 deep = vec3(0.012, 0.006, 0.03);
            vec3 violet = vec3(0.20, 0.07, 0.40);
            vec3 orchid = vec3(0.52, 0.22, 0.62);
            vec3 pink = vec3(0.92, 0.52, 0.74);
            vec3 lav = vec3(0.66, 0.56, 1.0);
            vec3 col = deep;
            col = mix(col, violet, smoothstep(-0.35, 0.55, n2) * band);
            col = mix(col, orchid, smoothstep(0.15, 0.75, n2) * band * 0.7);
            col += pink * pow(max(n3 + n2 * 0.5, 0.0), 3.0) * band * 0.55;
            col += lav * pow(max(n, 0.0), 3.0) * 0.25;
            // dark dust lanes
            col *= 1.0 - smoothstep(0.1, 0.5, fbm(d * 4.0 + 3.1)) * band * 0.55;
            // melt into exactly the fog colour near the horizon, so sky and floor meet without a seam
            float h = 1.0 - smoothstep(-0.02, 0.3, d.y);
            col = mix(col, uHorizon, h);
            gl_FragColor = vec4(col, 1.0);
          }`,
  });
}

/** Deep-purple nebula: baked once into a cubemap, then displayed with a single texture lookup. */
export function Nebula() {
  const gl = useThree((s) => s.gl);
  const quality = useExperience((s) => s.quality);
  const size = quality === 'high' ? 1024 : quality === 'medium' ? 768 : 512;

  const sky = useMemo(() => {
    const target = new THREE.WebGLCubeRenderTarget(size, { generateMipmaps: false });
    const bakeScene = new THREE.Scene();
    const bakeGeo = new THREE.SphereGeometry(100, 64, 32);
    const bakeMat = nebulaBakeMaterial();
    bakeScene.add(new THREE.Mesh(bakeGeo, bakeMat));
    const cubeCamera = new THREE.CubeCamera(1, 500, target);

    const display = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uSky: { value: target.texture }, uReveal: U.reveal },
      vertexShader: SKY_VERTEX,
      fragmentShader: /* glsl */ `
        uniform samplerCube uSky; uniform float uReveal;
        varying vec3 vDir;
        void main(){
          vec3 col = textureCube(uSky, normalize(vDir)).rgb * uReveal;
          // blue-noise-ish dither hides 8-bit banding in the dark gradients
          float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          col += (n - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });

    return {
      display,
      bake() {
        const autoClear = gl.autoClear;
        gl.autoClear = true;
        cubeCamera.update(gl, bakeScene);
        gl.autoClear = autoClear;
      },
      dispose() {
        target.dispose();
        target.texture.dispose();
        bakeGeo.dispose();
        bakeMat.dispose();
        display.dispose();
      },
    };
  }, [gl, size]);

  useLayoutEffect(() => {
    sky.bake();
  }, [sky]);
  useEffect(() => () => sky.dispose(), [sky]);

  return (
    <mesh material={sky.display} renderOrder={-10}>
      <sphereGeometry args={[220, 48, 24]} />
    </mesh>
  );
}

/** Starfield that can collapse into a single point of light (T1 arrival) and burst open. */
export function Stars() {
  const quality = useExperience((s) => s.quality);
  const count = quality === 'high' ? 16000 : quality === 'medium' ? 9000 : 5000;

  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#e4daff'), new THREE.Color('#c9b6ff'), new THREE.Color('#f4b6d2')];
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.randomDirection();
      // concentrate more stars in the galactic band
      if (Math.random() < 0.45) v.y *= 0.25;
      v.normalize().multiplyScalar(40 + Math.random() * 140);
      pos.set([v.x, v.y, v.z], i * 3);
      const big = Math.random() < 0.015;
      size[i] = big ? 4 + Math.random() * 4 : 0.6 + Math.pow(Math.random(), 3) * 2.6;
      const c = palette[Math.floor(Math.random() * (Math.random() < 0.7 ? 2 : 4))];
      color.set([c.r, c.g, c.b], i * 3);
      phase[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: U.time, uBurst: U.burst, uPixelRatio: U.pixelRatio },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uBurst; uniform float uPixelRatio;
        attribute float aSize; attribute vec3 aColor; attribute float aPhase;
        varying vec3 vColor; varying float vTw;
        void main(){
          float b = uBurst;
          vec3 p = position * mix(1.0, 0.01 + aPhase * 0.012, b);
          float ang = b * 3.0 * (aPhase - 0.5);
          float c = cos(ang), s = sin(ang);
          p.xz = mat2(c, -s, s, c) * p.xz;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vTw = 0.6 + 0.4 * sin(uTime * (0.6 + aPhase * 2.4) + aPhase * 60.0);
          vColor = mix(aColor, vec3(1.0, 0.97, 1.0), b);
          float sz = aSize * uPixelRatio * (1.0 + b * b * 4.0) * (150.0 / -mv.z);
          gl_PointSize = clamp(sz, 0.0, 90.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vTw;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = pow(smoothstep(0.5, 0.0, d), 2.4);
          float spike = max(0.0, 1.0 - abs(gl_PointCoord.x - 0.5) * 18.0) * max(0.0, 1.0 - abs(gl_PointCoord.y - 0.5) * 2.2)
                      + max(0.0, 1.0 - abs(gl_PointCoord.y - 0.5) * 18.0) * max(0.0, 1.0 - abs(gl_PointCoord.x - 0.5) * 2.2);
          float a = core + spike * 0.25;
          gl_FragColor = vec4(vColor * a * vTw, 1.0);
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

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** Shader planet with banded fbm surface, terminator lighting and a fresnel atmosphere. */
export function Planet({
  position,
  radius,
  colorA,
  colorB,
  atmosphere,
  bands = 6,
  ring,
  tilt = 0.3,
}: {
  position: [number, number, number];
  radius: number;
  colorA: string;
  colorB: string;
  atmosphere: string;
  bands?: number;
  ring?: { inner: number; outer: number; color: string };
  tilt?: number;
}) {
  const { surface, atmo, ringMat } = useMemo(() => {
    const surface = new THREE.ShaderMaterial({
      uniforms: {
        uTime: U.time,
        uReveal: U.reveal,
        uA: { value: new THREE.Color(colorA) },
        uB: { value: new THREE.Color(colorB) },
        uAtmo: { value: new THREE.Color(atmosphere) },
        uBands: { value: bands },
        uLight: { value: new THREE.Vector3(-0.6, 0.5, 0.65).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vP; varying vec3 vV;
        void main(){
          vP = position;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uReveal; uniform vec3 uA; uniform vec3 uB; uniform vec3 uAtmo;
        uniform float uBands; uniform vec3 uLight;
        varying vec3 vN; varying vec3 vP; varying vec3 vV;
        ${simplex3}
        ${fbmLite}
        void main(){
          vec3 p = normalize(vP);
          float n = fbm3(p * 2.2 + vec3(uTime * 0.01, 0.0, 0.0));
          float b = sin(p.y * uBands * 3.14159 + n * 3.0) * 0.5 + 0.5;
          float storms = smoothstep(0.35, 0.7, fbm3(p * 6.0 + n));
          vec3 col = mix(uA, uB, b);
          col = mix(col, uB * 1.25, storms * 0.35);
          vec3 N = normalize(vN);
          float diff = smoothstep(-0.15, 0.9, dot(N, uLight));
          float fres = pow(1.0 - max(dot(N, normalize(vV)), 0.0), 3.0);
          col = col * (0.04 + diff * 0.96) + uAtmo * fres * (0.4 + diff) * 1.4;
          gl_FragColor = vec4(col * uReveal, 1.0);
        }`,
    });
    const atmo = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(atmosphere) }, uReveal: U.reveal },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uReveal;
        varying vec3 vN; varying vec3 vV;
        void main(){
          float i = pow(max(0.0, 0.72 + dot(normalize(vN), normalize(vV))), 4.0);
          gl_FragColor = vec4(uColor * i * 1.6 * uReveal, 1.0);
        }`,
    });
    const ringMat = ring
      ? new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uColor: { value: new THREE.Color(ring.color) },
            uInner: { value: ring.inner },
            uOuter: { value: ring.outer },
            uReveal: U.reveal,
          },
          vertexShader: /* glsl */ `
            varying vec3 vP;
            void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor; uniform float uInner; uniform float uOuter; uniform float uReveal;
            varying vec3 vP;
            void main(){
              float r = (length(vP.xy) - uInner) / (uOuter - uInner);
              float bands = 0.55 + 0.45 * sin(r * 60.0) * sin(r * 13.0 + 1.0);
              float edge = smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.8, r);
              float gap = 1.0 - smoothstep(0.02, 0.0, abs(r - 0.62)) * 0.8;
              gl_FragColor = vec4(uColor * bands * 1.2, edge * bands * gap * 0.75 * uReveal);
            }`,
        })
      : null;
    return { surface, atmo, ringMat };
  }, [colorA, colorB, atmosphere, bands, ring]);

  useEffect(
    () => () => {
      surface.dispose();
      atmo.dispose();
      ringMat?.dispose();
    },
    [surface, atmo, ringMat],
  );

  return (
    <group position={position} rotation={[0.2, 0, tilt]}>
      <mesh material={surface}>
        <sphereGeometry args={[radius, 96, 64]} />
      </mesh>
      <mesh material={atmo} scale={1.18}>
        <sphereGeometry args={[radius, 64, 32]} />
      </mesh>
      {ringMat && ring && (
        <mesh material={ringMat} rotation={[Math.PI / 2.3, 0, 0]}>
          <ringGeometry args={[ring.inner, ring.outer, 160, 1]} />
        </mesh>
      )}
    </group>
  );
}
