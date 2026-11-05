// Rend scene3d.html image par image (WebGL via SwiftShader dans le conteneur Playwright).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', './out3d'), fps = +arg('--fps', 24), w = +arg('--w', 1920), h = +arg('--h', 1080), theme = arg('--theme', 'default');
mkdirSync(`${out}/frames`, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: w, height: h } });
p.on('pageerror', e => { console.error('ERR', e.message); process.exitCode = 1; });
await p.goto(`http://127.0.0.1:8766/tools/og-motion/scene3d.html?w=${w}&h=${h}&theme=${theme}`);
await Promise.race([p.evaluate(() => window.ready), new Promise((_, r) => setTimeout(() => r(new Error('ready timeout')), 90000))]);
const n = Math.round(await p.evaluate(() => window.DURATION) * fps);
for (let i = 0; i < n; i++) {
  await p.evaluate(t => window.render(t), i / fps);
  await p.screenshot({ path: `${out}/frames/f${String(i).padStart(4, '0')}.png` });
}
console.log(`${n} images`);
await b.close();
