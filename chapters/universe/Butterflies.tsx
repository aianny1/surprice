'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { U, WORLD } from './state';
import { useExperience } from '@/store/experience';

/**
 * GPU butterflies: one instanced geometry, flight paths and wing flaps computed
 * entirely in the vertex shader (zero per-frame JS). Wings are an SDF so they stay crisp.
 */
export function Butterflies() {
  const quality = useExperience((s) => s.quality);
  const reduced = useExperience((s) => s.reducedMotion);
  const count = quality === 'high' ? 34 : quality === 'medium' ? 20 : 10;

  const { geo, mat } = useMemo(() => {
    // wing plane: x ∈ [-1,1] (span), y ∈ [-0.5,0.5] (body axis); 2 segments so the hinge is at x = 0
    const base = new THREE.PlaneGeometry(2, 1.1, 2, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    geo.instanceCount = count;

    const orbit = new Float32Array(count * 4); // radius, speed, phase, height
    const center = new Float32Array(count * 3);
    const look = new Float32Array(count * 2); // scale, hue
    for (let i = 0; i < count; i++) {
      const aroundPortal = i % 3 !== 0;
      orbit.set(
        [
          aroundPortal ? WORLD.portal.radius * (1.25 + Math.random() * 1.4) : 2.5 + Math.random() * 4,
          (0.18 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1),
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * (aroundPortal ? 2.2 : 3),
        ],
        i * 4,
      );
      center.set(
        aroundPortal
          ? [WORLD.portal.x, WORLD.portal.y, WORLD.portal.z + 0.5]
          : [(Math.random() - 0.5) * 4, 1.4 + Math.random() * 1.5, -2 - Math.random() * 3],
        i * 3,
      );
      look.set([0.15 + Math.random() * 0.1, Math.random()], i * 2);
    }
    geo.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(orbit, 4));
    geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(center, 3));
    geo.setAttribute('aLook', new THREE.InstancedBufferAttribute(look, 2));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      // Normal blending so wings read as solid, coloured shapes (additive turned them into glowing blobs).
      blending: THREE.NormalBlending,
      uniforms: { uTime: U.time, uReveal: U.butterflies, uFlapAmt: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uFlapAmt;
        attribute vec4 aOrbit; attribute vec3 aCenter; attribute vec2 aLook;
        varying vec2 vUv; varying float vHue; varying float vSide;
        void main(){
          float t = uTime * aOrbit.y + aOrbit.z;
          vec3 c = aCenter + vec3(cos(t) * aOrbit.x, aOrbit.w + sin(t * 1.7) * 0.35, sin(t) * aOrbit.x * 0.55);
          vec3 fwd = normalize(vec3(-sin(t) * aOrbit.x, cos(t * 1.7) * 0.6, cos(t) * aOrbit.x * 0.55) * sign(aOrbit.y));
          vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
          vec3 up = cross(right, fwd);

          float flap = (sin(uTime * 14.0 + aOrbit.z * 10.0) * 0.5 + 0.5);
          float ang = mix(0.15, 1.25, flap) * uFlapAmt;
          float side = sign(position.x);
          float span = abs(position.x);
          vec3 local = right * side * span * cos(ang) + up * span * sin(ang) + fwd * position.y;
          vec3 world = c + local * aLook.x;
          vUv = uv; vHue = aLook.y; vSide = side;
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uReveal;
        varying vec2 vUv; varying float vHue;
        float ell(vec2 p, vec2 c, vec2 r, float rot){
          p -= c; float cs = cos(rot), sn = sin(rot);
          p = mat2(cs, -sn, sn, cs) * p;
          return length(p / r) - 1.0;
        }
        void main(){
          // p.x: 0 at the body → 1 at the wing tip; p.y: + forward
          vec2 p = vec2(abs(vUv.x - 0.5) * 2.0, vUv.y - 0.5);
          float fore = ell(p, vec2(0.47, 0.16), vec2(0.5, 0.3), -0.55);
          float hind = ell(p, vec2(0.31, -0.2), vec2(0.29, 0.24), 0.5);
          float wing = min(fore, hind);
          float body = length(vec2(p.x / 0.05, p.y / 0.4)) - 1.0;
          float shape = min(wing, body);
          float alpha = smoothstep(0.03, -0.03, shape);
          if (alpha < 0.01) discard;

          vec3 lav = vec3(0.79, 0.69, 1.0);
          vec3 pink = vec3(1.0, 0.68, 0.84);
          vec3 inner = vec3(0.24, 0.1, 0.48);
          vec3 outer = mix(lav, pink, vHue);
          vec3 col = mix(inner, outer, smoothstep(0.08, 0.85, p.x));
          // radial veins from the body
          float veins = smoothstep(0.85, 1.0, abs(sin(atan(p.y, p.x) * 9.0)));
          col *= 1.0 - veins * 0.35 * smoothstep(0.1, 0.5, p.x);
          // luminous rim + two pearl spots: the bits that catch the bloom
          float rim = smoothstep(-0.14, -0.02, wing) * step(wing, 0.0);
          col += outer * rim * 0.6;
          float spots = smoothstep(0.07, 0.0, length(p - vec2(0.7, 0.24))) + smoothstep(0.05, 0.0, length(p - vec2(0.42, -0.26)));
          col += vec3(1.0, 0.92, 0.98) * spots * 0.35;
          col = mix(col, vec3(0.12, 0.06, 0.18), step(body, 0.0));
          gl_FragColor = vec4(col, alpha * 0.95 * uReveal);
        }`,
    });
    return { geo, mat };
  }, [count]);

  useEffect(() => {
    mat.uniforms.uFlapAmt.value = reduced ? 0.25 : 1;
  }, [reduced, mat]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />;
}
