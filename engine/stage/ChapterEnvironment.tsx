'use client';

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** A studio light panel, same semantics as drei's <Lightformer> (faces the origin). */
export interface Former {
  form: 'rect' | 'ring' | 'circle';
  color: string;
  intensity: number;
  position: [number, number, number];
  scale: number | [number, number, number];
}

/**
 * Per-chapter reflection lighting, baked once with PMREMGenerator.fromScene().
 *
 * Why not drei <Environment>: drei renders into a cube render target, and three.js then converts
 * that cube to a PMREM inside a private renderer cache that is *never* released for render-target
 * textures (no dispose listener). Every chapter visit leaked ~36 framebuffers (Phase 1 audit).
 * Here we own the PMREM target and dispose it on unmount, so a visit costs nothing afterwards.
 */
export function ChapterEnvironment({
  formers,
  intensity = 1,
  resolution = 256,
}: {
  formers: Former[];
  intensity?: number;
  resolution?: number;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    const studio = new THREE.Scene();
    studio.background = new THREE.Color('#000000');
    const geometries = {
      rect: new THREE.PlaneGeometry(1, 1),
      ring: new THREE.RingGeometry(0.5, 1, 64),
      circle: new THREE.CircleGeometry(1, 64),
    };
    const materials: THREE.Material[] = [];
    for (const f of formers) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(f.color).multiplyScalar(f.intensity),
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      materials.push(mat);
      const mesh = new THREE.Mesh(geometries[f.form], mat);
      mesh.position.set(...f.position);
      if (typeof f.scale === 'number') mesh.scale.setScalar(f.scale);
      else mesh.scale.set(...f.scale);
      mesh.lookAt(0, 0, 0);
      studio.add(mesh);
    }

    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(studio, 0, 0.1, 100, { size: resolution });
    pmrem.dispose();
    Object.values(geometries).forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());

    const prev = { env: scene.environment, intensity: scene.environmentIntensity };
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    return () => {
      if (scene.environment === target.texture) {
        scene.environment = prev.env;
        scene.environmentIntensity = prev.intensity;
      }
      target.dispose();
    };
    // formers are static per chapter; rebuilding on identity change would re-bake needlessly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, intensity, resolution]);

  return null;
}
