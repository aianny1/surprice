'use client';

import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap } from '@/animation/gsap';
import { fx, FX_DEFAULTS, pointer, rig } from '@/engine/stage/rig';
import { useSceneReady } from '@/engine/stage/useSceneReady';
import type { EnterMode } from '@/engine/transition/transitions';
import { useExperience } from '@/store/experience';
import { TimeOfDay, skyRevealUniform } from './TimeOfDay';
import { Terrain } from './Terrain';
import { Mountains } from './Mountains';
import { Forest } from './Forest';
import { Grass } from './Grass';
import { Pool } from './Pool';
import { Waterfall } from './Waterfall';
import { Flowers } from './Flowers';
import { NatureButterflies } from './NatureButterflies';
import { LightShafts, Pollen } from './Atmosphere';
import { LightSeeds } from './LightSeeds';
import { HeroButterfly, hero } from './HeroButterfly';
import { sfx } from '@/engine/audio/AudioManager';
import { cameraAt, heightAt } from './world';
import { nearestStop, natureScene, REFLECTION_EXCLUDED, resetWalk, settleStop, useWalkStop, walk, wind } from './state';

const NATURE_FX = { bloom: 0.7, bloomThreshold: 0.8, vignette: 0.55, aberration: 0.0003, grain: 0.04 };
/** Seconds without input before the walk settles onto the nearest stop. */
const SETTLE_AFTER = 0.45;

/**
 * Chapter 03 · Her Wild Side.
 * Chunk 3C: time-of-day sky, terrain, distant ranges and the walk along the camera path.
 */
export default function NatureScene() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const quality = useExperience((s) => s.quality);
  const camera = useThree((s) => s.camera);
  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      ray: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      hit: new THREE.Vector3(),
      lastPointer: new THREE.Vector2(),
      gust: 0,
    }),
    [],
  );

  useSceneReady('nature');

  // One-time chapter setup. Must NOT depend on `quality`: an adaptive downgrade mid-walk used to
  // re-run this and reset the walk back to dawn (Chunk 3H finding).
  useLayoutEffect(() => {
    resetWalk();
    Object.assign(hero, { t: 0, open: 0, morph: 0, visible: 0 });
    useWalkStop.getState().set(0);
    scene.background = null;
    rig.fov = 42;
    rig.parallax = 0.12;
    cameraAt(0, rig.position, rig.target);
    Object.assign(fx, FX_DEFAULTS, NATURE_FX);
    camera.layers.enable(REFLECTION_EXCLUDED);
    return () => camera.layers.disable(REFLECTION_EXCLUDED);
  }, [scene, camera]);

  // Sun shadows follow the quality tier (off on low).
  useLayoutEffect(() => {
    gl.shadowMap.enabled = quality !== 'low';
    gl.shadowMap.type = THREE.PCFShadowMap; // PCFSoft was removed in this three.js version
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.enabled = false;
    };
  }, [gl, quality]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    // same clock as the DOM input handlers (performance.now), so the settle delay is exact
    const now = performance.now() / 1000;
    // settle onto the nearest stop once input pauses
    if (now - walk.lastInput > SETTLE_AFTER) {
      const s = settleStop(walk.target, walk.dir);
      walk.target += (s - walk.target) * (1 - Math.pow(0.02, d));
    }
    walk.progress += (walk.target - walk.progress) * (1 - Math.pow(0.08, d));

    cameraAt(walk.progress, tmp.pos, tmp.look);
    // entrance: drift in from a little further back and higher
    tmp.pos.z += walk.arrive * 6;
    tmp.pos.y += walk.arrive * 1.2;
    // a slow breath, like standing still in morning air
    tmp.pos.y += Math.sin(state.clock.elapsedTime * 0.5) * 0.025;
    rig.position.copy(tmp.pos);
    rig.target.copy(tmp.look);

    const stop = nearestStop(walk.progress);
    if (stop !== useWalkStop.getState().stop) useWalkStop.getState().set(stop);

    // wind clock, and a soft gust that follows her pointer / finger over the ground
    wind.uTime.value = state.clock.elapsedTime;
    const moved = Math.hypot(pointer.tx - tmp.lastPointer.x, pointer.ty - tmp.lastPointer.y);
    tmp.lastPointer.set(pointer.tx, pointer.ty);
    tmp.gust = Math.max(tmp.gust * Math.pow(0.25, d), Math.min(1, moved * 18));
    if (tmp.gust > 0.01) {
      tmp.ndc.set(pointer.tx, pointer.ty);
      tmp.ray.setFromCamera(tmp.ndc, camera);
      const o = tmp.ray.ray.origin;
      const dir = tmp.ray.ray.direction;
      for (let t = 1; t < 45; t += 0.75) {
        tmp.hit.copy(o).addScaledVector(dir, t);
        if (tmp.hit.y < heightAt(tmp.hit.x, tmp.hit.z)) break;
      }
      wind.uGust.value.x = tmp.hit.x;
      wind.uGust.value.y = tmp.hit.z;
    }
    wind.uGust.value.z = tmp.gust;
  });

  useEffect(() => {
    const arrive = (mode: EnterMode) => {
      const tl = gsap.timeline();
      const reveal = skyRevealUniform(scene);
      const fast = mode === 'rewind' || useExperience.getState().reducedMotion;
      if (mode === 'light') {
        // out of the portal: already bright, hidden in thick mist that slowly lifts
        if (reveal) reveal.value = 1;
        walk.haze = 1;
        tl.to(walk, { haze: 0, duration: fast ? 1 : 4.2, ease: 'power2.inOut' }, 0);
        tl.fromTo(fx, { bloom: 2.2 }, { bloom: NATURE_FX.bloom, duration: 3, ease: 'power2.out' }, 0);
      } else if (reveal) {
        tl.fromTo(reveal, { value: 0 }, { value: 1, duration: fast ? 0.8 : 2.4, ease: 'power2.inOut' }, 0);
      }
      tl.fromTo(walk, { arrive: 1 }, { arrive: 0, duration: fast ? 1 : 3.4, ease: 'cinema' }, 0);
      return tl;
    };
    const followButterfly = () => {
      const tl = gsap.timeline();
      Object.assign(hero, { t: 0, open: 0, morph: 0, visible: 1 });
      tl.call(() => sfx.play('whoosh'), [], 0.4);
      // lifts off the flowers, wanders, then accelerates at the lens
      tl.fromTo(hero, { t: 0 }, { t: 1, duration: 3.0, ease: 'power2.in' }, 0);
      tl.fromTo(hero, { open: 0 }, { open: 1, duration: 0.8, ease: 'power2.out' }, 2.4);
      tl.fromTo(hero, { morph: 0 }, { morph: 1, duration: 0.9, ease: 'power1.inOut' }, 2.7);
      tl.to(fx, { bloom: 1.4, duration: 1.2, ease: 'power1.in' }, 2.0);
      return tl;
    };
    natureScene.api = { arrive, followButterfly };
    return () => {
      natureScene.api = null;
    };
  }, [scene]);

  const shadows = quality !== 'low';
  return (
    <>
      <TimeOfDay shadows={shadows} />
      <Mountains />
      <Terrain />
      <Forest />
      <Grass />
      <Flowers />
      <Pool />
      <Waterfall />
      <NatureButterflies />
      <Pollen />
      <LightShafts />
      <LightSeeds />
      <HeroButterfly />
    </>
  );
}
