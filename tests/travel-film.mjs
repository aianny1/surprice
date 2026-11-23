/** Travel: scroll hops place to place with photos. Film: scroll rolls the reel. Screenshots each. */
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const wheel = async (n, px = 200, gap = 120) => { for (let i = 0; i < n; i++) { await page.mouse.wheel(0, px); await sleep(gap); } };
await page.goto(`${BASE}/travel?preview=1`);
await sleep(8000);
await page.screenshot({ path: 'tests/screens/tf-travel-0.png' });
for (let k = 1; k <= 3; k++) {
  await wheel(2);
  await sleep(3200);
  await page.screenshot({ path: `tests/screens/tf-travel-${k}.png` });
}
const names = await page.$eval('[data-testid="travel-postcard"] h2', (e) => e.textContent).catch(() => 'none');
const img = await page.$eval('[data-testid="travel-postcard"] img', (e) => e.complete && e.naturalWidth).catch(() => 0);
console.log('postcard:', names, 'img width:', img);
await page.goto(`${BASE}/film?preview=1`);
await sleep(7000);
await page.screenshot({ path: 'tests/screens/tf-film-0.png' });
await wheel(8, 200, 100);
await sleep(1500);
await page.screenshot({ path: 'tests/screens/tf-film-1.png' });
console.log(errors.length ? 'ERRORS ' + [...new Set(errors)].join(' | ') : 'NO ERRORS');
await b.close();
