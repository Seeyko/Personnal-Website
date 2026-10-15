/**
 * Blip Swarm — the boot intro that replaces the loading spinner.
 *
 *  1. ALONE    One Blip, in the theme's colours, waits on the loader while the
 *              page loads (blinks, breathes).
 *  2. SPLIT    Content is ready: he winds up, then spits out a swarm of small
 *              cursors along a golden-angle spiral, shrinking as he goes —
 *              Blips in the other themes' colours + classic OS cursors
 *              (cursor-sprites.js).
 *  3. BUILD    The visible page starts hidden (clip-path). Each cursor flies
 *              to an element and draws it with its own gesture: arrows drag a
 *              selection marquee, I-beams type it line by line, hands click it
 *              in, crosshairs measure it, pencils trace + fill it, move
 *              cursors slide it into place. Reading order, at most a few at
 *              once, so the page prints top-down instead of popping.
 *  4. FUSION   The swarm splits in two mirrored chevrons that pour into two
 *              lead Blips. They strike the pose, step in, touch tips: a
 *              2-frame flash, a shockwave ring, and one Blip remains, crackling
 *              with a pixel aura. He hands over to BlipCursor (the page pet).
 *
 * Repeat loads in the same tab session (theme switches reload the page) get a
 * ~1.3 s quick version. Any click / key / wheel / touch fast-forwards. Reduced
 * motion: never runs (the classic loader fade is kept).
 *
 * Contract with the rest of the boot:
 *  - ThemeManager.hideLoading() calls BlipSwarm.takeOver(); when it returns
 *    true the intro owns the loader and dissolves it itself.
 *  - BlipCursor.init() sees BlipSwarm.willRun and waits for appear(x, y).
 */
const BlipSwarm = (() => {
    const THEMES = ['default', 'terminal', 'blueprint', 'retro90s', 'fps'];
    // Loader canvas = the theme's own page colour, so the swarm draws on the
    // real background instead of a cream card.
    const BG = { default: '#f8f7f4', terminal: '#0a0a0a', blueprint: '#003366', retro90s: '#c0c0c0', fps: '#3a6896' };
    const ACCENT = { default: '#3d7a73', terminal: '#33ff00', blueprint: '#00ffff', retro90s: '#ff00ff', fps: '#f4b73a' };
    // Sprite tint per theme (cursor-sprites.js palette): classic white-on-black
    // cursors, phosphor green ones on the terminal; accent = small details.
    const FILL = { default: '#fff', terminal: '#33ff00', blueprint: '#fff', retro90s: '#fff', fps: '#fff' };
    const INK = { default: '#111', terminal: '#0a0a0a', blueprint: '#002244', retro90s: '#000', fps: '#0e1622' };
    const DETAIL = { default: '#3d7a73', terminal: '#ffb000', blueprint: '#ff6b6b', retro90s: '#ff00ff', fps: '#f4b73a' };

    const SEEN_KEY = 'blip-swarm-seen';
    const BLIP = { x: 12 * 1.75 - 6 * 1.75, y: 14 * 1.75 - 3 * 1.75 }; // pet body centre from his tip

    const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
    const REDUCED = mq('(prefers-reduced-motion: reduce)');
    const TOUCH = mq('(pointer: coarse)');

    const loader = document.getElementById('loading-screen');
    const willRun = !!(loader && !REDUCED && window.BlipCursor && window.CursorSprites &&
        document.body.classList.contains('loading'));
    let quick = false;
    try { quick = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* private mode */ }

    // Sizes / pacing
    // px per sprite pixel, snapped so one sprite pixel = whole device pixels
    // (crisp pixel art on 1×, 1.5×, 2×, 3× screens).
    const DPR = window.devicePixelRatio || 1;
    const U = Math.max(1, Math.round((TOUCH ? 1.4 : 1.75) * DPR)) / DPR;
    // Swarm size follows the page (a dozen elements doesn't need two dozen
    // idle cursors), but stays a crowd: that's the point.
    const swarmSize = n => quick ? 6 : TOUCH ? clamp(n + 4, 10, 14) : clamp(n + 8, 14, 24);
    const MINI = 0.85;                           // swarm Blips vs. the pet's size
    const MAX_TARGETS = quick ? 6 : (TOUCH ? 10 : 15);
    const MAX_ACTIVE = quick ? 6 : (TOUCH ? 4 : 7);
    const START_EVERY = quick ? 50 : 80;
    const HURRY_AT = quick ? 1600 : 3600;        // ms after the split: no new tasks, the rest fades in
    const HARD_CAP = quick ? 3500 : 8000;        // ms after the split: skip, whatever happens

    // Waiting cursors steer softly to their spot (px, s)
    const PARK_SPEED = 700, ACCEL = 8000, ARRIVE_R = 80;

    let theme = 'default';
    let layer = null;
    let rafId = null;
    let lastT = 0;
    let started = false;       // takeOver() received
    let skipping = false;
    let finished = false;
    let splitAt = 0;
    const frameCbs = new Set();
    const cursors = [];
    let lead = null;           // the conductor: the theme's own Blip
    let tasks = [];
    let activeTasks = 0;
    let nextStartAt = 0;
    let readyAt = 0;
    let buildOpen = false;
    let gagDone = false;
    let hurried = false;
    let fusing = false;
    let center = { x: 0, y: 0 };

    const DEBUG = /[?&]bsdebug/.test(location.search);
    const log = (...a) => DEBUG && console.log('[bs]', ...a);
    const now = () => performance.now();
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;

    // Easings
    const bez = (x1, y1, x2, y2) => {
        // cubic-bezier(x1,y1,x2,y2) solved by Newton iterations
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
    const inQuart = bez(0.5, 0, 0.75, 0);
    const fuseIn = bez(0.7, 0, 0.84, 0);
    const linear = t => t;

    function bootTheme() {
        let t = null;
        try { t = new URLSearchParams(location.search).get('theme'); } catch (e) { /* old browsers */ }
        if (THEMES.indexOf(t) === -1) {
            try { t = localStorage.getItem('portfolio_theme'); } catch (e) { t = null; }
        }
        return THEMES.indexOf(t) !== -1 ? t : 'default';
    }

    /* ---------- Frame loop & tiny timeline helpers ---------- */

    function loop(t) {
        rafId = requestAnimationFrame(loop);
        let dt = lastT ? (t - lastT) / 1000 : 0;
        lastT = t;
        if (dt > 1 / 30) dt = 1 / 30;
        if (started && !finished && splitAt && !fusing) {
            if (!hurried && t - splitAt > HURRY_AT) hurry();
            if (t - splitAt > HARD_CAP) skip();
        }
        schedule(t);
        frameCbs.forEach(cb => cb(t, dt));
        for (let i = 0; i < cursors.length; i++) stepCursor(cursors[i], dt, t);
    }

    // animate(ms, fn(p), ease): fn gets eased 0→1 every frame. Resolves at 1.
    // While skipping, everything resolves on the next frame at p = 1, unless
    // `force` (the skip ending itself must still play).
    function animate(ms, fn, ease, force) {
        const e = ease || linear;
        return new Promise(resolve => {
            const t0 = now();
            const cb = t => {
                let p = ms > 0 ? clamp((t - t0) / ms, 0, 1) : 1;
                if (skipping && !force) p = 1;
                fn(e(p), p);
                if (p >= 1) { frameCbs.delete(cb); resolve(); }
            };
            frameCbs.add(cb);
        });
    }
    const wait = (ms, force) => animate(ms, () => {}, linear, force);

    /* ---------- Cursors ---------- */

    function blipMarkup(skin, px) {
        return '<div class="bc bs-bc bc-theme-' + skin + '" style="--bc-px:' + px + '">' +
            window.BlipCursor.markup + '</div>';
    }

    // A cursor: an element whose origin IS its hotspot (same contract as
    // Blip), so rotation / squash pivot on the tip like a real pointer.
    function makeCursor(spec) {
        const el = document.createElement('div');
        el.className = 'bs-c';
        const inner = document.createElement('div');
        inner.className = 'bs-s';
        if (spec.blip) {
            inner.innerHTML = blipMarkup(spec.blip, 1.75);
        } else {
            const s = spec.sprite;
            inner.innerHTML = '<div class="bs-art" style="width:' + s.w * U + 'px;height:' + s.h * U +
                'px;margin-left:' + (-s.hotX * U) + 'px;margin-top:' + (-s.hotY * U) + 'px">' + s.markup + '</div>';
        }
        el.appendChild(inner);
        layer.appendChild(el);
        const c = {
            el, inner, kit: spec.blip ? inner.firstChild : null,
            tool: spec.tool, id: spec.id, blip: spec.blip || null,
            x: spec.x, y: spec.y, vx: 0, vy: 0, rot: 0, rotV: 0,
            scale: spec.scale != null ? spec.scale : 1, sx: 1, sy: 1, flip: 1,
            opacity: 1, mode: 'hover', tx: spec.x, ty: spec.y,
            bias: Math.random() < 0.5 ? -1 : 1, seed: Math.random() * 100,
            busy: false, press: 0, hidden: false, lockCenter: null
        };
        cursors.push(c);
        render(c, 0);
        return c;
    }

    function removeCursor(c) {
        const i = cursors.indexOf(c);
        if (i !== -1) cursors.splice(i, 1);
        if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    }

    function stepCursor(c, dt, t) {
        if (c.lockCenter) {
            // Scale around his body centre, not his tip.
            c.x = c.lockCenter.x - BLIP.x * c.scale;
            c.y = c.lockCenter.y - BLIP.y * c.scale;
        }
        if (!dt) { render(c, t); return; }
        if (c.mode === 'path') {
            stepPath(c, t, dt);
        } else if (c.mode === 'hover' || c.mode === 'park') {
            // Soft seek + arrive toward a drifting spot (waiting / formation).
            const dx = c.tx - c.x, dy = c.ty - c.y;
            const d = Math.hypot(dx, dy);
            const max = c.mode === 'hover' ? 160 : PARK_SPEED;
            let want = d > ARRIVE_R ? max : max * d / ARRIVE_R;
            let dvx = 0, dvy = 0;
            if (d > 0.01) {
                dvx = dx / d * want; dvy = dy / d * want;
                // A fixed-sign lateral bias curves every path a little: they
                // swoop like a hand moving a mouse, never on rails.
                if (d > ARRIVE_R) { dvx += -dy / d * want * 0.15 * c.bias; dvy += dx / d * want * 0.15 * c.bias; }
            }
            let ax = (dvx - c.vx) / dt, ay = (dvy - c.vy) / dt;
            const a = Math.hypot(ax, ay);
            if (a > ACCEL) { ax *= ACCEL / a; ay *= ACCEL / a; }
            c.vx += ax * dt; c.vy += ay * dt;
            c.x += c.vx * dt; c.y += c.vy * dt;
            // Parked: settle for good, so it costs no style writes at all.
            if (d < 0.5 && Math.abs(c.vx) + Math.abs(c.vy) < 8) { c.x = c.tx; c.y = c.ty; c.vx = c.vy = 0; }
        }
        // Tilt follows horizontal speed on a soft spring, ±20°.
        const wantRot = clamp(c.vx * 0.02, -20, 20);
        c.rotV += ((wantRot - c.rot) * 300 - c.rotV * 20) * dt;
        c.rot += c.rotV * dt;
        if (!wantRot && Math.abs(c.rot) < 0.05 && Math.abs(c.rotV) < 0.05) c.rot = c.rotV = 0;
        render(c, t);
    }

    // Kinematic move (actions): the cursor is placed exactly; its velocity
    // is derived so tilt keeps working.
    // Off duty: wait in the side gutter of your half of the screen, dimmed,
    // so the stage (and the text) stays clear for the cursors at work.
    function park(c) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const g = Math.max(18, Math.min(vw * 0.07, 90));
        const left = c.x < vw / 2;
        c.tx = left ? rand(14, g) : vw - rand(14, g) - 20;
        c.ty = rand(vh * 0.16, vh * 0.86);
        c.mode = 'park';
        c.opacity = 0.6;
    }

    function place(c, x, y, dt) {
        if (dt) { c.vx = (x - c.x) / dt; c.vy = (y - c.y) / dt; }
        c.x = x; c.y = y;
    }

    // Alive, not jittery: ~4 px of slow drift while a cursor waits.
    function drift(c, t) {
        const s = c.seed, k = (t || 0) / 1000;
        return {
            x: Math.sin(k * Math.PI + s) * 3 + Math.sin(k * 2.3 + s * 2) * 1.5,
            y: Math.cos(k * 0.8 * Math.PI + s * 1.7) * 3 + Math.sin(k * 1.9 + s) * 1.5
        };
    }

    function render(c, t) {
        let nx = 0, ny = 0;
        if (c.mode === 'hover') {
            const n = drift(c, t);
            nx = n.x; ny = n.y;
        }
        const sc = c.scale * (1 - c.press * 0.12);
        // Only touch the style when something actually changed: a resting
        // swarm then costs no style recalc.
        const a = 'translate3d(' + (c.x + nx).toFixed(1) + 'px,' + (c.y + ny).toFixed(1) + 'px,0)';
        const b = 'rotate(' + c.rot.toFixed(2) + 'deg) scale(' +
            (sc * c.sx * c.flip).toFixed(3) + ',' + (sc * c.sy).toFixed(3) + ')';
        if (a !== c.wa) { c.el.style.transform = a; c.wa = a; }
        if (b !== c.wb) { c.inner.style.transform = b; c.wb = b; }
        if (c.opacity !== c.wo) { c.el.style.opacity = c.opacity; c.wo = c.opacity; }
    }

    // Travel to (x, y) on a timed cubic arc: it leaves with the cursor's
    // current velocity (no snap when re-tasked mid-flight), bends a little to
    // its own side, and lands softly and exactly. Duration grows with √dist,
    // like a hand moving a mouse: long trips aren't proportionally longer.
    function seek(c, x, y) {
        return new Promise(resolve => {
            if (skipping) { c.x = x; c.y = y; c.vx = c.vy = 0; c.mode = 'kin'; resolve(); return; }
            if (c.mode === 'hover') {
                // Bake the visible drift into the start point: no hop on departure.
                const n = drift(c, now());
                c.x += n.x; c.y += n.y;
            }
            const dx = x - c.x, dy = y - c.y;
            const d = Math.hypot(dx, dy);
            const T = clamp(0.14 + Math.sqrt(d) * 0.02, 0.16, 0.6) * (quick ? 0.7 : 1);
            const bend = c.bias * Math.min(d, 500) * 0.12;
            const nx = d ? -dy / d : 0, ny = d ? dx / d : 0;
            c.path = {
                x0: c.x, y0: c.y,
                x1: c.x + c.vx * T / 3 + nx * bend, y1: c.y + c.vy * T / 3 + ny * bend,
                x2: x + nx * bend * 0.3, y2: y + ny * bend * 0.3,
                x3: x, y3: y, t0: now(), T: T * 1000, resolve
            };
            c.mode = 'path';
        });
    }

    function stepPath(c, t, dt) {
        const P = c.path;
        const u = clamp((t - P.t0) / P.T, 0, 1);
        const m = 1 - u;
        const x = m * m * m * P.x0 + 3 * m * m * u * P.x1 + 3 * m * u * u * P.x2 + u * u * u * P.x3;
        const y = m * m * m * P.y0 + 3 * m * m * u * P.y1 + 3 * m * u * u * P.y2 + u * u * u * P.y3;
        place(c, x, y, dt);
        if (u >= 1 || skipping) {
            c.x = P.x3; c.y = P.y3; c.vx = c.vy = 0;
            c.mode = 'kin';
            c.path = null;
            P.resolve();
        }
    }

    function kitPlay(c, cls, ms) {
        if (!c.kit) return;
        c.kit.classList.remove(cls);
        void c.kit.offsetWidth;
        c.kit.classList.add(cls);
        setTimeout(() => c.kit && c.kit.classList.remove(cls), ms);
    }

    async function press(c) {
        await animate(90, p => { c.press = p; }, outExpo);
    }
    async function release(c) {
        await animate(120, p => { c.press = 1 - p; }, outExpo);
    }

    /* ---------- Roster ---------- */

    function roster(n) {
        const sprites = window.CursorSprites.list.slice();
        const others = THEMES.filter(t => t !== theme);
        const blips = others.map(t => ({ blip: t, tool: 'select', id: 'blip-' + t }));
        const sp = sprites.map(s => ({ sprite: s, tool: s.tool, id: s.id }));
        // Order matters for the quick variant (first n): one of each core tool.
        const pick = id => sp.find(s => s.id === id);
        const core = ['ibeam', 'hand-point', 'crosshair', 'move', 'pencil', 'arrow-win']
            .map(pick).filter(Boolean);
        // Interleave Blips and OS cursors so the spiral alternates kinds.
        const mixed = [];
        for (let i = 0; i < Math.max(blips.length, sp.length); i++) {
            if (sp[i]) mixed.push(sp[i]);
            if (i % 3 === 1 && blips[(i - 1) / 3]) mixed.push(blips[(i - 1) / 3]);
        }
        blips.forEach(b => { if (mixed.indexOf(b) === -1) mixed.push(b); });
        const pool = quick ? core.concat(mixed) : mixed;
        const uniq = [];
        const seen = new Set();
        pool.forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); uniq.push(p); } });
        const out = uniq.slice(0, n);
        // Short of sprites? Second copies of the workhorses (text, links).
        const extra = core.length ? core : uniq;
        for (let i = 0; out.length < n; i++) out.push(extra[i % extra.length]);
        return out;
    }

    /* ---------- Targets ---------- */

    const SKIP_SEL = '#blip-swarm, #loading-screen, #cathode-guide, #cathode-fx, #blip-cursor, ' +
        'script, style, noscript, template, link, meta';
    const MEDIA = { IMG: 1, PICTURE: 1, VIDEO: 1, CANVAS: 1, SVG: 1, svg: 1, IFRAME: 1 };
    const CONTROL = { A: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1 };

    function ownText(el) {
        for (let n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 3 && n.nodeValue.trim()) return true;
        }
        return false;
    }

    function isLeaf(el) {
        return !!(MEDIA[el.tagName] || CONTROL[el.tagName] || el.tagName === 'HR' || ownText(el));
    }

    function inView(r, vw, vh) {
        return r.width >= 4 && r.height >= 4 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    }

    function collect(el, out, vw, vh) {
        for (let c = el.firstElementChild; c; c = c.nextElementSibling) {
            if (c.matches(SKIP_SEL)) continue;
            if (isLeaf(c)) {
                const r = c.getBoundingClientRect();
                if (!inView(r, vw, vh)) continue;
                // Screen-sized art (a theme's backdrop) is the canvas, not
                // something to draw.
                const vis = (Math.min(r.right, vw) - Math.max(r.left, 0)) * (Math.min(r.bottom, vh) - Math.max(r.top, 0));
                if (vis > vw * vh * 0.45) continue;
                const cs = getComputedStyle(c);
                if (cs.visibility === 'hidden' || cs.display === 'none') continue;
                out.push(c);
            } else {
                collect(c, out, vw, vh);
            }
        }
    }

    // Too many leaves for the swarm? Lift sibling leaves into their common
    // parent (one bigger reveal) until we fit, never past a section-sized box.
    function liftToFit(list, cap, vw, vh) {
        const maxArea = vw * vh * 0.55;
        let guard = 40;
        while (list.length > cap && guard--) {
            const byParent = new Map();
            list.forEach(el => {
                const p = el.parentElement;
                if (!p || p === document.body || p.tagName === 'MAIN' || p.tagName === 'HTML') return;
                byParent.set(p, (byParent.get(p) || 0) + 1);
            });
            let best = null, bestN = 1, bestA = Infinity;
            byParent.forEach((n, p) => {
                const r = p.getBoundingClientRect();
                const a = r.width * r.height;
                if (a > maxArea) return;
                if (n > bestN || (n === bestN && a < bestA)) { best = p; bestN = n; bestA = a; }
            });
            if (!best) {
                // No siblings left to merge: lift the smallest single leaf instead.
                let small = null, sa = Infinity;
                list.forEach(el => {
                    const p = el.parentElement;
                    if (!p || p === document.body || p.tagName === 'MAIN') return;
                    const r = p.getBoundingClientRect();
                    const a = r.width * r.height;
                    if (a <= maxArea && a < sa) { small = p; sa = a; }
                });
                if (!small) break;
                best = small;
            }
            list = list.filter(el => !best.contains(el));
            list.push(best);
        }
        return list;
    }

    let moveFlip = 0;
    function toolFor(el, r) {
        const tag = el.tagName;
        if (MEDIA[tag]) return Math.random() < 0.5 ? 'measure' : 'paint';
        if (CONTROL[tag] || el.getAttribute('role') === 'button') return r.width < 420 && r.height < 110 ? 'click' : 'select';
        // Small labels / numbers: alternate typed and slid in, for variety.
        if (r.width < 150 && r.height < 44) return ownText(el) && (moveFlip++ % 2) ? 'type' : 'move';
        if (ownText(el) && r.height < 260) return 'type';
        return Math.random() < 0.65 ? 'select' : 'paint';
    }

    function buildTasks() {
        // The loader just lifted `body.loading`: elements with `transition: all`
        // (the header) are still mid-way to `visibility: visible`. Land them.
        if (document.getAnimations && window.CSSTransition) {
            document.getAnimations().forEach(a => {
                if (a instanceof CSSTransition && a.transitionProperty === 'visibility') a.finish();
            });
        }
        moveFlip = 0;
        const vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
        let list = [];
        collect(document.body, list, vw, vh);
        list = liftToFit(list, MAX_TARGETS, vw, vh);
        const out = list.map(el => {
            const r = el.getBoundingClientRect();
            // The part on screen is what gets drawn; the rest comes for free.
            const v = {
                l: Math.max(r.left, 0), t: Math.max(r.top, 0),
                r: Math.min(r.right, vw), b: Math.min(r.bottom, vh)
            };
            v.w = v.r - v.l; v.h = v.b - v.t;
            return { el, r, v, tool: toolFor(el, r), saved: null, done: false };
        }).filter(t => t.v.w > 2 && t.v.h > 2);
        // Reading order: 48 px rows, then left to right.
        out.sort((a, b) => (Math.floor(a.v.t / 48) - Math.floor(b.v.t / 48)) || (a.v.l - b.v.l));
        return out;
    }

    function hideTask(task) {
        const s = task.el.style;
        task.saved = {
            clip: s.clipPath, wclip: s.webkitClipPath, transition: s.transition,
            translate: s.translate, willChange: s.willChange
        };
        s.transition = 'none'; // a theme's `transition: all` would make the reveal lag
        setClip(task, 'inset(0 0 100% 0)');
    }

    function setClip(task, v) {
        if (task.done) return; // skipped / finished meanwhile: never re-hide
        task.el.style.clipPath = v;
        task.el.style.webkitClipPath = v;
    }

    function restoreTask(task) {
        if (!task.saved) return;
        const s = task.el.style, o = task.saved;
        s.clipPath = o.clip || '';
        s.webkitClipPath = o.wclip || '';
        s.transition = o.transition || '';
        s.translate = o.translate || '';
        s.willChange = o.willChange || '';
        task.saved = null;
        task.done = true;
    }

    // inset() from the element's border box, revealing the visible-box
    // region [x0,x1]×[y0,y1] (viewport coords).
    function insetFor(task, x0, y0, x1, y1) {
        const r = task.r;
        return 'inset(' + Math.max(0, y0 - r.top).toFixed(1) + 'px ' + Math.max(0, r.right - x1).toFixed(1) + 'px ' +
            Math.max(0, r.bottom - y1).toFixed(1) + 'px ' + Math.max(0, x0 - r.left).toFixed(1) + 'px)';
    }

    /* ---------- Scheduler ---------- */

    function costFor(c, task) {
        const tx = task.v.l, ty = task.v.t;
        let cost = Math.hypot(c.x - tx, c.y - ty);
        if (c.tool !== task.tool) cost += 200;
        if (c.tool === 'type' && task.tool !== 'type') cost += 1e6; // I-beams only type text
        return cost;
    }

    function schedule(t) {
        if (!buildOpen || hurried || !tasks.length || skipping || t < nextStartAt || activeTasks >= MAX_ACTIVE) return;
        const free = cursors.filter(c => !c.busy && c !== lead && c.tool !== 'wait' && !c.hidden);
        if (!free.length) return;
        const task = tasks.find(k => !k.claimed);
        if (!task) return;
        let best = null, bestCost = Infinity;
        free.forEach(c => {
            const k = costFor(c, task);
            if (k < bestCost) { best = c; bestCost = k; }
        });
        if (best && best.id === 'not-allowed' && (gagDone || quick)) {
            best.tool = 'wait';
            return;
        }
        if (!best || bestCost >= 1e6) {
            // Only I-beams free and this isn't text: borrow the closest anyway.
            best = free[0];
        }
        task.claimed = true;
        best.opacity = 1;
        activeTasks++;
        nextStartAt = t + START_EVERY;
        best.busy = true;
        log('start', best.id, '→', task.tool, task.el.tagName, task.el.className);
        runTask(best, task).then(() => {
            activeTasks--;
            best.busy = false;
            park(best);
            log('end', best.id);
        });
    }

    // The one gag: "not-allowed" tries to click something in, gets refused
    // (two little shakes), hands the job back and just watches from then on.
    async function refuse(c, task) {
        const v = task.v;
        await seek(c, v.l + v.w / 2, v.t + v.h / 2);
        const x0 = c.x;
        await animate(320, p => { c.x = x0 + Math.sin(p * Math.PI * 4) * 3; });
        c.x = x0;
        c.tool = 'wait';
        task.claimed = false;
    }

    async function runTask(c, task) {
        if (c.id === 'not-allowed' && !gagDone && !quick && now() - splitAt < 1600) {
            gagDone = true;
            return refuse(c, task);
        }
        const tool = c.tool === 'type' && task.tool !== 'type' ? 'select'
            : (c.tool === 'wait' ? 'select' : c.tool);
        // Its own layer while it's drawn: the reveal mask changes every
        // frame, the page around it is never repainted for it.
        if (!task.done) task.el.style.willChange = 'transform';
        try {
            if (tool === 'type') await actType(c, task);
            else if (tool === 'click') await actClick(c, task);
            else if (tool === 'measure') await actRect(c, task, true);
            else if (tool === 'paint') await actPaint(c, task);
            else if (tool === 'move') await actMove(c, task);
            else await actRect(c, task, false);
        } finally {
            restoreTask(task);
        }
    }

    /* ---------- Actions ---------- */

    // The data trail each cursor leaves while drawing (data-trail.js).
    const NO_TRAIL = { write() {}, caughtUp() {}, edge() {}, ring() {}, settle() {} };
    function trailFor(v) {
        return window.DataTrail ? window.DataTrail.create(layer, { l: v.l, t: v.t, w: v.w, h: v.h }, { accent: ACCENT[theme] }) : NO_TRAIL;
    }

    function mark(cls) {
        const m = document.createElement('div');
        m.className = 'bs-mark ' + cls;
        layer.appendChild(m);
        return m;
    }

    function fadeMark(m, ms) {
        return animate(ms, p => { m.style.opacity = 1 - p; }, linear, true).then(() => m.remove());
    }

    // Arrow: rubber-band selection, the element revealed in sync with the
    // marquee. Crosshair (measure): same gesture, solid line + live W×H tag.
    async function actRect(c, task, measure) {
        const v = task.v;
        await seek(c, v.l, v.t);
        await press(c);
        const sel = window.DataTrail ? window.DataTrail.selection(layer, v, measure) : { el: mark(''), set() {} };
        let last = now();
        const dur = quick ? 300 : clamp(340 + Math.sqrt(v.w * v.h) * 0.4, 420, 600);
        const tr = trailFor(v);
        await animate(dur, p => {
            const t = now();
            const x = v.l + v.w * p, y = v.t + v.h * p;
            place(c, x, y, (t - last) / 1000); last = t;
            tr.edge(x, y);
            sel.set(p, p);
            setClip(task, insetFor(task, v.l, v.t, x, y));
        }, inOutQuart);
        c.vx = c.vy = 0;
        restoreTask(task);
        tr.settle();
        release(c);
        if (measure && !quick) await wait(120);
        fadeMark(sel.el, 160);
    }

    // I-beam / block caret: types the element word by word — each word laid
    // down as data first, resolving into its letters right behind the caret.
    async function actType(c, task) {
        const v = task.v, r = task.r;
        const words = window.DataTrail ? window.DataTrail.words(task.el) : [];
        if (!words.length) return actRect(c, task, false);
        const first = words[0];
        await seek(c, r.left + Math.max(0, first.left - 2), r.top + (first.top + first.bottom) / 2);
        if (!quick) await animate(140, p => { c.opacity = p < 0.5 ? 0.2 : 1; });
        const per = Math.min(quick ? 60 : 95, (quick ? 350 : 1100) / words.length);
        const T = per * words.length, RESOLVE = quick ? 80 : 150;
        const W = r.width;
        const clipTo = (i) => {
            const w = words[i];
            const y0 = Math.max(0, w.top - 2), y1 = w.bottom + 4;
            setClip(task, 'polygon(0px 0px,' + W + 'px 0px,' + W + 'px ' + y0 + 'px,' + (w.right + 2) + 'px ' + y0 + 'px,' +
                (w.right + 2) + 'px ' + y1 + 'px,0px ' + y1 + 'px)');
        };
        const tr = trailFor({ l: r.left, t: r.top, w: r.width, h: r.height });
        const sx = c.x, sy = c.y;
        let last = now(), shown = -1;
        await animate(T + RESOLVE, (e, p) => {
            const ms = p * (T + RESOLVE);
            const i = Math.min(words.length - 1, Math.floor(ms / per));
            const k = clamp((ms - i * per) / per, 0, 1);
            const w = words[i], prev = i ? words[i - 1] : null;
            const sameLine = prev && Math.abs(prev.top - w.top) < 4;
            const fx = sameLine ? r.left + prev.right + 3 : (prev ? r.left + w.left - 2 : sx);
            const fy = prev ? r.top + (w.top + w.bottom) / 2 : sy;
            const q = outExpo(k);
            const t = now();
            place(c, lerp(fx, r.left + w.right + 3, q), lerp(fy, r.top + (w.top + w.bottom) / 2, q), (t - last) / 1000);
            last = t;
            tr.write(c.x, r.top + w.top, r.top + w.bottom);
            const done = Math.min(words.length - 1, Math.floor((ms - RESOLVE) / per));
            if (done > shown) {
                shown = done;
                clipTo(done);
                tr.caughtUp(r.left + words[done].right + 3, r.top + words[done].top);
            }
        });
        c.vx = c.vy = 0;
        restoreTask(task);
        tr.settle();
    }

    // Hand: dips, clicks, and the element pops in from the click point.
    async function actClick(c, task) {
        const v = task.v;
        const px = v.l + v.w * rand(0.35, 0.65), py = v.t + v.h * rand(0.35, 0.65);
        await seek(c, px, py - 2);
        await animate(90, p => { c.press = p; c.y = py - 2 + 2 * p; }, outExpo);
        const ring = mark('bs-ripple');
        ring.style.transform = 'translate(' + px + 'px,' + py + 'px)';
        const r = task.r;
        const cx = px - r.left, cy = py - r.top;
        const far = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) * 1.05;
        release(c);
        const tr = trailFor(v);
        await animate(quick ? 300 : 420, p => {
            setClip(task, 'circle(' + (far * p).toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)');
            if (p < 0.85) tr.ring(px, py, far * p);
            ring.style.setProperty('--r', (6 + 30 * p) + 'px');
            ring.style.opacity = 1 - p;
        }, outExpo);
        restoreTask(task);
        tr.settle();
        ring.remove();
    }

    // Pencil / bucket: the outline is traced around the box, then the inside
    // fills top to bottom.
    async function actPaint(c, task) {
        const v = task.v;
        await seek(c, v.l, v.t);
        const line = window.DataTrail ? window.DataTrail.outline(layer, v) : { el: mark(''), set() {} };
        const per = 2 * (v.w + v.h);
        let last = now();
        await animate(quick ? 200 : 380, p => {
            // Walk the perimeter clockwise.
            let d = p * per;
            let x, y;
            if (d <= v.w) { x = v.l + d; y = v.t; }
            else if ((d -= v.w) <= v.h) { x = v.r; y = v.t + d; }
            else if ((d -= v.h) <= v.w) { x = v.r - d; y = v.b; }
            else { d -= v.w; x = v.l; y = v.b - d; }
            const t = now();
            place(c, x, y, (t - last) / 1000); last = t;
            line.set(p);
        }, inOutQuart);
        c.vx = c.vy = 0;
        await press(c);
        release(c);
        const tr = trailFor(v);
        await animate(quick ? 180 : 320, p => {
            setClip(task, insetFor(task, v.l, v.t, v.r, v.t + v.h * p));
            tr.edge(v.r, v.t + v.h * p);
        }, outExpo);
        restoreTask(task);
        tr.settle();
        fadeMark(line.el, 200);
    }

    // Move: grabs the element 24 px off its spot and settles it in place
    // (spring, one small overshoot).
    async function actMove(c, task) {
        const v = task.v;
        const gx = v.l + v.w / 2, gy = v.t + v.h / 2;
        const ang = Math.atan2(gy - c.y, gx - c.x);
        const ox = -Math.cos(ang) * 24, oy = -Math.sin(ang) * 24;
        task.el.style.translate = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
        await seek(c, gx + ox, gy + oy);
        await press(c);
        setClip(task, 'none');
        // Spring k320 / c26 from the offset to 0.
        let px = ox, py = oy, vx = 0, vy = 0;
        await animate(quick ? 260 : 420, (e, p) => {
            const dt = 1 / 60;
            for (let i = 0; i < 2; i++) {
                vx += (-px * 320 - vx * 26) * dt / 2; vy += (-py * 320 - vy * 26) * dt / 2;
                px += vx * dt / 2; py += vy * dt / 2;
            }
            if (p >= 1) { px = py = 0; }
            if (!task.done) task.el.style.translate = px.toFixed(2) + 'px ' + py.toFixed(2) + 'px';
            place(c, gx + px, gy + py, 1 / 60);
        });
        c.vx = c.vy = 0;
        restoreTask(task);
        release(c);
    }

    /* ---------- The show ---------- */

    function boot() {
        if (!willRun) return;
        theme = bootTheme();
        document.documentElement.classList.add('bs-intro');
        loader.classList.add('bs-on');
        loader.style.background = BG[theme];

        layer = document.createElement('div');
        layer.id = 'blip-swarm';
        layer.className = 'bs-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.setProperty('--bs-accent', ACCENT[theme]);
        layer.style.setProperty('--cs-ink', INK[theme]);
        layer.style.setProperty('--cs-accent', DETAIL[theme]);
        layer.style.color = FILL[theme];
        document.body.appendChild(layer);

        center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        lead = makeCursor({ blip: theme, tool: 'lead', id: 'lead', x: center.x, y: center.y, scale: 0.6 });
        lead.mode = 'kin';
        lead.lockCenter = center;
        rafId = requestAnimationFrame(loop);

        // Pop in on a spring (k380 / c24), then breathe and blink.
        let s = 0.6, sv = 0;
        const pop = (t, dt) => {
            if (!dt) return;
            sv += ((2 - s) * 380 - sv * 24) * dt;
            s += sv * dt;
            if (Math.abs(2 - s) < 0.002 && Math.abs(sv) < 0.01) { s = 2; frameCbs.delete(pop); frameCbs.add(breathe); }
            lead.scale = s;
        };
        const breathe = t => {
            if (readyAt) { frameCbs.delete(breathe); return; }
            lead.sy = 1 + Math.sin(t / 1000 * 2 * Math.PI * 0.6) * 0.03;
        };
        frameCbs.add(pop);
        setTimeout(() => !readyAt && kitPlay(lead, 'bc-blink', 240), 420);
        setTimeout(() => !readyAt && kitPlay(lead, 'bc-gag-2', 1500), 1600);

        const skipEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
        const onSkip = e => {
            if (!started || finished) return;
            if (e.type === 'pointerdown' || e.type === 'touchstart') swallowClick();
            skip();
        };
        skipEvents.forEach(ev => window.addEventListener(ev, onSkip, { capture: true, passive: ev !== 'pointerdown' }));
        const onHidden = () => { if (document.hidden && started) skip(); };
        document.addEventListener('visibilitychange', onHidden);
        boot.cleanup = () => {
            skipEvents.forEach(ev => window.removeEventListener(ev, onSkip, { capture: true }));
            document.removeEventListener('visibilitychange', onHidden);
        };
    }

    // The press that skips must not also click what's under it (content
    // that wasn't drawn yet). On touch the click target is picked after the
    // tap, so the layer keeps catching until that click has been eaten.
    let swallowing = false;
    function swallowClick() {
        if (swallowing || !layer) return;
        swallowing = true;
        const done = () => {
            window.removeEventListener('click', eat, true);
            clearTimeout(timer);
            if (layer) layer.classList.remove('bs-live');
        };
        const eat = e => { e.preventDefault(); e.stopPropagation(); done(); };
        window.addEventListener('click', eat, true);
        const timer = setTimeout(done, 450);
    }

    // ThemeManager.hideLoading() lands here once content is on the page.
    function takeOver() {
        if (!willRun || !layer || started) return false;
        started = true;
        readyAt = now();
        try {
            tasks = buildTasks();
            tasks.forEach(hideTask);
            log('tasks', tasks.map(t => t.tool + ':' + t.el.tagName + '.' + (t.el.className || '').toString().split(' ')[0] + '@' + Math.round(t.v.l) + ',' + Math.round(t.v.t) + ' ' + Math.round(t.v.w) + 'x' + Math.round(t.v.h)).join(' | '));
        } catch (e) {
            console.error('[BlipSwarm] targets failed', e);
            tasks = [];
        }
        layer.classList.add('bs-live'); // swallows clicks on not-yet-drawn content
        run().catch(err => {
            console.error('[BlipSwarm] intro failed', err);
            finish(true);
        });
        return true;
    }

    async function run() {
        // Let the lone Blip be seen for a beat even on a warm cache.
        const minAlone = quick ? 0 : 650;
        const elapsed = now() - bootAt;
        if (elapsed < minAlone) await wait(minAlone - elapsed);
        if (skipping) return;
        lead.sy = 1;
        splitAt = now();
        log('split');

        await split();
        if (skipping) return;
        // Build until every task is drawn.
        await new Promise(resolve => {
            const check = () => {
                if (skipping || (tasks.every(t => t.done) && activeTasks === 0)) { frameCbs.delete(check); resolve(); }
            };
            frameCbs.add(check);
        });
        if (skipping) return;
        await wait(120);
        if (skipping) return;
        log('fuse');
        fusing = true;
        if (quick) await quickFuse();
        else await fuse();
        if (!skipping) finish();
    }

    async function split() {
        const list = roster(swarmSize(tasks.length));
        if (quick) {
            // One twirl, and out they come.
            await animate(240, p => { lead.rot = 360 * p; lead.scale = 2 - 0.6 * p; }, inOutQuart);
            lead.rot = 0;
            if (skipping) return;
        } else {
            // Wind-up: squash 1.2 × 0.75 (ease in), shiver ±1 px the last 160 ms, eyes shut.
            kitPlay(lead, 'bc-blink', 240);
            await animate(260, (e, p) => {
                lead.sx = 1 + 0.2 * e; lead.sy = 1 - 0.25 * e;
                const j = p > 0.38 ? 1 : 0;
                lead.lockCenter = { x: center.x + j * (Math.random() < 0.5 ? -1 : 1), y: center.y + j * (Math.random() < 0.5 ? -1 : 1) };
            }, inQuart);
            lead.lockCenter = center;
            if (skipping) return;
            // Two white silhouette frames: the "pop".
            lead.inner.classList.add('bs-white');
            await wait(34);
            lead.inner.classList.remove('bs-white');
            lead.sx = 0.9; lead.sy = 1.1;
            animate(260, p => { lead.sx = lerp(0.9, 1, p); lead.sy = lerp(1.1, 1, p); }, outExpo);
        }
        // Emission along a golden-angle spiral, 20 ms apart; he shrinks as
        // he loses mass (2× → 1×), each spit a tiny recoil.
        const GOLD = Math.PI * (3 - Math.sqrt(5));
        const a0 = rand(0, Math.PI * 2);
        const cx = center.x, cy = center.y;
        // The canvas opens as the first cursors fly out: they head straight
        // for their first element mid-burst.
        dissolveLoader();
        buildOpen = true;
        for (let i = 0; i < list.length && !skipping; i++) {
            const ang = a0 + i * GOLD;
            const sp = rand(600, 800) * (TOUCH ? 0.7 : 1);
            // Born 14 px out along its heading, from behind him.
            const c = makeCursor(Object.assign({ x: cx + Math.cos(ang) * 14, y: cy + Math.sin(ang) * 14, scale: 0.3 }, list[i]));
            layer.insertBefore(c.el, lead.el);
            if (c.blip) c.scale = 0.3 * MINI;
            c.mode = 'free';
            c.vx = Math.cos(ang) * sp; c.vy = Math.sin(ang) * sp;
            const full = c.blip ? MINI : 1;
            animate(160, p => { c.scale = lerp(0.3 * full, full, p); }, outExpo);
            const drag = t => {
                if (c.mode !== 'free') { frameCbs.delete(drag); return; }
                const dt = 1 / 60;
                c.vx *= Math.exp(-5 * dt); c.vy *= Math.exp(-5 * dt);
                c.x += c.vx * dt; c.y += c.vy * dt;
                if (Math.hypot(c.vx, c.vy) < 60) {
                    park(c);
                    frameCbs.delete(drag);
                }
            };
            frameCbs.add(drag);
            lead.scale = lerp(quick ? 1.4 : 2, 1, (i + 1) / list.length);
            lead.press = 1;
            animate(70, p => { lead.press = 1 - p; });
            if (!skipping) await wait(20);
        }
        // The conductor steps back: present, quieter, still blinking.
        lead.opacity = 0.55;
    }

    function dissolveLoader() {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 520);
    }

    // DBZ fusion, in a minimal visual language.
    async function fuse() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const F = { x: vw / 2, y: vh / 2 };          // where the tips will touch
        const GAP = 32;
        // Leads: left = another skin, mirrored; right = the theme's own Blip.
        // Left lead: a skin that pops on this theme's background.
        const leftSkin = { default: 'terminal', terminal: 'blueprint', blueprint: 'retro90s', retro90s: 'terminal', fps: 'retro90s' }[theme];
        let left = cursors.find(c => c.blip === leftSkin) || makeCursor({ blip: leftSkin, tool: 'lead', id: 'lead-l', x: F.x - 200, y: F.y, scale: MINI });
        const right = lead;
        right.lockCenter = null;
        left.busy = right.busy = true;
        right.opacity = 1;
        left.opacity = 1;
        left.flip = -1;
        animate(400, p => { left.scale = lerp(MINI, 1, p); }, outExpo);
        await Promise.all([seek(left, F.x - GAP, F.y), seek(right, F.x + GAP, F.y)]);
        left.mode = right.mode = 'kin';

        // Two mirrored chevrons pour into their lead, tail first.
        const rest = cursors.filter(c => c !== left && c !== right);
        const leftGroup = rest.filter(c => c.x < F.x).sort((a, b) => dist(b, F) - dist(a, F));
        const rightGroup = rest.filter(c => c.x >= F.x).sort((a, b) => dist(b, F) - dist(a, F));
        const absorb = (group, into, side) => Promise.all(group.map((c, i) => (async () => {
            await wait(i * 25);
            c.mode = 'kin';
            if (!c.blip) c.opacity = 0.6; // the two leads own the frame
            const sx = c.x, sy = c.y;
            const ex = into.x, ey = into.y + 6;
            // Mirrored bezier: bulge outward on its own side, then in.
            const mx = lerp(sx, ex, 0.5) + side * 120, my = lerp(sy, ey, 0.5);
            let last = now();
            await animate(380, e => {
                const u = 1 - e;
                const x = u * u * sx + 2 * u * e * mx + e * e * ex;
                const y = u * u * sy + 2 * u * e * my + e * e * ey;
                const t = now(); place(c, x, y, (t - last) / 1000); last = t;
            }, fuseIn);
            await animate(60, p => { c.scale *= (1 - p * 0.5); c.opacity = 1 - p; });
            removeCursor(c);
            into.scale = Math.min(into.scale * 1.02, 1.25);
        })()));
        await Promise.all([absorb(leftGroup, left, -1), absorb(rightGroup, right, 1)]);
        if (skipping) return;

        // The pose: mirrored, paw up, held 200 ms.
        kitPlay(left, 'bc-gag-3', 1400);
        kitPlay(right, 'bc-gag-3', 1400);
        await wait(260);
        // Step in on 3 hard frames (anime keyframes) until the tips touch.
        const lx = left.x, rx = right.x;
        const ls = left.scale, rs = right.scale;
        await animate(180, (e, p) => {
            const s = Math.min(3, Math.floor(p * 3 + 0.0001)) / 3;
            left.x = lerp(lx, F.x - 2, s);
            right.x = lerp(rx, F.x + 2, s);
        });
        if (skipping) return;

        // Flash: 2 frames white silhouette, 1 frame inverted, bloom, +6 % light.
        left.inner.classList.add('bs-white'); right.inner.classList.add('bs-white');
        shockwave(F.x, F.y);
        const bloom = mark('bs-bloom');
        bloom.style.transform = 'translate(' + F.x + 'px,' + F.y + 'px)';
        const veil = mark('bs-veil');
        animate(160, p => {
            bloom.style.opacity = 1 - p;
            bloom.style.setProperty('--r', (10 + 30 * p) + 'px');
            veil.style.opacity = 0.06 * (1 - p);
        }, outExpo, true).then(() => { bloom.remove(); veil.remove(); });
        await wait(34, true);
        left.inner.classList.remove('bs-white'); right.inner.classList.remove('bs-white');
        left.inner.classList.add('bs-invert'); right.inner.classList.add('bs-invert');
        await wait(17, true);
        removeCursor(left);

        // One Blip remains, on the touch point.
        const tipX = F.x - BLIP.x, tipY = F.y - BLIP.y;
        right.inner.classList.remove('bs-invert');
        right.flip = 1;
        right.rot = 0; right.rotV = 0;
        right.lockCenter = F;
        await settle(right, 1.55); // bigger than both leads, then springs down
        right.lockCenter = null;
        right.x = tipX; right.y = tipY;
    }

    async function quickFuse() {
        const target = lead;
        target.opacity = 1;
        const rest = cursors.filter(c => c !== target);
        const ex = target.x, ey = target.y + 8;
        await Promise.all(rest.map(c => (async () => {
            c.mode = 'kin';
            const sx = c.x, sy = c.y;
            let last = now();
            await animate(280, e => {
                const t = now(); place(c, lerp(sx, ex, e), lerp(sy, ey, e), (t - last) / 1000); last = t;
                c.scale = lerp(c.blip ? MINI : 1, 0.2, e);
            }, inQuart);
            removeCursor(c);
        })()));
        target.lockCenter = { x: target.x + BLIP.x * target.scale, y: target.y + BLIP.y * target.scale };
        shockwave(target.lockCenter.x, target.lockCenter.y, true);
        await settle(target, 1.15, 320);
        target.lockCenter = null;
    }

    function dist(c, p) { return Math.hypot(c.x - p.x, c.y - p.y); }

    // Ring r 0→240 px (outExpo 480 ms) + a thinner echo 90 ms later.
    function shockwave(x, y, single) {
        const ring = (w, delay, max) => {
            const m = mark('bs-ring');
            m.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            m.style.setProperty('--w', w + 'px');
            m.style.opacity = 0;
            wait(delay, true).then(() => animate(480, (e, p) => {
                m.style.setProperty('--r', (max * e) + 'px');
                m.style.opacity = 1 - p;
            }, outExpo, true)).then(() => m.remove());
        };
        ring(1.5, 0, single ? 140 : 240);
        if (!single) ring(0.75, 90, 200);
    }

    // The new Blip lands at `from`× scale and settles on a spring (k220/c14,
    // exactly one overshoot), wrapped in a pixel "ki" aura: a 1 px accent
    // outline flickering at 12 fps, and square sparks rising off him on hard
    // steps — both die out over 1.2 s.
    async function settle(c, from, ms) {
        const dur = ms || 1000;
        c.scale = from;
        c.opacity = 1;
        let s = from, v = 0;
        const OUTLINE = 'drop-shadow(1px 0 0 var(--bs-accent)) drop-shadow(-1px 0 0 var(--bs-accent)) ' +
            'drop-shadow(0 1px 0 var(--bs-accent)) drop-shadow(0 -1px 0 var(--bs-accent))';
        const sparks = [];
        const lc = c.lockCenter || { x: c.x + BLIP.x, y: c.y + BLIP.y };
        for (let i = 0; i < (ms ? 0 : 8); i++) {
            const m = mark('bs-spark');
            const side = i % 2 ? 1 : -1;
            sparks.push({ m, x: lc.x + side * rand(24, 38), y: lc.y + rand(-4, 24), born: i * 0.08 + rand(0, 0.05), rise: rand(40, 64) });
        }
        await animate(dur, (e, p) => {
            const dt = 1 / 60;
            v += ((1 - s) * 220 - v * 14) * dt;
            s += v * dt;
            c.scale = p >= 1 ? 1 : s;
            const frame = Math.floor(p * dur / 83);
            c.inner.style.filter = p < 0.85 && frame % 3 !== 2 ? OUTLINE : '';
            const k = p * 1.2;
            sparks.forEach(sp => {
                const life = clamp((k - sp.born) / 0.5, 0, 1);
                const step = Math.floor(life * 6) / 6; // pixel-art: 6 hard steps
                sp.m.style.transform = 'translate(' + Math.round(sp.x) + 'px,' + Math.round(sp.y - sp.rise * step) + 'px)';
                sp.m.style.opacity = life > 0 && life < 1 ? (1 - step) : 0;
            });
        }, linear, true);
        c.inner.style.filter = '';
        sparks.forEach(sp => sp.m.remove());
    }

    // Running long (a dense page): whatever isn't claimed yet fades in, the
    // cursors at work finish their gesture, then the fusion plays as usual.
    function hurry() {
        hurried = true;
        log('hurry');
        tasks.forEach(t => {
            if (t.claimed || t.done) return;
            restoreTask(t);
            if (t.el.animate) t.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
        });
    }

    function skip() {
        if (skipping || finished || !started) return;
        skipping = true;
        // Whatever is still hidden fades in quickly; then the cursors collapse
        // onto Blip with a single ring.
        tasks.forEach(t => {
            if (t.done) return;
            restoreTask(t);
            if (t.el.animate) t.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
        });
        tasks = [];
        if (loader.isConnected) dissolveLoader();
        if (!swallowing) layer.classList.remove('bs-live');
        (async () => {
            await wait(20, true);
            const target = lead;
            const cc = target.lockCenter || { x: target.x + BLIP.x * target.scale, y: target.y + BLIP.y * target.scale };
            target.lockCenter = null;
            target.scale = 1; target.opacity = 1; target.flip = 1; target.sx = target.sy = 1;
            target.mode = 'kin';
            target.x = cc.x - BLIP.x; target.y = cc.y - BLIP.y;
            const ex = target.x, ey = target.y;
            target.inner.classList.remove('bs-white', 'bs-invert');
            await Promise.all(cursors.filter(c => c !== target).map(c => (async () => {
                c.mode = 'kin';
                const sx = c.x, sy = c.y;
                await animate(240, e => {
                    c.x = lerp(sx, ex, e); c.y = lerp(sy, ey, e);
                    c.scale = lerp(c.blip ? MINI : 1, 0.2, e);
                }, bez(0.4, 0, 0.2, 1), true);
                removeCursor(c);
            })()));
            shockwave(ex + BLIP.x, ey + BLIP.y, true);
            target.scale = 1;
            await wait(160, true);
            finish();
        })();
    }

    function finish(failed) {
        if (finished) return;
        finished = true;
        if (layer && !swallowing) layer.classList.remove('bs-live'); // the page is live now
        tasks.forEach(restoreTask);
        if (loader.isConnected) dissolveLoader();
        try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private mode */ }
        // bs-done keeps the theme's whole-body fade-in off for good (it would
        // replay the page entrance on top of ours); Cathode (bs-intro) walks
        // in a beat after Blip lands.
        document.documentElement.classList.add('bs-done');
        setTimeout(() => document.documentElement.classList.remove('bs-intro'), failed ? 0 : 600);
        if (boot.cleanup) boot.cleanup();
        const tip = lead && !failed ? { x: lead.x, y: lead.y } : null;
        // Hand the stage to the page pet, on the exact same pixel.
        window.BlipCursor.appear(tip ? tip.x : null, tip ? tip.y : null);
        if (tip) setTimeout(() => window.BlipCursor.react('joy'), 30);
        // Below the fold, the page now draws itself as it scrolls in.
        setTimeout(() => window.BlipDraw && window.BlipDraw.start(), 60);
        // Let the last ring finish, then tear down.
        setTimeout(() => {
            if (lead) removeCursor(lead);
            cancelAnimationFrame(rafId);
            frameCbs.clear();
            if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
            layer = null;
        }, 520);
        if (lead) lead.el.style.visibility = 'hidden';
    }

    const bootAt = now();
    boot();

    return {
        willRun,
        takeOver,
        skip,
        get running() { return started && !finished; }
    };
})();

window.BlipSwarm = BlipSwarm;
