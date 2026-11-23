'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pointer, rig } from './rig';
import { useExperience } from '@/store/experience';

const offset = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useFrame((state, dt) => {
    const reduced = useExperience.getState().reducedMotion;
    const k = 1 - Math.pow(0.001, Math.min(dt, 0.1)); // frame-rate independent smoothing
    pointer.x += (pointer.tx - pointer.x) * k * 0.6;
    pointer.y += (pointer.ty - pointer.y) * k * 0.6;

    const p = reduced ? 0 : rig.parallax;
    offset.set(pointer.x * p, pointer.y * p * 0.6, 0);

    if (rig.shake > 0 && !reduced) {
      const t = state.clock.elapsedTime * 40;
      offset.x += Math.sin(t * 1.3) * rig.shake;
      offset.y += Math.cos(t * 1.7) * rig.shake;
    }

    camera.position.copy(rig.position).add(offset);
    camera.lookAt(rig.target);
    if (rig.roll) camera.rotateZ(rig.roll);

    if (Math.abs(camera.fov - rig.fov) > 1e-3) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
