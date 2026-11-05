// Utilisation : voir README.md (plan de caméra dans shots.json, zoom.json, speed.json).
// Filme le vrai site image par image : horloge virtuelle (page.clock) + animations CSS pilotées
// + « caméra » = défilement scripté (scrollTo, jamais de wheel : la molette saute l'intro).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', './rec'); const fps = +arg('--fps', 24);
const every = +arg('--every', 1); const theme = arg('--theme', 'default');
const W = +arg('--w', 1600), H = +arg('--h', 840), scale = +arg('--scale', 1.5);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale, locale: 'fr-FR' });
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
// sans pause, l'horloge factice avance AUSSI avec le temps réel : une capture lente accélérerait le site
await p.clock.pauseAt(new Date('2026-11-05T10:00:00.050Z'));
await p.addInitScript(() => {
  // la caméra défile par scrollTo image par image : pas de défilement doux du site en plus
  document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.scrollBehavior = 'auto'; });
  const born = new WeakMap();
  window.__advanceCss = (now) => {
    for (const a of document.getAnimations()) {
      if (!born.has(a)) born.set(a, now);
      try { a.pause(); a.currentTime = now - born.get(a); } catch (e) {}
    }
  };
});
await p.goto(`http://127.0.0.1:8000/?theme=${theme}`, { waitUntil: 'domcontentloaded' });

// plan de caméra : [t, cible] ; cible = sélecteur CSS (+ décalage) ou 0 (haut de page)
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const SHOTS = JSON.parse(arg('--shots', '[[0,0],[7.5,0],[9.3,"#work-grid|-90"],[13.5,"#work-grid|-90"],[15.0,"#work-grid|500"],[19.0,"#work-grid|500"],[20.4,0],[22,0]]'));
const dur = SHOTS[SHOTS.length - 1][0];
const ZOOM = JSON.parse(arg('--zoom', '[[0,1,0.5,0.5]]'));
const SPEED = JSON.parse(arg('--speed', '[[0,1]]'));
function lerpKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i], k = ease((t - a[0]) / (b[0] - a[0]));
    return [Math.exp(Math.log(a[1]) + (Math.log(b[1]) - Math.log(a[1])) * k), a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
  }
  return keys[keys.length - 1].slice(1);
}
const resolve = async tgt => {
  if (typeof tgt === 'number') return tgt;
  const [sel, off] = tgt.split('|');
  return p.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + scrollY + Number(o), [sel, off || 0]);
};
const dt = 1000 / fps; let now = 0;
const n = Math.round(dur * fps);
for (let i = 0; i < n; i++) {
  const t = i / fps;
  let k = SHOTS.findIndex(s => s[0] > t);
  if (k < 0) k = SHOTS.length - 1;
  const [t0, a] = SHOTS[Math.max(0, k - 1)], [t1, bb] = SHOTS[k];
  const ya = await resolve(a), yb = await resolve(bb);
  const y = t1 > t0 ? ya + (yb - ya) * ease(Math.min(Math.max((t - t0) / (t1 - t0), 0), 1)) : yb;
  // seulement si la caméra bouge : un scroll, même sur place, presse l'intro du site
  await p.evaluate(y => { if (Math.round(window.scrollY) !== y) window.scrollTo(0, y); }, Math.round(y));
  // ralenti : [t, vitesse] — le temps virtuel du site avance de dt × vitesse par image
  const rate = lerpKeys(SPEED.map(k => [k[0], k[1], 0, 0]), t)[0];
  await p.clock.runFor(dt * rate); now += dt * rate;
  await p.evaluate(t => window.__advanceCss(t), now);
  // zoom de caméra : [t, z, cx, cy] (cx, cy en fraction de l'écran) → capture d'une zone, agrandie ensuite
  const z = lerpKeys(ZOOM, t);
  const cw = W / z[0], ch = H / z[0];
  const clip = { x: Math.min(Math.max(z[1] * W - cw / 2, 0), W - cw), y: Math.min(Math.max(z[2] * H - ch / 2, 0), H - ch), width: cw, height: ch };
  if (i % every === 0 && t >= +arg('--from', 0) && t <= +arg('--to', 1e9)) await p.screenshot({ clip, path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
}
console.log(`${n} images`);
await b.close();
