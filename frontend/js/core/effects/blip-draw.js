/**
 * Blip Draw — the rest of the page gets drawn as you scroll to it.
 *
 * The boot intro (blip-swarm.js) draws what's on screen with a whole swarm.
 * Below the fold it's calmer: ONE cursor per element or group (a section
 * title, a card, the timeline, the 3D heart...). When a group scrolls into
 * view, Blip spits a small cursor; it flies over, draws the group with its
 * tool's gesture (selection marquee, typing, click, measure, pencil + fill,
 * slide into place), then flies back into Blip. If Blip is asleep or away,
 * the cursor comes in from the side of the screen and leaves the same way.
 *
 * Rules that keep it classy and never in the way:
 * - at most 3 cursors at once (2 on touch screens), in reading order;
 * - scrolling faster than they can draw? What's left fades in, no cursor:
 *   the content never lags behind the visitor;
 * - a group scrolled past before its turn is simply shown;
 * - the generic GSAP fade-ins are switched off on the groups it draws (no
 *   double animation); theme-specific effects and the footer's own entrance
 *   are left alone;
 * - the cursors live in a document-space layer, so they scroll with the page
 *   on the compositor, and the frame loop only runs while one is working.
 * prefers-reduced-motion: never runs.
 */
const BlipDraw = (() => {
    const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
    const REDUCED = mq('(prefers-reduced-motion: reduce)');
    const TOUCH = mq('(pointer: coarse)');
    const DPR = window.devicePixelRatio || 1;
    const U = Math.max(1, Math.round((TOUCH ? 1.4 : 1.75) * DPR)) / DPR;

    const MAX_ACTIVE = TOUCH ? 2 : 3;
    const QUEUE_MAX = 4;          // more waiting than this = visitor outpaces us: fade the rest in
    const WAIT_MAX = 900;         // ms a group may wait for a cursor before it just fades in
    const START_GAP = 110;        // ms between two departures

    // What counts as one drawable group, top-most match wins.
    const UNIT_SEL = '.section-header, [class*="card"]:not([class*="card-"]):not([class*="cards"]), ' +
        'figure, img, canvas, video, pre, blockquote, p, h2, h3, h4, ul, ol, table, .btn, button, ' +
        'a[class*="cta"], .section-footer';
    // Not ours: the hero (the intro draws it), the footer (its own entrance),
    // fixed UI, the mascots.
    const SKIP_SEL = '.hero, #site-footer, footer, .header, #cathode-guide, #cathode-fx, ' +
        '#blip-swarm, #blip-draw, #blip-cursor, .floating-cta, script, style, [hidden]';
    // ScrollEffects' generic GSAP reveals that we replace on the groups we draw.
    const GSAP_REVEALED = '.project-card, .blog-card, .about-card, .contact-card, .section-header';

    // Tool → sprites (cursor-sprites.js ids). 'blip' = a mini Blip.
    const SPRITES = {
        type: ['ibeam', 'caret-block'],
        click: ['hand-point'],
        measure: ['crosshair', 'reticle', 'zoom'],
        paint: ['pencil', 'brush', 'bucket'],
        move: ['move', 'hand-grab', 'resize-nwse'],
        select: ['arrow-win', 'blip', 'arrow-mac', 'help', 'blip', 'progress']
    };
    const THEMES = ['default', 'terminal', 'blueprint', 'retro90s', 'fps'];
    const ACCENT = { default: '#3d7a73', terminal: '#33ff00', blueprint: '#00ffff', retro90s: '#ff00ff', fps: '#f4b73a' };
    const FILL = { default: '#fff', terminal: '#33ff00', blueprint: '#fff', retro90s: '#fff', fps: '#fff' };
    const INK = { default: '#111', terminal: '#0a0a0a', blueprint: '#002244', retro90s: '#000', fps: '#0e1622' };
    const DETAIL = { default: '#3d7a73', terminal: '#ffb000', blueprint: '#ff6b6b', retro90s: '#ff00ff', fps: '#f4b73a' };
    const BLIP_C = { x: 6 * 1.75, y: 11 * 1.75 }; // the pet's body centre from his tip

    let started = false;
    let layer = null;
    let originX = 0, originY = 0;  // document position of the layer's (0,0)
    let io = null;
    let units = [];
    const queue = [];
    let active = 0;
    let nextStartAt = 0;
    let rafId = null;
    let lastT = 0;
    let theme = 'default';
    const frameCbs = new Set();
    const pickCount = {};
    let lastReactAt = 0;

    const now = () => performance.now();
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const bez = (x1, y1, x2, y2) => {
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
        const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
        return t => {
            let u = t;
            for (let i = 0; i < 6; i++) {
                const xx = ((ax * u + bx) * u + cx) * u - t;
                const d = (3 * ax * u + 2 * bx) * u + cx;
                if (Math.abs(xx) < 1e-4 || !d) break;
                u -= xx / d;
            }
            return ((ay * u + by) * u + cy) * u;
        };
    };
    const outExpo = bez(0.16, 1, 0.3, 1);
    const inOutQuart = bez(0.76, 0, 0.24, 1);
    const linear = t => t;

    /* ---------- Frame loop (runs only while there's work) ---------- */

    function wake() {
        if (!rafId) { lastT = 0; rafId = requestAnimationFrame(loop); }
    }

    function loop(t) {
        rafId = null;
        const dt = lastT ? Math.min((t - lastT) / 1000, 1 / 30) : 1 / 60;
        lastT = t;
        schedule(t);
        frameCbs.forEach(cb => cb(t, dt));
        if (frameCbs.size || queue.length || active) rafId = requestAnimationFrame(loop);
    }

    // `c` (optional): the cursor doing it — once its group is aborted
    // (scrolled away mid-draw) every step of its gesture completes at once.
    function animate(ms, fn, ease, c) {
        const e = ease || linear;
        return new Promise(resolve => {
            const t0 = now();
            const cb = t => {
                let p = ms > 0 ? clamp((t - t0) / ms, 0, 1) : 1;
                if (c && c.abort) p = 1;
                fn(e(p), p);
                if (p >= 1) { frameCbs.delete(cb); resolve(); }
            };
            frameCbs.add(cb);
            wake();
        });
    }
    const wait = (ms, c) => animate(ms, () => {}, linear, c);

    /* ---------- Units ---------- */

    function findUnits() {
        const vh = window.innerHeight;
        const sections = [...document.querySelectorAll('#main-content > section, main > section')]
            .filter(s => !s.matches(SKIP_SEL));
        const out = [];
        sections.forEach(sec => {
            let c = [...sec.querySelectorAll(UNIT_SEL)];
            // Big blocks with no recognised group inside (the git timeline)
            // are a group of their own.
            [...sec.children].forEach(ch => {
                if (!c.some(u => ch.contains(u) || u.contains(ch))) c.push(ch);
            });
            c = c.filter(el => {
                if (el.closest(SKIP_SEL)) return false;
                const r = el.getBoundingClientRect();
                if (r.width < 12 || r.height < 12) return false;
                if (getComputedStyle(el).position === 'fixed') return false;
                // Only what's still below the fold: the intro drew the rest.
                return r.top >= vh - 1;
            });
            c = c.filter(el => !c.some(o => o !== el && o.contains(el)));
            out.push(...c);
        });
        return out;
    }

    function toolFor(el, r) {
        const tag = el.tagName;
        if (el.matches('.section-header, p, h2, h3, h4, blockquote, pre')) return r.height < 220 ? 'type' : 'select';
        if (/^(IMG|CANVAS|VIDEO|FIGURE|SVG|svg)$/.test(tag)) return 'measure';
        if (el.matches('a, button, .btn') && r.width < 420 && r.height < 110) return 'click';
        if (r.width < 160 && r.height < 48) return 'move';
        // Cards & big blocks: vary the gesture down the page.
        const big = ['select', 'paint', 'measure', 'select'];
        return big[(pickCount.big = (pickCount.big || 0) + 1) % big.length];
    }

    function hide(u) {
        const s = u.el.style;
        u.saved = { clip: s.clipPath, wclip: s.webkitClipPath, transition: s.transition, translate: s.translate };
        s.transition = 'none';
        setClip(u, 'inset(0 0 100% 0)');
        u.el.setAttribute('data-bd-pending', '');
    }

    function setClip(u, v) {
        if (u.done) return;
        u.el.style.clipPath = v;
        u.el.style.webkitClipPath = v;
    }

    function restore(u) {
        if (u.done) return;
        u.done = true;
        const s = u.el.style, o = u.saved || {};
        s.clipPath = o.clip || '';
        s.webkitClipPath = o.wclip || '';
        s.transition = o.transition || '';
        s.translate = o.translate || '';
        u.el.removeAttribute('data-bd-pending');
        if (io) io.unobserve(u.el);
    }

    function fadeIn(u) {
        if (u.done) return;
        restore(u);
        if (u.el.animate) u.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }

    // Hand the groups we draw back from ScrollEffects' GSAP fade-ins.
    function releaseGsap(el) {
        if (typeof gsap === 'undefined') return;
        const els = [el, ...el.querySelectorAll(GSAP_REVEALED)].filter(e => e.matches(GSAP_REVEALED));
        els.forEach(e => {
            gsap.getTweensOf(e).forEach(tw => {
                if (tw.scrollTrigger) tw.scrollTrigger.kill();
                tw.kill();
            });
            gsap.set(e, { clearProps: 'opacity,transform,translate,rotate,scale,visibility' });
            e.classList.add('visible'); // themes' "arrived" hook (default.js settles on it)
        });
    }

    /* ---------- Queue ---------- */

    function enqueue(u) {
        if (u.queued || u.running || u.done) return;
        u.queued = true;
        u.queuedAt = now();
        queue.push(u);
    }

    function dequeue(u) {
        if (!u.queued) return;
        queue.splice(queue.indexOf(u), 1);
        u.queued = false;
    }

    // Where is every group that's still hidden? On screen → its turn comes;
    // scrolled past (above) → just shown; below → keeps waiting. A group
    // whose draw is under way but that left the screen finishes at once.
    // Runs on every observer hit and once each scroll settles, so even a
    // jump (nav link, End key) that skips over groups can't leave any hidden.
    function sweep() {
        const vh = window.innerHeight;
        units.forEach(u => {
            if (u.done) return;
            const r = u.el.getBoundingClientRect();
            const inView = r.bottom > 0 && r.top < vh * 0.88;
            if (u.running) {
                if (!inView && u.cursor) u.cursor.abort = true;
            } else if (r.bottom <= 0) {
                dequeue(u);
                restore(u);
            } else if (inView) {
                enqueue(u);
            } else {
                dequeue(u);
            }
        });
        wake();
        if (units.every(x => x.done) && !active) finishAll();
    }

    let sweepTimer = null;
    function onScroll() {
        if (sweepTimer) clearTimeout(sweepTimer);
        sweepTimer = setTimeout(() => { sweepTimer = null; sweep(); }, 110);
    }

    function schedule(t) {
        if (!queue.length) return;
        queue.sort((a, b) => a.order - b.order);
        // The visitor is faster than us: never make them wait for content.
        while (queue.length > QUEUE_MAX) fadeIn(queue.pop());
        for (let i = queue.length - 1; i >= 0; i--) {
            if (t - queue[i].queuedAt > WAIT_MAX && active >= MAX_ACTIVE) {
                const u = queue.splice(i, 1)[0];
                u.queued = false;
                fadeIn(u);
            }
        }
        if (active >= MAX_ACTIVE || t < nextStartAt || !queue.length) return;
        const u = queue.shift();
        u.queued = false;
        u.running = true;
        active++;
        nextStartAt = t + START_GAP;
        draw(u).catch(() => {}).then(() => {
            restore(u);
            u.running = false;
            active--;
            wake();
            if (units.every(x => x.done) && !active) finishAll();
        });
    }

    /* ---------- Cursors ---------- */

    function pickSprite(tool) {
        const list = SPRITES[tool] || SPRITES.select;
        const i = (pickCount[tool] = (pickCount[tool] || 0) + 1) % list.length;
        let id = list[i];
        if (id === 'blip') return { blip: THEMES[(pickCount.blipSkin = ((pickCount.blipSkin || 0) + 1)) % THEMES.length] };
        const s = window.CursorSprites.get(id) || window.CursorSprites.list[0];
        return { sprite: s };
    }

    function makeCursor(pick, x, y) {
        const el = document.createElement('div');
        el.className = 'bs-c';
        const inner = document.createElement('div');
        inner.className = 'bs-s';
        if (pick.blip) {
            inner.innerHTML = '<div class="bc bs-bc bc-theme-' + pick.blip + '" style="--bc-px:1.5">' + window.BlipCursor.markup + '</div>';
        } else {
            const s = pick.sprite;
            inner.innerHTML = '<div class="bs-art" style="width:' + s.w * U + 'px;height:' + s.h * U +
                'px;margin-left:' + (-s.hotX * U) + 'px;margin-top:' + (-s.hotY * U) + 'px">' + s.markup + '</div>';
        }
        el.appendChild(inner);
        layer.appendChild(el);
        const c = { el, inner, x, y, vx: 0, vy: 0, rot: 0, rotV: 0, scale: 0.3, press: 0, opacity: 0, wa: '', wb: '', wo: -1 };
        c.step = (t, dt) => {
            const want = clamp(c.vx * 0.02, -20, 20);
            c.rotV += ((want - c.rot) * 300 - c.rotV * 20) * dt;
            c.rot += c.rotV * dt;
            const a = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0)';
            const sc = c.scale * (1 - c.press * 0.12);
            const b = 'rotate(' + c.rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
            if (a !== c.wa) { el.style.transform = a; c.wa = a; }
            if (b !== c.wb) { inner.style.transform = b; c.wb = b; }
            if (c.opacity !== c.wo) { el.style.opacity = c.opacity; c.wo = c.opacity; }
        };
        frameCbs.add(c.step);
        return c;
    }

    function dropCursor(c) {
        frameCbs.delete(c.step);
        if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    }

    function place(c, x, y, dt) {
        if (dt) { c.vx = (x - c.x) / dt; c.vy = (y - c.y) / dt; }
        c.x = x; c.y = y;
    }

    // Timed cubic arc from the cursor's current velocity to (x, y), √dist pacing.
    function travel(c, x, y, bias) {
        const x0 = c.x, y0 = c.y, vx = c.vx, vy = c.vy;
        const dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy);
        const T = clamp(0.14 + Math.sqrt(d) * 0.02, 0.16, 0.55);
        const bend = (bias || 1) * Math.min(d, 500) * 0.12;
        const nx = d ? -dy / d : 0, ny = d ? dx / d : 0;
        const x1 = x0 + vx * T / 3 + nx * bend, y1 = y0 + vy * T / 3 + ny * bend;
        const x2 = x + nx * bend * 0.3, y2 = y + ny * bend * 0.3;
        let last = now();
        return animate(T * 1000, (e, u) => {
            const m = 1 - u;
            const t = now();
            place(c,
                m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x,
                m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y,
                (t - last) / 1000);
            last = t;
        }, linear, c).then(() => { c.x = x; c.y = y; c.vx = c.vy = 0; });
    }

    function mark(cls) {
        const m = document.createElement('div');
        m.className = 'bs-mark ' + cls;
        layer.appendChild(m);
        return m;
    }

    function fadeMark(m, ms) {
        animate(ms, p => { m.style.opacity = 1 - p; }).then(() => m.remove());
    }

    /* ---------- One draw: out of Blip, gesture, back into Blip ---------- */

    // Where a cursor comes from / goes back to: Blip if he's up and on
    // screen, else the near side edge at the group's height.
    function home(box) {
        const p = window.BlipCursor && window.BlipCursor.getPosition && window.BlipCursor.getPosition();
        const vw = document.documentElement.clientWidth, vh = window.innerHeight;
        if (p && p.x > 0 && p.y > 0 && p.x < vw && p.y < vh) {
            return { x: p.x + BLIP_C.x + window.scrollX - originX, y: p.y + BLIP_C.y + window.scrollY - originY, blip: true };
        }
        const cx = (box.l + box.r) / 2 - window.scrollX + originX;
        const left = cx < vw / 2;
        return { x: (left ? 14 : vw - 44) + window.scrollX - originX, y: clamp((box.t + box.b) / 2, box.t, box.t + vh * 0.6), blip: false };
    }

    function blipReact(kind) {
        const t = now();
        if (t - lastReactAt < 450 || !window.BlipCursor) return;
        lastReactAt = t;
        window.BlipCursor.react(kind);
    }

    async function draw(u) {
        const r = u.el.getBoundingClientRect();
        // The group's box in layer (document) coordinates.
        const sx = window.scrollX - originX, sy = window.scrollY - originY;
        const box = { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy, w: r.width, h: r.height };
        u.box = box;
        const tool = toolFor(u.el, r);
        const from = home(box);
        const c = makeCursor(pickSprite(tool), from.x, from.y);
        u.cursor = c;
        const full = c.inner.querySelector('.bs-bc') ? 0.75 : 1;
        if (from.blip) blipReact('click'); // the spit
        animate(200, p => { c.scale = lerp(0.3, full, p); c.opacity = p; }, outExpo);
        try {
            if (tool === 'type') await gType(c, u);
            else if (tool === 'click') await gClick(c, u);
            else if (tool === 'paint') await gPaint(c, u);
            else if (tool === 'move') await gMove(c, u);
            else await gRect(c, u, tool === 'measure');
        } finally {
            restore(u);
        }
        if (c.abort) {
            // Its group scrolled away: no trip home, it just fades out.
            c.abort = false;
            await animate(160, p => { c.opacity = 1 - p; });
            dropCursor(c);
            return;
        }
        // Back home: into Blip (shrinks into him), or out by the edge.
        const back = home(box);
        await travel(c, back.x, back.y, -1);
        await animate(140, p => { c.scale = lerp(full, 0.2, p); c.opacity = 1 - p; });
        dropCursor(c);
    }

    async function gRect(c, u, measure) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        await travel(c, b.l, b.t);
        await A(90, p => { c.press = p; }, outExpo);
        const m = mark(measure ? 'bs-measure' : 'bs-marquee');
        const tag = measure ? document.createElement('span') : null;
        if (tag) { tag.className = 'bs-tag'; m.appendChild(tag); }
        m.style.transform = 'translate(' + b.l + 'px,' + b.t + 'px)';
        let last = now();
        const dur = clamp(340 + Math.sqrt(b.w * b.h) * 0.4, 420, 650);
        await A(dur, e => {
            const t = now();
            const x = b.l + b.w * e, y = b.t + b.h * e;
            place(c, x, y, (t - last) / 1000); last = t;
            m.style.width = (b.w * e) + 'px';
            m.style.height = (b.h * e) + 'px';
            if (tag) tag.textContent = Math.round(b.w * e) + ' × ' + Math.round(b.h * e);
            setClip(u, 'inset(0 ' + (b.w * (1 - e)).toFixed(1) + 'px ' + (b.h * (1 - e)).toFixed(1) + 'px 0)');
        }, inOutQuart);
        c.vx = c.vy = 0;
        restore(u);
        A(120, p => { c.press = 1 - p; }, outExpo);
        if (measure) await wait(140, c);
        fadeMark(m, 160);
    }

    async function gType(c, u) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        const cs = getComputedStyle(u.el);
        const fs = parseFloat(cs.fontSize) || 16;
        let lh = parseFloat(cs.lineHeight);
        if (!lh || isNaN(lh)) lh = fs * 1.25;
        const lines = clamp(Math.round(b.h / lh), 1, 6);
        const lineH = b.h / lines;
        await travel(c, b.l, b.t + lineH / 2);
        await A(140, p => { c.opacity = p < 0.5 ? 0.25 : 1; });
        const per = clamp(560 / lines, 90, 220);
        const steps = clamp(Math.round(b.w / (fs * 0.55)), 6, 24);
        let last = now();
        for (let i = 0; i < lines; i++) {
            const y0 = i * lineH, y1 = y0 + lineH;
            await A(per, (e, p) => {
                const s = Math.floor(p * steps) / steps;
                const X = b.w * s;
                const t = now();
                place(c, b.l + X, b.t + y0 + lineH / 2, (t - last) / 1000); last = t;
                setClip(u, 'polygon(0px 0px,' + b.w + 'px 0px,' + b.w + 'px ' + y0 + 'px,' + X + 'px ' + y0 + 'px,' +
                    X + 'px ' + y1 + 'px,0px ' + y1 + 'px)');
            });
        }
        c.vx = c.vy = 0;
    }

    async function gClick(c, u) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        const px = b.l + b.w * rand(0.35, 0.65), py = b.t + b.h * rand(0.35, 0.65);
        await travel(c, px, py - 2);
        await A(90, p => { c.press = p; c.y = py - 2 + 2 * p; }, outExpo);
        const ring = mark('bs-ripple');
        ring.style.transform = 'translate(' + px + 'px,' + py + 'px)';
        const cx = px - b.l, cy = py - b.t;
        const far = Math.hypot(Math.max(cx, b.w - cx), Math.max(cy, b.h - cy)) * 1.05;
        A(120, p => { c.press = 1 - p; }, outExpo);
        await A(420, (e, p) => {
            setClip(u, 'circle(' + (far * e).toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)');
            ring.style.setProperty('--r', (6 + 30 * e) + 'px');
            ring.style.opacity = 1 - p;
        }, outExpo);
        ring.remove();
    }

    async function gPaint(c, u) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        await travel(c, b.l, b.t);
        const m = mark('bs-outline');
        m.style.transform = 'translate(' + b.l + 'px,' + b.t + 'px)';
        m.style.width = b.w + 'px';
        m.style.height = b.h + 'px';
        m.innerHTML = '<svg width="' + b.w + '" height="' + b.h + '"><rect x=".75" y=".75" width="' + Math.max(0, b.w - 1.5) +
            '" height="' + Math.max(0, b.h - 1.5) + '" pathLength="1"/></svg>';
        const rect = m.querySelector('rect');
        const per = 2 * (b.w + b.h);
        let last = now();
        await A(clamp(300 + per * 0.08, 380, 620), e => {
            let d = e * per, x, y;
            if (d <= b.w) { x = b.l + d; y = b.t; }
            else if ((d -= b.w) <= b.h) { x = b.r; y = b.t + d; }
            else if ((d -= b.h) <= b.w) { x = b.r - d; y = b.b; }
            else { d -= b.w; x = b.l; y = b.b - d; }
            const t = now();
            place(c, x, y, (t - last) / 1000); last = t;
            rect.style.strokeDashoffset = 1 - e;
        }, inOutQuart);
        c.vx = c.vy = 0;
        await A(90, p => { c.press = p; }, outExpo);
        A(120, p => { c.press = 1 - p; }, outExpo);
        await A(340, e => {
            setClip(u, 'inset(0 0 ' + (b.h * (1 - e)).toFixed(1) + 'px 0)');
        }, outExpo);
        fadeMark(m, 220);
    }

    async function gMove(c, u) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        const gx = (b.l + b.r) / 2, gy = (b.t + b.b) / 2;
        const ang = Math.atan2(gy - c.y, gx - c.x);
        const ox = -Math.cos(ang) * 24, oy = -Math.sin(ang) * 24;
        u.el.style.translate = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
        await travel(c, gx + ox, gy + oy);
        await A(90, p => { c.press = p; }, outExpo);
        setClip(u, 'none');
        let px = ox, py = oy, vx = 0, vy = 0;
        await A(420, (e, p) => {
            const dt = 1 / 60;
            for (let i = 0; i < 2; i++) {
                vx += (-px * 320 - vx * 26) * dt / 2; vy += (-py * 320 - vy * 26) * dt / 2;
                px += vx * dt / 2; py += vy * dt / 2;
            }
            if (p >= 1) px = py = 0;
            if (!u.done) u.el.style.translate = px.toFixed(2) + 'px ' + py.toFixed(2) + 'px';
            place(c, gx + px, gy + py, 1 / 60);
        });
        c.vx = c.vy = 0;
        A(120, p => { c.press = 1 - p; }, outExpo);
    }

    /* ---------- Lifecycle ---------- */

    function finishAll() {
        if (io) io.disconnect();
        io = null;
        window.removeEventListener('scroll', onScroll);
        setTimeout(() => {
            if (!active && layer && layer.parentNode) { layer.parentNode.removeChild(layer); layer = null; }
        }, 600);
    }

    function currentTheme() {
        const t = document.body.dataset.theme;
        return THEMES.indexOf(t) !== -1 ? t : 'default';
    }

    // Called by the intro once Blip is back in one piece, or on its own when
    // there's no intro.
    function start() {
        if (started || REDUCED || !window.CursorSprites || !('IntersectionObserver' in window)) return;
        started = true;
        theme = currentTheme();
        const found = findUnits();
        if (!found.length) return;

        layer = document.createElement('div');
        layer.id = 'blip-draw';
        layer.className = 'bs-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.setProperty('--bs-accent', ACCENT[theme]);
        layer.style.setProperty('--cs-ink', INK[theme]);
        layer.style.setProperty('--cs-accent', DETAIL[theme]);
        layer.style.color = FILL[theme];
        document.body.appendChild(layer);
        const o = layer.getBoundingClientRect();
        originX = o.left + window.scrollX;
        originY = o.top + window.scrollY;

        units = found.map((el, i) => {
            const u = { el, order: i, done: false, queued: false, running: false };
            el.__bd = u;
            return u;
        });
        units.forEach(u => { releaseGsap(u.el); hide(u); });
        io = new IntersectionObserver(sweep, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
        window.addEventListener('scroll', onScroll, { passive: true });
        units.forEach(u => io.observe(u.el));
    }

    function init() {
        if (REDUCED) return;
        // The intro calls start() when it's done; without one, start once the
        // page is on screen.
        if (window.BlipSwarm && window.BlipSwarm.willRun) return;
        const go = () => setTimeout(start, 300);
        if (document.body.classList.contains('loading')) {
            const mo = new MutationObserver(() => {
                if (document.body.classList.contains('loading')) return;
                mo.disconnect();
                go();
            });
            mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } else {
            go();
        }
    }

    return { init, start, get running() { return active > 0; } };
})();

window.BlipDraw = BlipDraw;
