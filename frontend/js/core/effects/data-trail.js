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
 * own text is never touched (i18n, a11y and layout stay intact).
 *
 *   const tr = DataTrail.create(parentLayer, box, { accent })
 *   tr.write(x, yTop, yBottom)  text front at x on that line (parent coords)
 *   tr.edge(x, y)               block front corner: right & bottom edges
 *   tr.ring(cx, cy, r)          circular front (a click reveal)
 *   tr.settle()                 no new data; fades out and removes itself
 *   DataTrail.words(el)         word boxes of el's text, for word-by-word typing
 */
const DataTrail = (() => {
    const GLYPHS = '01{}<>/\\[]#$%&*+=?:;01AFX10';
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
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
        const canvas = document.createElement('canvas');
        const W = Math.ceil(box.w + PAD * 2), H = Math.ceil(box.h + PAD * 2);
        canvas.width = Math.ceil(W * DPR);
        canvas.height = Math.ceil(H * DPR);
        canvas.className = 'bs-trail';
        canvas.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;' +
            'transform:translate(' + (box.l - PAD) + 'px,' + (box.t - PAD) + 'px);pointer-events:none';
        parent.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        const cells = [];      // text glyphs
        const pixels = [];     // block data pixels
        let lastFront = null;
        let settling = false;
        let raf = null;
        let last = 0;
        let resolveDone = null;
        const done = new Promise(r => { resolveDone = r; });

        // Local coords inside the canvas.
        const lx = x => x - box.l + PAD;
        const ly = y => y - box.t + PAD;

        function write(x, y0, y1) {
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
            if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
        }

        function frame(t) {
            raf = null;
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
                if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
                resolveDone();
            }
        }

        return { write, caughtUp, edge, ring, settle, done };
    }

    return { create, words };
})();

window.DataTrail = DataTrail;
