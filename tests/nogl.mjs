/** WebGL-unavailable fallback: every chapter must still reveal its DOM with no errors. */
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const res = [];
for (const r of ['intro', 'universe', 'nature', 'travel', 'artist', 'film', 'dreams', 'memories', 'surprise']) {
  await page.goto(`${BASE}/${r}?preview=1&nogl=1`);
  await page.waitForTimeout(r === 'surprise' ? 10000 : 5000);
  const ok = await page.evaluate(() => {
    const h = document.querySelector('[data-chapter=surprise]') ? document.querySelector('[data-testid=surprise-open]')?.parentElement : document.querySelector('h1');
    return !!h && getComputedStyle(h).visibility !== 'hidden' && !document.querySelector('[data-overlay="loader"]')?.checkVisibility();
  });
  await page.screenshot({ path: `tests/screens/nogl-${r}.png` });
  res.push(`${r}:${ok ? 'ok' : 'FAIL'}`);
}
console.log(res.join(' '));
console.log(errors.length ? 'ERRORS ' + [...new Set(errors)].join(' | ') : 'NO ERRORS');
await b.close();
