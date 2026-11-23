/**
 * Performance audit (Phase 1).
 *
 *   BASE_URL=http://localhost:3100 node tests/perf.mjs [--gpu=intel|nvidia|both] [--quick]
 *
 * For each GPU × quality tier it measures, only after the chapter's entrance has finished:
 *   - frame times (avg fps, p50, p95, frames > 33ms) over 5 s with vsync on
 *   - WebGL draw calls per frame and live GPU objects (textures / buffers / programs)
 *   - frame times *during* the envelope → galaxy transition (T1)
 *   - JS / font bytes downloaded on first load of /intro
 *   - GPU object growth after looping intro ⇄ universe (leak check)
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const gpuArg = (process.argv.find((a) => a.startsWith('--gpu=')) ?? '--gpu=both').slice(6);
const quick = process.argv.includes('--quick');
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screens');
mkdirSync(OUT, { recursive: true });

// Injected before any page script: counts draw calls and live GPU objects.
const PROBE = () => {
  const stats = { draws: 0, textures: 0, buffers: 0, programs: 0, framebuffers: 0 };
  window.__gl = stats;
  for (const Ctx of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!Ctx) continue;
    const P = Ctx.prototype;
    const wrap = (name, fn) => {
      const orig = P[name];
      if (!orig) return;
      P[name] = function (...a) {
        fn(a);
        return orig.apply(this, a);
      };
    };
    for (const d of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'])
      wrap(d, () => stats.draws++);
    wrap('createTexture', () => stats.textures++);
    wrap('deleteTexture', () => stats.textures--);
    wrap('createBuffer', () => stats.buffers++);
    wrap('deleteBuffer', () => stats.buffers--);
    wrap('createProgram', () => stats.programs++);
    wrap('deleteProgram', () => stats.programs--);
    wrap('createFramebuffer', () => stats.framebuffers++);
    wrap('deleteFramebuffer', () => stats.framebuffers--);
  }
};

const sample = (page, ms) =>
  page.evaluate(
    (dur) =>
      new Promise((resolve) => {
        const times = [];
        const d0 = window.__gl.draws;
        let last = performance.now();
        const start = last;
        const tick = (t) => {
          times.push(t - last);
          last = t;
          if (t - start < dur) requestAnimationFrame(tick);
          else {
            times.shift();
            const s = [...times].sort((a, b) => a - b);
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            resolve({
              fps: Math.round(1000 / avg),
              p50: +s[Math.floor(s.length * 0.5)].toFixed(1),
              p95: +s[Math.floor(s.length * 0.95)].toFixed(1),
              long: times.filter((x) => x > 33.4).length,
              frames: times.length,
              drawsPerFrame: Math.round((window.__gl.draws - d0) / times.length),
            });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

const gpuObjects = (page) => page.evaluate(() => ({ ...window.__gl, draws: undefined }));
const renderer = (page) =>
  page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
const unlocked = (page, timeout = 40000) =>
  page.waitForFunction(() => document.querySelector('[data-input-lock]')?.getAttribute('data-input-lock') === 'off', null, {
    timeout,
  });
const canvasInfo = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('[data-stage] canvas');
    return c ? `${c.width}x${c.height}` : 'none';
  });

async function run(gpu, label, { viewport, dpr = 1, mobile = false, quality }) {
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'];
  if (gpu === 'nvidia') args.push('--force_high_performance_gpu');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(PROBE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const q = quality ? `?quality=${quality}` : '';
  const r = { gpu, label, quality: quality ?? 'auto' };

  await page.goto(`${BASE}/intro${q}`, { waitUntil: 'load' });
  r.renderer = (await renderer(page)).replace(/ANGLE \(|Direct3D11.*$/g, '').trim();
  r.firstLoad = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource');
    const sum = (f) => Math.round(res.filter(f).reduce((a, e) => a + (e.transferSize || e.encodedBodySize), 0) / 1024);
    return { jsKB: sum((e) => e.name.endsWith('.js')), fontKB: sum((e) => /\.woff2?$/.test(e.name)), requests: res.length };
  });
  await unlocked(page);
  await page.waitForTimeout(1500);
  r.canvas = await canvasInfo(page);
  r.introIdle = await sample(page, 5000);

  await page.click('[data-testid="open"]');
  await page.waitForSelector('[data-testid="step-inside"]', { state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2500);
  r.letterOpen = await sample(page, 4000);

  await page.click('[data-testid="step-inside"]');
  r.transitionT1 = await sample(page, 4500);
  await page.waitForURL('**/universe', { timeout: 20000 });
  r.universeArrival = await sample(page, 4000);
  await unlocked(page);
  await page.waitForTimeout(1500);
  r.universeIdle = await sample(page, 5000);
  r.gpuObjects = await gpuObjects(page);
  r.tierAfter = await page.evaluate(() => document.querySelector('[data-stage]')?.getAttribute('data-quality'));
  await page.screenshot({ path: path.join(OUT, `perf-${gpu}-${label}.png`) });

  if (!quick) {
    // leak check: back/forward loop 4×, then compare live GPU objects in the same chapter
    const before = await gpuObjects(page);
    for (let i = 0; i < 4; i++) {
      await page.goBack();
      await page.waitForURL(/intro/);
      await unlocked(page);
      await page.goForward();
      await page.waitForURL(/universe/);
      await unlocked(page);
    }
    await page.waitForTimeout(1500);
    const after = await gpuObjects(page);
    r.leakCheck = {
      textures: after.textures - before.textures,
      buffers: after.buffers - before.buffers,
      programs: after.programs - before.programs,
      framebuffers: after.framebuffers - before.framebuffers,
    };
    r.heapMB = await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576));
  }
  r.errors = errors;
  await browser.close();
  return r;
}

const gpus = gpuArg === 'both' ? ['intel', 'nvidia'] : [gpuArg];
const desktop = { viewport: { width: 1440, height: 900 }, dpr: 1 };
const results = [];
for (const gpu of gpus) {
  for (const quality of [undefined, 'high', 'medium', 'low']) {
    const r = await run(gpu, `desktop-${quality ?? 'auto'}`, { ...desktop, quality });
    console.log(JSON.stringify(r));
    results.push(r);
  }
  const m = await run(gpu, 'mobile-auto', { viewport: { width: 390, height: 844 }, dpr: 3, mobile: true });
  console.log(JSON.stringify(m));
  results.push(m);
}
writeFileSync(path.join(OUT, 'perf-results.json'), JSON.stringify(results, null, 2));
