'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createSkyState, skyAt, type Sky } from './world';
import { walk } from './state';
import { rig } from '@/engine/stage/rig';

/** Shared, per-frame sky state (other nature components read it: mountains, water later). */
export const sky: Sky = createSkyState();

/**
 * Hand-graded sky + sun + hemisphere light + fog, all driven by walk progress
 * (dawn at the forest edge → sunset on the summit).
 */
export function TimeOfDay({ shadows }: { shadows: boolean }) {
  const scene = useThree((s) => s.scene);
  const sunLight = useRef<THREE.DirectionalLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uZenith: { value: sky.zenith },
          uMid: { value: sky.mid },
          uHorizon: { value: sky.horizon },
          uFog: { value: sky.fog },
          uSun: { value: sky.sun },
          uSunDir: { value: sky.sunDir },
          uReveal: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uFog;
          uniform vec3 uSun; uniform vec3 uSunDir; uniform float uReveal;
          varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
            col = mix(col, uZenith, smoothstep(0.2, 0.8, h));
            // below / at the horizon the sky melts into the fog, so distant terrain has no seam
            col = mix(col, uFog, 1.0 - smoothstep(-0.02, 0.08, h));
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            // sun disc + Mie-like halo, warmer and wider when the sun is low
            float low = 1.0 - smoothstep(0.0, 0.5, uSunDir.y);
            col += uSun * (pow(s, 900.0) * 6.0 + pow(s, 32.0) * (0.25 + 0.5 * low) + pow(s, 6.0) * 0.12 * low);
            gl_FragColor = vec4(col * uReveal, 1.0);
          }`,
      }),
    [],
  );

  useEffect(() => {
    scene.fog = new THREE.Fog(sky.fog.clone(), 10, 100);
    return () => {
      scene.fog = null;
      skyMat.dispose();
    };
  }, [scene, skyMat]);

  useFrame(() => {
    skyAt(walk.progress, sky);
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(sky.fog);
      // arriving out of the portal light: the morning starts thick with mist and clears
      const h = walk.haze;
      fog.near = sky.fogNear * (1 - h) + 0.5 * h;
      fog.far = sky.fogFar * (1 - h) + 14 * h;
    }
    if (sunLight.current) {
      sunLight.current.color.copy(sky.sun);
      sunLight.current.intensity = sky.sunIntensity;
      // the shadow frustum follows the camera, a little ahead of it
      const target = sunLight.current.target;
      target.position.set(rig.position.x, rig.position.y - 1.7, rig.position.z).lerp(rig.target, 0.25);
      target.updateMatrixWorld();
      sunLight.current.position.copy(sky.sunDir).multiplyScalar(80).add(target.position);
    }
    if (hemi.current) {
      hemi.current.color.copy(sky.hemiSky);
      hemi.current.groundColor.copy(sky.hemiGround);
      hemi.current.intensity = sky.hemiIntensity;
    }
  });

  return (
    <>
      <mesh material={skyMat} name="nature-sky" renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[400, 48, 24]} />
      </mesh>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sunLight}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
    </>
  );
}

/** uReveal fades the sky in during the chapter entrance. */
export function skyRevealUniform(scene: THREE.Scene) {
  const mesh = scene.getObjectByName('nature-sky') as THREE.Mesh | undefined;
  return (mesh?.material as THREE.ShaderMaterial | undefined)?.uniforms.uReveal ?? null;
}
