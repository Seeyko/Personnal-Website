// Capture les vrais éléments du site (cartes projets, hero) en 2× + la géométrie de leurs parties.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.argv[2]; const theme = process.argv[3] || 'default';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, locale: 'fr-FR', reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:8000/?theme=${theme}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelectorAll('.floating-cta,#cathode-guide,#cathode-fx,#blip-cursor').forEach(e => e.style.display = 'none'); });
const meta = { cards: [] };
const cards = await p.$$('#work-grid .project-card');
for (let i = 0; i < cards.length; i++) {
  const c = cards[i];
  await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  // carrousel : première image, sans transition
  await c.evaluate(async el => { await Promise.all([...el.querySelectorAll('img')].map(im => { im.loading = 'eager'; return im.decode().catch(() => {}); })); });
  await p.waitForTimeout(800);
  const info = await c.evaluate(el => {
    const r = el.getBoundingClientRect();
    const rel = s => { const e = el.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return [q.left - r.left, q.top - r.top, q.width, q.height]; };
    const lines = [...el.querySelectorAll('.project-info > *')].map(e => { const q = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: e.className, rect: [q.left - r.left, q.top - r.top, q.width, q.height] }; });
    return { w: r.width, h: r.height, media: rel('.project-media-container'), title: rel('.project-title, h3'), badge: rel('.project-status-badge'), lines,
      name: (el.querySelector('.project-title, h3') || {}).textContent?.trim() };
  });
  await c.screenshot({ path: `${out}/card${i}.png` });
  const badge = await c.$('.project-status-badge');
  if (badge) await badge.screenshot({ path: `${out}/card${i}-badge.png`, omitBackground: true });
  meta.cards.push({ i, ...info });
}
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
const hero = await p.$('.hero');
const heroInfo = await hero.evaluate(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, kids: [...el.querySelectorAll('h1,h2,p,.btn,a,[class*=stat]')].slice(0, 12).map(e => { const q = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className).slice(0, 40), text: e.textContent.trim().slice(0, 60), rect: [q.left - r.left, q.top - r.top, q.width, q.height] }; }) }; });
await hero.screenshot({ path: `${out}/hero.png` });
meta.hero = heroInfo;
const css = await p.evaluate(() => { const s = getComputedStyle(document.body); return ['--bg-primary','--bg-secondary','--text-primary','--accent','--border-light','--font-sans'].reduce((o, k) => (o[k] = s.getPropertyValue(k).trim(), o), {}); });
meta.css = css;
writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 1));
await b.close();
console.log('ok', meta.cards.map(c => c.name));
