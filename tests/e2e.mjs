/**
 * End-to-end flow test for Chapters 01–02 + the transition engine.
 * Drives a real Chrome (WebGL on), records screenshots at key choreography beats,
 * and fails on console errors, page errors, or broken navigation.
 *
 *   BASE_URL=http://localhost:3000 node tests/e2e.mjs [--only=desktop,mobile,...]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screens') + path.sep;
mkdirSync(OUT, { recursive: true });
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);

const results = [];

/** Scroll (wheel, or ArrowDown on touch emulation) a step at a time until fn(arg) is truthy. */
async function scrollUntil(page, fn, how, arg, tries = 80) {
  for (let k = 0; k < tries; k++) {
    if (await page.evaluate(fn, arg).catch(() => false)) return;
    if (how === 'wheel') await page.mouse.wheel(0, 260);
    else await page.keyboard.press('ArrowDown');
    await new Promise((r) => setTimeout(r, 450));
  }
  throw new Error('scrollUntil: condition never met');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-unsafe-swiftshader'],
});

let lastErrors = [];
function track(page) {
  const errors = [];
  lastErrors = errors;
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

async function visible(page, testId, timeout = 30000) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return false;
      let n = el;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.95) return false;
        n = n.parentElement;
      }
      return true;
    },
    testId,
    { timeout },
  );
}

async function phase(page) {
  return page.evaluate(() => document.querySelector('[data-input-lock]')?.getAttribute('data-input-lock'));
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
}

async function scenario(name, fn) {
  if (only.length && !only.includes(name)) return;
  const t0 = Date.now();
  lastErrors = [];
  try {
    const notes = await fn();
    results.push({ name, ok: true, ms: Date.now() - t0, ...(notes ?? {}) });
    console.log(`✔ ${name} (${Date.now() - t0}ms)`);
  } catch (err) {
    const extra = lastErrors.length ? ` | page errors: ${lastErrors.join(' || ')}` : '';
    results.push({ name, ok: false, ms: Date.now() - t0, error: String(err?.message ?? err) + extra });
    console.log(`✘ ${name}: ${err?.message ?? err}`);
  }
}

async function webglInfo(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return 'no webgl2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl2';
  });
}

async function fps(page, ms = 2000) {
  return page.evaluate(
    (dur) =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < dur) requestAnimationFrame(tick);
          else resolve(Math.round((frames * 1000) / (performance.now() - start)));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

// ------------------------------------------------------------------ full desktop journey
await scenario('desktop', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = track(page, 'desktop');
  await page.goto(`${BASE}/intro`, { waitUntil: 'domcontentloaded' });
  const renderer = await webglInfo(page);
  await sleep(1800);
  await shot(page, 'd01-intro-arriving');
  await visible(page, 'open');
  await page.mouse.move(1100, 300);
  await sleep(1200);
  await shot(page, 'd02-intro-idle');
  const idleFps = await fps(page);

  // canvas is the same element before and after navigation (persistent stage)
  await page.evaluate(() => (window.__canvas = document.querySelector('[data-stage] canvas')));

  await page.click('[data-testid="open-area"]');
  await sleep(500);
  await shot(page, 'd03-seal-crack');
  await sleep(1100);
  await shot(page, 'd04-flap-open');
  await sleep(1300);
  await shot(page, 'd05-letter-rising');
  await sleep(1700);
  await shot(page, 'd06-letter-unfolding');
  await visible(page, 'step-inside');
  await sleep(600);
  await shot(page, 'd07-letter-open');

  await scrollUntil(page, () => location.pathname === '/universe', 'wheel');
  await sleep(1000);
  await shot(page, 'd08-t1-push-in');
  await sleep(1150);
  await shot(page, 'd09-t1-light');
  await page.waitForURL('**/universe', { timeout: 15000 });
  await sleep(700);
  await shot(page, 'd10-t1-burst');
  await sleep(1500);
  await shot(page, 'd11-universe-forming');
  await sleep(1800);
  await shot(page, 'd12-universe-name');
  await visible(page, 'enter-world', 30000);
  await sleep(800);
  await shot(page, 'd13-universe');
  const universeFps = await fps(page);

  const sameCanvas = await page.evaluate(() => window.__canvas === document.querySelector('[data-stage] canvas'));
  if (!sameCanvas) throw new Error('WebGL canvas was recreated across the route change');
  const mark = await page.textContent('[data-testid="chapter-mark"]');
  if (!mark?.includes('02')) throw new Error(`chapter mark wrong: ${mark}`);
  if ((await phase(page)) !== 'off') throw new Error('input still locked after arrival');

  await page.mouse.move(300, 200);
  await sleep(900);
  await shot(page, 'd14-universe-parallax');

  // universe → nature (chapter 03)
  await scrollUntil(page, () => location.pathname === '/nature', 'wheel');
  // T2 Portal → Dawn: dive, warm light, then morning mist
  await sleep(1500);
  await shot(page, 'd15a-portal-dive');
  await sleep(1050);
  await shot(page, 'd15b-dawn-light');
  await page.waitForURL('**/nature', { timeout: 15000 });
  await sleep(500);
  await shot(page, 'd15c-dawn-mist');
  await sleep(1300);
  await shot(page, 'd15d-mist-lifting');
  await visible(page, 'nature-heading', 20000);
  await sleep(600);
  await shot(page, 'd16-nature');
  const natureMark = await page.textContent('[data-testid="chapter-mark"]');
  if (!natureMark?.includes('03')) throw new Error(`chapter mark on nature wrong: ${natureMark}`);
  const sameCanvasNature = await page.evaluate(() => window.__canvas === document.querySelector('[data-stage] canvas'));
  if (!sameCanvasNature) throw new Error('WebGL canvas was recreated on the way to nature');
  // scroll walks the 4 stops; each light-seed opens its own card, the next scroll moves on
  for (let i = 1; i <= 3; i++) {
    await scrollUntil(page, (n) => document.querySelector('[data-chapter="nature"]')?.getAttribute('data-stop') === String(n) && !!document.querySelector('[data-testid="nature-card"]'), 'wheel', i);
    await sleep(900);
    await shot(page, 'd16-nature-card' + i);
    await sleep(1600);
  }
  // at the summit, scrolling on flies the butterfly → T3 → Travel
  await scrollUntil(page, () => location.pathname === '/travel', 'wheel');
  await page.waitForURL('**/travel', { timeout: 15000 });
  await visible(page, 'travel-continue', 20000);
  await shot(page, 'd16-travel');
  // back → nature (rewind)
  await page.goBack();
  await page.waitForURL('**/nature');
  await sleep(2500);

  // browser back → universe, then back again → intro
  await page.goBack();
  await page.waitForURL('**/universe');
  await visible(page, 'enter-world', 20000);
  await shot(page, 'd17-back-in-universe');
  await page.goBack();
  await page.waitForURL('**/intro');
  await sleep(300);
  await shot(page, 'd18-rewind');
  await visible(page, 'open', 20000);
  await shot(page, 'd19-intro-after-back');
  // browser forward → universe
  await page.goForward();
  await page.waitForURL('**/universe');
  await visible(page, 'enter-world', 20000);
  await shot(page, 'd20-universe-after-forward');

  await ctx.close();
  if (errors.length) throw new Error(errors.join('\n'));
  return { renderer, idleFps, universeFps };
});

// ------------------------------------------------------------------ direct URL + gate
await scenario('direct-url-gate', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = track(page);
  await page.goto(`${BASE}/universe`);
  await visible(page, 'gate', 15000);
  await shot(page, 'g01-gate');
  await page.getByText('Show me anyway').click();
  await visible(page, 'enter-world', 30000);
  await shot(page, 'g02-cold-open-universe');
  await page.goto(`${BASE}/universe?preview=1`);
  await page.waitForTimeout(1500);
  if (await page.$('[data-testid="gate"]')) throw new Error('gate shown despite ?preview');
  // nature: direct URL (with ?preview) cold-opens the new chapter
  await page.goto(`${BASE}/nature?preview=1`);
  await visible(page, 'nature-heading', 30000);
  await shot(page, 'g03-cold-open-nature');
  await page.goto(`${BASE}/`);
  await page.waitForURL('**/intro');
  await page.goto(`${BASE}/nowhere`);
  if (!(await page.getByText('Return to the beginning').count())) throw new Error('404 page missing');
  await ctx.close();
  if (errors.filter((e) => !e.includes('404')).length) throw new Error(errors.join('\n'));
});


// ------------------------------------------------------------------ mobile
await scenario('mobile', async () => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = track(page);
  await page.goto(`${BASE}/intro`);
  await visible(page, 'open');
  await sleep(500);
  await shot(page, 'm01-intro');
  await page.tap('[data-testid="open-area"]');
  await visible(page, 'step-inside', 20000);
  await sleep(500);
  await shot(page, 'm02-letter');
  await scrollUntil(page, () => location.pathname === '/universe', 'key');
  await page.waitForURL('**/universe', { timeout: 15000 });
  await visible(page, 'enter-world', 30000);
  await sleep(600);
  await shot(page, 'm03-universe');
  const quality = await page.evaluate(() => document.querySelector('[data-stage] canvas')?.width);
  // Nature on a phone: portal → dawn, walk to the pool, open its light-seed, reach the summit
  await scrollUntil(page, () => location.pathname === '/nature', 'key');
  await page.waitForURL('**/nature', { timeout: 20000 });
  await visible(page, 'nature-heading', 30000);
  await sleep(800);
  await shot(page, 'm04-nature-dawn');
  // scroll (keyboard on mobile emulation) walks; each light-seed opens its card by itself
  await scrollUntil(page, () => !!document.querySelector('[data-testid="nature-card"]'), 'key');
  await sleep(900);
  await shot(page, 'm06-nature-card');
  await sleep(1600);
  await scrollUntil(page, () => document.querySelector('[data-chapter="nature"]')?.getAttribute('data-stop') === '2', 'key');
  await sleep(2600);
  await shot(page, 'm07-nature-pool');
  await ctx.close();
  if (errors.length) throw new Error(errors.join('\n'));
  return { canvasWidth: quality };
});

// ------------------------------------------------------------------ reduced motion
await scenario('reduced-motion', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = track(page);
  await page.goto(`${BASE}/intro`);
  await visible(page, 'open');
  await page.click('[data-testid="open-area"]');
  await visible(page, 'step-inside', 20000);
  await scrollUntil(page, () => location.pathname === '/universe', 'wheel');
  await page.waitForURL('**/universe', { timeout: 15000 });
  await visible(page, 'enter-world', 20000);
  await shot(page, 'r01-universe-reduced');
  await ctx.close();
  if (errors.length) throw new Error(errors.join('\n'));
});

await browser.close();
console.log('\n' + JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
