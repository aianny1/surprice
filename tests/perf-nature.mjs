/**
 * Performance + GPU-leak audit for Chapter 03 (Her Wild Side).
 *
 *   BASE_URL=http://localhost:3100 node tests/perf-nature.mjs [--gpu=intel|nvidia] [--tiers=auto,medium,low,high]
 *
 * Per tier: frame rate at each of the 4 stops (after the camera settles), draw calls, and live GPU
 * objects after walking Universe → Nature → back 3 times (anything that grows is a leak).
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screens');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const gpu = (process.argv.find((a) => a.startsWith('--gpu=')) ?? '--gpu=intel').slice(6);
const tiers = (process.argv.find((a) => a.startsWith('--tiers=')) ?? '--tiers=auto,high,medium,low').slice(8).split(',');

const PROBE = () => {
  const stats = { draws: 0, textures: 0, buffers: 0, programs: 0, framebuffers: 0 };
  window.__gl = stats;
  const P = window.WebGL2RenderingContext.prototype;
  const wrap = (name, fn) => {
    const orig = P[name];
    P[name] = function (...a) {
      fn();
      return orig.apply(this, a);
    };
  };
  for (const d of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) wrap(d, () => stats.draws++);
  wrap('createTexture', () => stats.textures++);
  wrap('deleteTexture', () => stats.textures--);
  wrap('createBuffer', () => stats.buffers++);
  wrap('deleteBuffer', () => stats.buffers--);
  wrap('createProgram', () => stats.programs++);
  wrap('deleteProgram', () => stats.programs--);
  wrap('createFramebuffer', () => stats.framebuffers++);
  wrap('deleteFramebuffer', () => stats.framebuffers--);
};

const sample = (page, ms = 3000) =>
  page.evaluate(
    (dur) =>
      new Promise((resolve) => {
        const d0 = window.__gl.draws;
        const t0 = performance.now();
        let f = 0;
        const tick = () => {
          f++;
          if (performance.now() - t0 < dur) requestAnimationFrame(tick);
          else resolve({ fps: Math.round((f * 1000) / (performance.now() - t0)), draws: Math.round((window.__gl.draws - d0) / f) });
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

const unlocked = (page) =>
  page.waitForFunction(() => document.querySelector('[data-input-lock]')?.getAttribute('data-input-lock') === 'off', null, {
    timeout: 60000,
  });
const objects = (page) => page.evaluate(() => ({ ...window.__gl, draws: undefined }));

for (const tier of tiers) {
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'];
  if (gpu === 'nvidia') args.push('--force_high_performance_gpu');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(PROBE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const q = tier === 'auto' ? '' : `&quality=${tier}`;
  const r = { gpu, tier, stops: [] };

  // arrive the real way (portal → dawn), so the measured scene is the one she sees
  await page.goto(`${BASE}/universe?preview=1${q}`);
  await unlocked(page);
  await page.click('[data-testid="enter-world"]');
  await page.waitForURL(/nature/);
  await unlocked(page);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) {
    if (i) {
      await page.click('[data-testid="nature-continue"]');
      await page.waitForTimeout(3200);
    }
    r.stops.push(await sample(page));
    if (i === 2) await page.screenshot({ path: path.join(OUT, `nature-${gpu}-${tier}-stop2.png`) });
  }
  r.tierAfter = await page.evaluate(() => document.querySelector('[data-stage]')?.getAttribute('data-quality'));

  // leak check: nature ⇄ universe, three round trips, compared in the same chapter
  const before = await objects(page);
  for (let k = 0; k < 3; k++) {
    await page.goBack();
    await page.waitForURL(/universe/);
    await unlocked(page);
    await page.goForward();
    await page.waitForURL(/nature/);
    await unlocked(page);
  }
  await page.waitForTimeout(1500);
  const after = await objects(page);
  r.leak = Object.fromEntries(['textures', 'buffers', 'programs', 'framebuffers'].map((k) => [k, after[k] - before[k]]));
  r.heapMB = await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576));
  r.errors = errors.length;
  console.log(
    `${gpu.padEnd(6)} ${tier.padEnd(6)} → ${r.tierAfter} | ` +
      r.stops.map((s, i) => `stop${i} ${s.fps}fps/${s.draws}dc`).join('  ') +
      ` | leak ${JSON.stringify(r.leak)} heap ${r.heapMB}MB errors ${r.errors}`,
  );
  await browser.close();
}
