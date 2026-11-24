/**
 * Smoke test for Chapters 04–09: opens each one directly (?preview=1), plays its main interaction,
 * walks Travel → Artist through T4, and screenshots every beat. Fails on console/page errors.
 *
 *   BASE_URL=http://localhost:3100 node tests/chapters.mjs
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screens') + path.sep;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mobile = process.argv.includes('--mobile');

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'],
});
const page = await browser.newPage(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
const tag = mobile ? 'm-' : '';
const shot = (n) => page.screenshot({ path: `${OUT}${tag}ch-${n}.png` });
const idle = () => page.waitForFunction(() => !document.querySelector('[data-overlay="loader"]')?.checkVisibility?.(), null, { timeout: 30000 }).catch(() => {});

async function scrollUntil(fn, tries = 80) {
  for (let k = 0; k < tries; k++) {
    if (await page.evaluate(fn).catch(() => false)) return;
    await page.mouse.wheel(0, 260);
    await sleep(450);
  }
  throw new Error('scrollUntil: condition never met');
}

async function open(route) {
  await page.goto(`${BASE}/${route}?preview=1`);
  await idle();
  await sleep(6500);
}

await open('travel');
await shot('travel');
// the travel film plays by itself (no scrolling); scroll only takes off once the last place is up
await sleep(6000);
await shot('travel-postcard');
const early = await page.evaluate(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 2000 })); return location.pathname; });
await page.waitForFunction(() => document.querySelector('[data-testid="travel-postcard"] h2')?.textContent === 'Rishikesh', null, { timeout: 90000 });
console.log('film reached the last place; still on', early);
await shot('travel-film-end');
await scrollUntil(() => location.pathname === '/artist');
await sleep(5000);
await shot('artist-from-t4');
console.log('url after T4:', page.url());

for (const r of ['film', 'dreams', 'memories']) {
  await open(r);
  await shot(r);
}
await page.click('[data-testid="memory-0"]', { force: true });
await sleep(1200);
await shot('memories-zoom');

await open('surprise');
await shot('surprise-intro');
await scrollUntil(() => document.querySelector('[data-chapter=surprise]')?.getAttribute('data-step') === 'opened');
await sleep(9000);
await shot('surprise-cake');
console.log('title:', await page.title());
await scrollUntil(() => document.querySelector('[data-chapter=surprise]')?.getAttribute('data-step') === 'wished');
await sleep(5500);
await shot('surprise-finale');

// scroll back: Film → Artist (winds backwards), Nature start → Universe
async function scrollUpUntil(fn, tries = 60) {
  for (let k = 0; k < tries; k++) {
    if (await page.evaluate(fn).catch(() => false)) return;
    await page.mouse.wheel(0, -260);
    await sleep(400);
  }
  throw new Error('scrollUpUntil: condition never met');
}
await open('film');
await page.mouse.wheel(0, -260);
await sleep(300);
await shot('back-ring');
await scrollUpUntil(() => location.pathname === '/artist');
await sleep(500);
await shot('back-rewinding');
await sleep(3500);
await shot('back-artist');
await open('nature');
await scrollUpUntil(() => location.pathname === '/universe');
await sleep(4000);
await shot('back-universe');
console.log('back ok:', page.url());

await browser.close();
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'NO ERRORS');
process.exit(errors.length ? 1 : 0);
