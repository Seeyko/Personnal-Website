/**
 * Data Trail — what Blip leaves behind while he draws the page.
 *
 * Text: between Blip's tip and the text already written, a short trail of
 * data glyphs (0 1 { } < > # ...) flickers in the theme's accent; the real
 * text is revealed a few characters behind him, and each glyph dissolves into
 * its letter as the text catches up — the page reads as if he encoded it on
 * the fly.
 * Blocks (cards, images): the growing edge of his selection crackles with
 * small data pixels that burn out right behind it.
 *
 * One small canvas per element being drawn, only while it's drawn: the page's
 * own text is never touched (i18n, a11y and layout stay intact). Block
 * pixels are square: their canvas stays at 1x (a third of the memory on a
 * phone) and is freed as soon as it's done — mobile Safari only reclaims
 * canvas memory on GC, and runs out of it.
 *
 *   const tr = DataTrail.create(parentLayer, box, { accent })
 *   tr.write(x, yTop, yBottom)  text front at x on that line (parent coords)
 *   tr.edge(x, y)               block front corner: right & bottom edges
 *   tr.ring(cx, cy, r)          circular front (a click reveal)
 *   tr.settle()                 no new data; fades out and removes itself
 *   DataTrail.words(el)         word boxes of el's text, for word-by-word typing
 *
 * And the marks of his tools, built so nothing is laid out or repainted
 * while they grow — fixed-size layers moved by transforms, clipped by a
 * mask (a phone's GPU does it all):
 *   DataTrail.selection(parent, box, measure)  rubber band (or measured box)
 *     .set(fx, fy)   grown to that fraction of the box; .el to fade/remove
 *   DataTrail.outline(parent, box)             a pencil line around the box
 *     .set(e)        that fraction of the perimeter, clockwise from top-left
 */
const DataTrail = (() => {
    const GLYPHS = '01{}<>/\\[]#$%&*+=?:;01AFX10';
    const TEXT_DPR = Math.min(window.devicePixelRatio || 1, 2);
    const PAD = 10;
    const RESOLVE_MS = 140;    // a glyph dissolves this fast once its letters are in
    const PIXEL_LIFE = 210;

    const rnd = n => Math.floor(Math.random() * n);
    const glyph = () => GLYPHS[rnd(GLYPHS.length)];

    // Word boxes (element-relative: left/right/top/bottom) of every text
    // node under el, in reading order; `part` = which text node.
    function words(el) {
        const base = el.getBoundingClientRect();
        const out = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let n, part = 0;
        while ((n = walker.nextNode())) {
            const text = n.nodeValue;
            const re = /\S+/g;
            let m;
            while ((m = re.exec(text))) {
                range.setStart(n, m.index);
                range.setEnd(n, m.index + m[0].length);
                const rects = range.getClientRects();
                if (!rects.length) continue;
                const rr = rects[rects.length - 1];
                const r0 = rects[0];
                out.push({ left: r0.left - base.left, right: rr.right - base.left, top: rr.top - base.top, bottom: rr.bottom - base.top, part });
            }
            part++;
        }
        return out;
    }

    function create(parent, box, opts) {
        const o = opts || {};
        const accent = o.accent || '#3d7a73';
        const W = Math.ceil(box.w + PAD * 2), H = Math.ceil(box.h + PAD * 2);
        let canvas = null, ctx = null;

        // Made on first use: glyphs need the screen's resolution, pixels don't.
        function ensure(text) {
            if (canvas) return;
            const dpr = text ? TEXT_DPR : 1;
            canvas = document.createElement('canvas');
            canvas.width = Math.ceil(W * dpr);
            canvas.height = Math.ceil(H * dpr);
            canvas.className = 'bs-trail';
            canvas.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;' +
                'transform:translate3d(' + (box.l - PAD) + 'px,' + (box.t - PAD) + 'px,0);pointer-events:none' +
                (text ? '' : ';image-rendering:pixelated');
            parent.appendChild(canvas);
            ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function free() {
            if (!canvas) return;
            canvas.remove();
            canvas.width = canvas.height = 0;
            canvas = ctx = null;
        }

        const cells = [];      // text glyphs
        const pixels = [];     // block data pixels
        let lastFront = null;
        let settling = false;
        let raf = null;
        let resolveDone = null;
        const done = new Promise(r => { resolveDone = r; });

        // Local coords inside the canvas.
        const lx = x => x - box.l + PAD;
        const ly = y => y - box.t + PAD;

        function write(x, y0, y1) {
            if (settling) return;
            ensure(true);
            const h = Math.max(8, y1 - y0);
            const fs = Math.min(30, Math.max(9, h * 0.5));
            const cw = fs * 0.62;
            const t = performance.now();
            // A new line starts its trail where the front is now.
            if (!lastFront || Math.abs(lastFront.y0 - y0) >= 2) lastFront = { x, y0 };
            while (lastFront.x + cw <= x + 0.5) {
                cells.push({ x: lx(lastFront.x), y: ly(y0 + (h - fs) / 2), fs, g: glyph(), next: t + 40 + rnd(60), born: t, gone: 0 });
                lastFront.x += cw;
            }
            kick();
        }

        // The text front is now at `x` on the line [y0, y1]: glyphs it has
        // passed start dissolving into their letter.
        function caughtUp(x, y0) {
            const t = performance.now();
            const X = lx(x), Y = ly(y0);
            cells.forEach(c => { if (!c.gone && c.x + c.fs * 0.5 <= X && c.y >= Y - 2 && c.y <= Y + c.fs * 1.8) c.gone = t; });
            // Lines above the current one are fully written.
            cells.forEach(c => { if (!c.gone && c.y + c.fs < Y - 1) c.gone = t; });
        }

        function edge(x, y) {
            if (settling) return;
            ensure(false);
            const t = performance.now();
            const X = lx(x), Y = ly(y);
            // Right on the moving edges, never left behind inside the
            // revealed area.
            const n = 2 + rnd(3);
            for (let i = 0; i < n; i++) {
                const onRight = Math.random() < 0.5;
                const s = 2 + rnd(2);
                pixels.push({
                    x: onRight ? X - s - rnd(3) : PAD + Math.random() * Math.max(1, X - PAD),
                    y: onRight ? PAD + Math.random() * Math.max(1, Y - PAD) : Y - s - rnd(3),
                    s, born: t
                });
            }
            kick();
        }

        function ring(cx, cy, r) {
            if (settling) return;
            ensure(false);
            const t = performance.now();
            const n = 4 + rnd(4);
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const rr = r - rnd(10);
                pixels.push({ x: lx(cx) + Math.cos(a) * rr, y: ly(cy) + Math.sin(a) * rr, s: 2 + rnd(3), born: t });
            }
            kick();
        }

        function settle() {
            settling = true;
            const t = performance.now();
            cells.forEach(c => { if (!c.gone) c.gone = t; });
            kick();
            return done;
        }

        function kick() {
            if (!raf) raf = requestAnimationFrame(frame);
        }

        function frame(t) {
            raf = null;
            if (!ctx) { if (settling) resolveDone(); return; }
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = accent;
            ctx.textBaseline = 'top';
            // Glyphs: re-rolled every few frames; dissolve once the text passed.
            let font = '';
            for (let i = cells.length - 1; i >= 0; i--) {
                const c = cells[i];
                let a = 1;
                if (c.gone) {
                    a = 1 - (t - c.gone) / RESOLVE_MS;
                    if (a <= 0) { cells.splice(i, 1); continue; }
                } else {
                    a = Math.min(1, (t - c.born) / 60);
                }
                if (t > c.next) { c.g = glyph(); c.next = t + 45 + rnd(70); }
                const f = '400 ' + c.fs.toFixed(1) + 'px "JetBrains Mono","Roboto Mono",ui-monospace,monospace';
                if (f !== font) { ctx.font = f; font = f; }
                ctx.globalAlpha = a * 0.75;
                ctx.fillText(c.g, c.x, c.y);
            }
            // Data pixels burn out fast.
            for (let i = pixels.length - 1; i >= 0; i--) {
                const p = pixels[i];
                const k = (t - p.born) / PIXEL_LIFE;
                if (k >= 1) { pixels.splice(i, 1); continue; }
                ctx.globalAlpha = (1 - k) * 0.85;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
            }
            ctx.globalAlpha = 1;
            if (cells.length || pixels.length) {
                raf = requestAnimationFrame(frame);
            } else if (settling) {
                free();
                resolveDone();
            }
        }

        return { write, caughtUp, edge, ring, settle, done };
    }

    const div = (parent, cls, css) => {
        const d = document.createElement('div');
        d.className = cls;
        if (css) d.style.cssText = css;
        parent.appendChild(d);
        return d;
    };
    const at = (x, y) => 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';

    function selection(parent, box, measure) {
        const el = div(parent, 'bs-mark bs-sel ' + (measure ? 'bs-measure' : 'bs-marquee'));
        const w = box.w, h = box.h;
        const area = div(el, 'bs-sel-area', 'width:' + w + 'px;height:' + h + 'px;transform:' + at(box.l, box.t) +
            ';clip-path:inset(0 100% 100% 0);-webkit-clip-path:inset(0 100% 100% 0)');
        div(area, 'bs-e bs-et');
        div(area, 'bs-e bs-el');
        const er = div(area, 'bs-e bs-er');
        const eb = div(area, 'bs-e bs-eb');
        const tag = measure ? div(el, 'bs-tag') : null;
        let lastW = -1, lastH = -1;
        function set(fx, fy) {
            const W = Math.round(w * fx * 2) / 2, H = Math.round(h * fy * 2) / 2;
            if (W === lastW && H === lastH) return;
            if (W !== lastW) er.style.transform = at(Math.max(0, W - 1), 0);
            if (H !== lastH) eb.style.transform = at(0, Math.max(0, H - 1));
            lastW = W; lastH = H;
            const clip = 'inset(0 ' + (w - W) + 'px ' + (h - H) + 'px 0)';
            area.style.clipPath = clip;
            area.style.webkitClipPath = clip;
            if (tag) {
                tag.style.transform = at(box.l + W, box.t + H + 5) + ' translateX(-100%)';
                tag.textContent = Math.round(W) + ' × ' + Math.round(H);
            }
        }
        return { el, set };
    }

    function outline(parent, box) {
        const el = div(parent, 'bs-mark bs-outline');
        const w = box.w, h = box.h, s = 1.5;
        // Top, right, bottom, left — each drawn from where the pencil enters it.
        const sides = [
            { len: w, css: 'width:' + w + 'px;height:' + s + 'px;transform-origin:0 0', x: box.l, y: box.t, k: 'X' },
            { len: h, css: 'width:' + s + 'px;height:' + h + 'px;transform-origin:0 0', x: box.l + w - s, y: box.t, k: 'Y' },
            { len: w, css: 'width:' + w + 'px;height:' + s + 'px;transform-origin:100% 0', x: box.l, y: box.t + h - s, k: 'X' },
            { len: h, css: 'width:' + s + 'px;height:' + h + 'px;transform-origin:0 100%', x: box.l, y: box.t, k: 'Y' }
        ].map(o => ({ ...o, el: div(el, 'bs-ln', o.css), shown: -1 }));
        function set(e) {
            let d = e * 2 * (w + h);
            sides.forEach(o => {
                const k = Math.round(Math.min(1, Math.max(0, d / Math.max(1, o.len))) * 1000) / 1000;
                d -= o.len;
                if (k === o.shown) return;
                o.shown = k;
                o.el.style.transform = at(o.x, o.y) + ' scale' + o.k + '(' + k + ')';
            });
        }
        set(0);
        return { el, set };
    }

    return { create, words, selection, outline };
})();

window.DataTrail = DataTrail;
