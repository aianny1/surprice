/** Cursor, skip removal and music start checks. */
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: [process.argv.includes('--autoplay') ? '--autoplay-policy=no-user-gesture-required' : '--autoplay-policy=user-gesture-required'] });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  const C = window.AudioContext;
  window.__ctxs = [];
  window.AudioContext = class extends C { constructor(...a) { super(...a); window.__ctxs.push(this); } };
});
await page.goto(`${BASE}/travel?preview=1`);
await page.waitForTimeout(6000);
const cursor = await page.$eval('[data-testid="travel-continue"]', (el) => getComputedStyle(el).cursor);
const skip = await page.$('[data-testid="skip"]');
const before = await page.evaluate(() => window.__ctxs.map((c) => c.state).join(','));
await page.mouse.click(640, 400);
await page.waitForTimeout(1500);
const audio = await page.evaluate(() => window.__ctxs.map((c) => c.state).join(','));
const soundLabel = await page.$eval('[data-testid="sound-toggle"]', (el) => el.getAttribute('aria-label'));
console.log({ cursor, skipPresent: !!skip, beforeClick: before, afterClick: audio, soundLabel });
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'NO ERRORS');
await b.close();
