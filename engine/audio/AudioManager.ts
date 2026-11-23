'use client';

import { useExperience } from '@/store/experience';

/**
 * Tiny Web Audio manager. SFX are synthesised (no files needed), only play when the
 * visitor has switched sound on, and the context is created on that first user gesture.
 * Music (finale) will plug into the same master bus later.
 */
export type SfxId = 'crack' | 'paper' | 'whoosh' | 'shimmer' | 'portal' | 'rewind' | 'tick';

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  get context() {
    return this.ctx;
  }

  /** Must be called from a user gesture (first tap anywhere, or the sound toggle). */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private get on() {
    return useExperience.getState().sound && !!this.ctx && !!this.master;
  }

  private noiseSource() {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  play(id: SfxId) {
    if (!this.on) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.01;
    try {
      switch (id) {
        case 'crack': {
          for (let i = 0; i < 3; i++) {
            const src = this.noiseSource();
            const hp = ctx.createBiquadFilter();
            hp.type = 'bandpass';
            hp.frequency.value = 1800 + i * 900;
            hp.Q.value = 3;
            const g = ctx.createGain();
            this.env(g, t + i * 0.035, 0.002, 0.9 - i * 0.25, 0.06);
            src.connect(hp).connect(g).connect(this.master!);
            src.start(t + i * 0.035);
            src.stop(t + i * 0.035 + 0.12);
          }
          break;
        }
        case 'paper': {
          const src = this.noiseSource();
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(2600, t);
          bp.frequency.linearRampToValueAtTime(4200, t + 0.5);
          bp.Q.value = 0.8;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          for (let i = 0; i < 8; i++) g.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.12, t + 0.05 + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
          src.connect(bp).connect(g).connect(this.master!);
          src.start(t);
          src.stop(t + 0.8);
          break;
        }
        case 'whoosh': {
          const src = this.noiseSource();
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.Q.value = 1.2;
          bp.frequency.setValueAtTime(180, t);
          bp.frequency.exponentialRampToValueAtTime(3200, t + 1.7);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.5, t + 1.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
          src.connect(bp).connect(g).connect(this.master!);
          src.start(t);
          src.stop(t + 2.3);
          break;
        }
        case 'shimmer': {
          const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
          notes.forEach((f, i) => {
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = f;
            const g = ctx.createGain();
            this.env(g, t + i * 0.09, 0.01, 0.12, 1.8);
            const d = ctx.createDelay();
            d.delayTime.value = 0.23;
            const fb = ctx.createGain();
            fb.gain.value = 0.35;
            o.connect(g);
            g.connect(this.master!);
            g.connect(d).connect(fb).connect(d);
            fb.connect(this.master!);
            o.start(t + i * 0.09);
            o.stop(t + i * 0.09 + 2.2);
          });
          break;
        }
        case 'portal': {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(55, t);
          o.frequency.exponentialRampToValueAtTime(110, t + 2.5);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.35, t + 1.6);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
          o.connect(g).connect(this.master!);
          o.start(t);
          o.stop(t + 3.1);
          break;
        }
        case 'rewind': {
          const src = this.noiseSource();
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(2500, t);
          bp.frequency.exponentialRampToValueAtTime(300, t + 0.8);
          const g = ctx.createGain();
          this.env(g, t, 0.05, 0.3, 0.8);
          src.connect(bp).connect(g).connect(this.master!);
          src.start(t);
          src.stop(t + 1);
          break;
        }
        case 'tick': {
          const o = ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = 1400;
          const g = ctx.createGain();
          this.env(g, t, 0.002, 0.15, 0.08);
          o.connect(g).connect(this.master!);
          o.start(t);
          o.stop(t + 0.12);
          break;
        }
      }
    } catch {
      /* audio is decorative: never let it break the experience */
    }
  }
}

export const sfx = new AudioManager();
