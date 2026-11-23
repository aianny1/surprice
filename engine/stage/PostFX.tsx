'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect, type NoiseEffect, type VignetteEffect } from 'postprocessing';
import * as THREE from 'three';
import { fx } from './rig';
import type { Quality } from '@/store/experience';

/** Cinematic finishing: bloom, chromatic fringe, film grain, vignette, ACES. Values driven by `fx`. */
export function PostFX({ quality }: { quality: Quality }) {
  const bloom = useRef<BloomEffect>(null);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const noise = useRef<NoiseEffect>(null);
  const vig = useRef<VignetteEffect>(null);

  useFrame(() => {
    if (bloom.current) {
      bloom.current.intensity = fx.bloom;
      bloom.current.luminanceMaterial.threshold = fx.bloomThreshold;
      bloom.current.luminanceMaterial.smoothing = fx.bloomSmoothing;
    }
    if (ca.current) ca.current.offset.set(fx.aberration, fx.aberration * 0.6);
    if (noise.current) noise.current.blendMode.opacity.value = fx.grain;
    if (vig.current) vig.current.darkness = fx.vignette;
  });

  const high = quality === 'high';

  // MSAA on every composer tier: without it, slightly tilted straight edges (envelope, letter) stair-step.
  // FXAA was tried and rejected: merged into the tone-mapping pass it re-samples the untoned HDR buffer.
  return (
    <EffectComposer multisampling={high ? 4 : 2} enableNormalPass={false}>
      <Bloom
        ref={bloom}
        mipmapBlur
        intensity={fx.bloom}
        luminanceThreshold={fx.bloomThreshold}
        luminanceSmoothing={fx.bloomSmoothing}
        radius={0.78}
        levels={high ? 7 : 5}
      />
      <ChromaticAberration
        ref={ca}
        offset={new THREE.Vector2(fx.aberration, fx.aberration)}
        radialModulation
        modulationOffset={0.35}
      />
      <Noise ref={noise} premultiply blendFunction={BlendFunction.SCREEN} opacity={fx.grain} />
      <Vignette ref={vig} offset={0.22} darkness={fx.vignette} />
      {/* The composer disables renderer tone mapping, so apply ACES here, after bloom. */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
