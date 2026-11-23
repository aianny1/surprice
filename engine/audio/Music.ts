'use client';

import { useExperience } from '@/store/experience';
import type { ChapterId } from '@/engine/chapters';
import { sfx } from './AudioManager';

/**
 * Original generative score, synthesised live (no audio files, nothing licensed or streamed).
 * Instruments: a celesta/soft-piano voice (additive partials, bell decay), a warm string pad,
 * a soft sine bass, all through a generated reverb. Each chapter sets its own mood.
 * The finale can cue the (public-domain) "Happy Birthday" melody on the celesta.
 */
const BPM = 72;
const STEP = 60 / BPM / 2; // eighth notes
const STEPS_PER_BAR = 8;
const VOLUME = 0.32;

const CHORDS = [
  { bass: 50, pad: [62, 66, 69, 73] }, // Dmaj7
  { bass: 47, pad: [62, 66, 69, 71] }, // Bm7
  { bass: 43, pad: [62, 66, 67, 71] }, // Gmaj7
  { bass: 45, pad: [61, 64, 69, 71] }, // A add9
];

const MOOD: Record<ChapterId, { density: number; cutoff: number }> = {
  intro: { density: 0.3, cutoff: 1300 },
  universe: { density: 0.45, cutoff: 1800 },
  nature: { density: 0.5, cutoff: 2300 },
  travel: { density: 0.55, cutoff: 2500 },
  artist: { density: 0.45, cutoff: 2000 },
  film: { density: 0.6, cutoff: 2600 },
  dimension: { density: 0.5, cutoff: 2100 },
  memories: { density: 0.35, cutoff: 1600 },
  surprise: { density: 0.25, cutoff: 1500 },
};

// Happy Birthday (public domain) in D, as [midi, beats]
const BIRTHDAY: [number, number][] = [
  [69, 0.75], [69, 0.25], [71, 1], [69, 1], [74, 1], [73, 2],
  [69, 0.75], [69, 0.25], [71, 1], [69, 1], [76, 1], [74, 2],
  [69, 0.75], [69, 0.25], [81, 1], [78, 1], [74, 1], [73, 1], [71, 2],
  [79, 0.75], [79, 0.25], [78, 1], [74, 1], [76, 1], [74, 3],
];

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  /** Background score bus (pads, bass, arpeggio); fades out for the finale melody. */
  private bgDry: GainNode | null = null;
  private bgWet: GainNode | null = null;
  private bgOff = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private mood = MOOD.intro;
  private melodyUntil = 0;

  start() {
    const ctx = sfx.context;
    if (!ctx || this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(ctx.destination);
    this.dry = ctx.createGain();
    this.dry.connect(this.out);
    // reverb: decaying stereo noise impulse
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.55;
    this.wet.connect(verb).connect(this.out);
    this.bgDry = ctx.createGain();
    this.bgDry.connect(this.dry);
    this.bgWet = ctx.createGain();
    this.bgWet.connect(this.wet);
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = this.mood.cutoff;
    this.padFilter.Q.value = 0.5;
    this.padFilter.connect(this.bgDry);
    this.padFilter.connect(this.bgWet);

    this.nextTime = ctx.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 100);
    this.applyMute();
    useExperience.subscribe((s, p) => {
      if (s.sound !== p.sound) this.applyMute();
      if (s.current && s.current !== p.current) this.setChapter(s.current);
    });
    const cur = useExperience.getState().current;
    if (cur) this.setChapter(cur);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.visibilityState === 'hidden') void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private applyMute() {
    if (!this.ctx || !this.out) return;
    const on = useExperience.getState().sound;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(on ? VOLUME : 0, t + (on ? 2.5 : 0.4));
  }

  setChapter(id: ChapterId) {
    this.mood = MOOD[id] ?? MOOD.intro;
    if (this.ctx && this.padFilter) this.padFilter.frequency.setTargetAtTime(this.mood.cutoff, this.ctx.currentTime, 2);
    // leaving the finale (browser back): bring the score back
    if (id !== 'surprise' && this.bgOff) this.fadeBg(1, 3);
  }

  private fadeBg(to: number, secs: number) {
    const ctx = this.ctx;
    if (!ctx || !this.bgDry || !this.bgWet) return;
    const t = ctx.currentTime;
    for (const g of [this.bgDry.gain, this.bgWet.gain]) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(to, t + secs);
    }
    this.bgOff = to === 0;
    if (to > 0) this.melodyUntil = 0;
  }

  /**
   * Finale: the background score fades away over ~3.5 s, then only the birthday tune plays
   * on the celesta, twice (the second time a little softer with a low harmony).
   */
  birthday() {
    if (!this.ctx) return;
    this.fadeBg(0, 3.5);
    let t = this.ctx.currentTime + 3.2;
    const beat = 0.62;
    for (let round = 0; round < 2; round++) {
      const v = round === 0 ? 0.55 : 0.4;
      for (const [m, b] of BIRTHDAY) {
        this.bell(t, m, v, b * beat + 1.2, true);
        this.bell(t, m - 12, v * 0.25, b * beat + 0.8, true);
        if (round === 1) this.bell(t, m - 5, v * 0.18, b * beat + 0.8, true);
        t += b * beat;
      }
      t += beat * 2;
    }
    this.melodyUntil = t;
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + 0.3) {
      this.tick(this.nextTime);
      this.nextTime += STEP;
      this.step++;
    }
  }

  private tick(t: number) {
    const s = this.step % STEPS_PER_BAR;
    const chord = CHORDS[Math.floor(this.step / STEPS_PER_BAR) % CHORDS.length];
    const bar = STEP * STEPS_PER_BAR;
    if (this.bgOff && (this.bgDry?.gain.value ?? 0) < 0.01) return; // faded out for the finale
    if (s === 0) {
      chord.pad.forEach((m) => this.pad(t, m, bar + 1.5));
      this.bass(t, chord.bass, bar);
    }
    if (t < this.melodyUntil || this.bgOff) return; // let the melody sing alone
    const p = s === 0 ? 0.9 : s % 2 === 0 ? this.mood.density : this.mood.density * 0.45;
    if (Math.random() < p) {
      const pool = chord.pad.map((m) => m + 12).concat(chord.pad.map((m) => m + 24).slice(0, 2));
      const m = pool[Math.floor(Math.random() * pool.length)];
      this.bell(t + (Math.random() - 0.5) * 0.02, m, 0.16 + Math.random() * 0.1, 2.2);
    }
  }

  /** Celesta / soft piano: a few inharmonic-ish partials with a fast bell decay. */
  private bell(t: number, midi: number, vel: number, dur: number, lead = false) {
    const ctx = this.ctx!;
    const f = hz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // the finale melody bypasses the background bus so it keeps singing after the fade
    g.connect(lead ? this.dry! : this.bgDry!);
    g.connect(lead ? this.wet! : this.bgWet!);
    const parts: [number, number][] = [[1, 1], [2, 0.32], [3.01, 0.12], [4.2, 0.05]];
    for (const [k, a] of parts) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * k;
      const pg = ctx.createGain();
      pg.gain.value = a * 0.35;
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /** Warm strings: two detuned saws per note, slow swell, through the mood filter. */
  private pad(t: number, midi: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.022, t + 1.6);
    g.gain.setValueAtTime(0.022, t + dur - 1.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(this.padFilter!);
    for (const d of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(midi);
      o.detune.value = d;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private bass(t: number, midi: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.bgDry!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

export const music = new Music();

/**
 * The score tries to start as soon as the page loads. Browsers that allow autoplay for this site
 * play it straight away; the rest keep the audio context suspended until the first tap/click/key
 * anywhere, and the score starts right then. Sound is on by default; the toggle mutes it.
 */
if (typeof window !== 'undefined') {
  const begin = () => {
    sfx.unlock();
    music.start();
    if (sfx.context?.state === 'running') {
      window.removeEventListener('pointerdown', begin);
      window.removeEventListener('keydown', begin);
      window.removeEventListener('touchend', begin);
      window.removeEventListener('pointerup', begin);
      window.removeEventListener('click', begin);
    }
  };
  window.addEventListener('pointerdown', begin);
  window.addEventListener('keydown', begin);
  window.addEventListener('touchend', begin);
  window.addEventListener('pointerup', begin);
  window.addEventListener('click', begin);
  // attempt autoplay on load
  if (document.readyState === 'complete') setTimeout(begin, 0);
  else window.addEventListener('load', () => setTimeout(begin, 0), { once: true });
}
