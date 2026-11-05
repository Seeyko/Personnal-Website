// Capture la scène image par image, puis encode (ffmpeg via Docker si absent).
//   bun tools/og-motion/render.mjs --out <dossier> [--fps 24] [--only-still]
// Prérequis : serve.ts lancé ; playwright-core résolu (NODE_PATH) ; CHROME=<chemin chromium>.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', './og-motion-out');
const fps = Number(arg('--fps', 24));
const base = arg('--url', 'http://127.0.0.1:8765/og-motion/scene.html');
const onlyStill = process.argv.includes('--only-still');

mkdirSync(join(out, 'frames'), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: Number(arg('--scale', 1)) });
page.on('console', m => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', e => { console.error('[page]', e.message); process.exitCode = 1; });
await page.goto(base);
await page.evaluate(() => window.ready);

await page.evaluate(() => { window.setStill(true); window.render(0); });
await page.screenshot({ path: join(out, 'og-image.png') });
await page.evaluate(() => window.setStill(false));

if (!onlyStill) {
  const n = Math.round(await page.evaluate(() => window.DURATION) * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.render(t), i / fps);
    await page.screenshot({ path: join(out, 'frames', `f${String(i).padStart(4, '0')}.png`) });
  }
  console.log(`${n} images → ${out}/frames`);
}
await browser.close();
