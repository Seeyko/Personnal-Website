/**
 * Blip Draw — Blip draws the rest of the site as you scroll to it.
 *
 * Blip is the cursor agent who built this site, and drawing it is his job.
 * Below the fold (and on the blog), every group — a section title, a card,
 * the timeline, the 3D heart, a blog card... — starts hidden. When it
 * scrolls into view, Blip flies over and draws it himself with one gesture
 * (selection marquee, typing, click, measure, pencil + fill, slide into
 * place), then moves straight on to the next one. When he falls behind, he
 * spits out a small helper cursor (two at most, one on touch screens) that
 * draws a group and flies back into him. The git timeline gets a show of
 * its own: Blip rides the trunk and every line, node and commit card is
 * traced as he passes, with a pencil helper inking the branches above him.
 *
 * Rules that keep it classy and never in the way:
 * - in reading order; a group waiting too long, or a visitor scrolling
 *   faster than Blip can draw, gets a plain fade instead: content never lags;
 * - a group scrolled past before its turn is simply shown; one that leaves
 *   the screen mid-draw finishes at once;
 * - grab Blip mid-job and the job just completes; he's hired again later;
 * - the generic GSAP fade-ins are switched off on the groups it draws (no
 *   double animation); theme-specific effects and the footer's own entrance
 *   are left alone;
 * - helpers live in a document-space layer (they scroll with the page on the
 *   compositor); the frame loop only runs while someone is working.
 * prefers-reduced-motion: never runs.
 */
const BlipDraw = (() => {
    const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
    const REDUCED = mq('(prefers-reduced-motion: reduce)');
    const TOUCH = mq('(pointer: coarse)');
    const DPR = window.devicePixelRatio || 1;
    const U = Math.max(1, Math.round((TOUCH ? 1.4 : 1.75) * DPR)) / DPR;

    const MAX_HELPERS = TOUCH ? 1 : 2; // Blip does the bulk himself
    const HELP_AFTER = 1000;      // ms a group waits for Blip before he calls a helper
    const QUEUE_MAX = 5;          // more waiting than this = visitor outpaces us: fade the rest in
    const WAIT_MAX = 3000;        // ms a group may wait before it just fades in
    const START_GAP = 110;        // ms between two starts
    const RELEASE_AFTER = 350;    // ms with nothing to draw before Blip goes back to his life

    // What counts as one drawable group, top-most match wins.
    const UNIT_SEL = '.section-header, [class*="card"]:not([class*="card-"]):not([class*="cards"]), ' +
        'figure, img, canvas, video, pre, blockquote, p, h2, h3, h4, ul, ol, table, .btn, button, ' +
        'a[class*="cta"], .section-footer, .mobile-commit';
    // In a blog article only the headings and media are drawn: the text
    // itself is there to be read straight away.
    const ARTICLE_BODY = '#article-content';
    const ARTICLE_UNIT = 'h2, h3, h4, img, figure, pre, blockquote, table, video';
    // Not ours: the hero (the intro draws it), the footer (its own entrance),
    // fixed UI, the mascots.
    const SKIP_SEL = '.hero, #site-footer, footer, .header, #cathode-guide, #cathode-fx, ' +
        '#blip-swarm, #blip-draw, #blip-cursor, .floating-cta, script, style, [hidden]';
    // Footer bits Blip draws himself (the rest of the footer keeps its own
    // entrance): the closing tagline and the e-mail pill.
    const EXTRA_UNITS = '#site-footer .sf-headline, #site-footer .sf-pill';
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
    // Page scroll, cached from the scroll event (it fires right before the
    // frame callbacks, while layout is clean): Safari lays out the whole page
    // on every scrollY read once it's scrolled — per frame, behind our own
    // style writes, that's what froze the page on iPhone.
    let SX = 0, SY = 0;
    function readScroll() { SX = window.scrollX; SY = window.scrollY; }
    let io = null;
    let units = [];
    const queue = [];
    let active = 0;
    let helpers = 0;
    let nextStartAt = 0;
    let includeVisible = false;
    // Blip as the main worker: hired while there's work, driven frame by frame.
    const boss = { hired: false, busy: false, c: null, idleSince: 0 };
    const stats = { boss: 0, helper: 0, faded: 0 };
    let rafId = null;
    let lastT = 0;
    let theme = 'default';
    const frameCbs = new Set();
    const pickCount = {};
    let lastReactAt = 0;

    const DEBUG = /[?&]bddebug/.test(location.search);
    const log = (...a) => DEBUG && console.log('[bd]', ...a);
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
        // Something above may already have woken the loop (wake() during
        // this frame): never book a second frame, or the loops multiply.
        if (!rafId && (frameCbs.size || queue.length || active)) rafId = requestAnimationFrame(loop);
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
        const sections = [...document.querySelectorAll('#main-content > section, main > section, main > article')]
            .filter(s => !s.matches(SKIP_SEL));
        const out = [];
        sections.forEach(sec => {
            let c = [...sec.querySelectorAll(UNIT_SEL)].filter(el => {
                const body = el.closest(ARTICLE_BODY);
                return !body || el.matches(ARTICLE_UNIT);
            });
            // Blocks with no recognised group inside (the git timeline) are a
            // group of their own — unless huge (an article body).
            [...sec.children].forEach(ch => {
                if (ch.matches(ARTICLE_BODY)) return;
                if (!c.some(u => ch.contains(u) || u.contains(ch)) && ch.getBoundingClientRect().height < vh * 1.4) c.push(ch);
            });
            c = c.filter(el => {
                if (el.__bd || el.closest(SKIP_SEL)) return false;
                const r = el.getBoundingClientRect();
                if (r.width < 12 || r.height < 12) return false;
                if (getComputedStyle(el).position === 'fixed') return false;
                // Already on screen = drawn by the intro (index), unless this
                // page has no intro (blog), where Blip draws those too.
                return includeVisible ? r.bottom > 0 : r.top >= vh - 1;
            });
            c = c.filter(el => !c.some(o => o !== el && o.contains(el)));
            out.push(...c);
        });
        document.querySelectorAll(EXTRA_UNITS).forEach(el => {
            if (el.__bd) return;
            const r = el.getBoundingClientRect();
            if (r.width < 12 || r.height < 12) return;
            if (includeVisible ? r.bottom > 0 : r.top >= vh - 1) {
                // Out of the footer's blur-in choreography: Blip draws it.
                el.removeAttribute('data-sf-reveal');
                out.push(el);
            }
        });
        return out;
    }

    function toolFor(el, r) {
        const tag = el.tagName;
        if (el.matches('.sf-pill')) return 'click'; // the e-mail pill pops in from his click
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
        u.saved = { clip: s.clipPath, wclip: s.webkitClipPath, transition: s.transition, translate: s.translate, willChange: s.willChange };
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
        s.willChange = o.willChange || '';
        u.el.removeAttribute('data-bd-pending');
        if (io) io.unobserve(u.el);
    }

    function fadeIn(u) {
        if (u.done) return;
        stats.faded++;
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
        // Measured once here (it reads layout), never per frame.
        u.show = isShowpiece(u.el);
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
        // Nothing starts while the page is still behind its loader.
        if (document.body.classList.contains('loading')) { sweepWhenShown(); return; }
        const vh = window.innerHeight;
        units.forEach(u => {
            if (u.done) return;
            const r = u.el.getBoundingClientRect();
            const inView = r.bottom > 0 && r.top < vh * 0.88;
            const leaving = r.top < 0 && r.bottom < vh * 0.5;
            if (u.running) {
                if ((!inView || leaving) && u.cursor) u.cursor.abort = true;
            } else if (r.bottom <= 0) {
                dequeue(u);
                restore(u);
            } else if (leaving) {
                // Already leaving through the top (the visitor jumped past
                // it): not worth a gesture, show it and get to what they see.
                dequeue(u);
                fadeIn(u);
            } else if (inView) {
                enqueue(u);
            } else {
                dequeue(u);
            }
        });
        wake();
        if (units.every(x => x.done) && !active) finishAll();
    }

    let shownWatch = null;
    function sweepWhenShown() {
        if (shownWatch) return;
        shownWatch = new MutationObserver(() => {
            if (document.body.classList.contains('loading')) return;
            shownWatch.disconnect();
            shownWatch = null;
            sweep();
        });
        shownWatch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    let sweepTimer = null;
    let lastScrollY = 0, lastScrollAt = 0, flyingUntil = 0;
    function onScroll() {
        // Fast scrolling (a flick, a nav link's smooth scroll): nobody starts
        // a new drawing mid-flight; wait for the page to land.
        readScroll();
        const t = now(), y = SY;
        if (lastScrollAt && Math.abs(y - lastScrollY) / Math.max(1, t - lastScrollAt) > 1.2) flyingUntil = t + 160;
        lastScrollY = y; lastScrollAt = t;
        if (sweepTimer) clearTimeout(sweepTimer);
        sweepTimer = setTimeout(() => { sweepTimer = null; sweep(); }, 110);
    }

    function schedule(t) {
        if (!queue.length) {
            if (boss.hired && !boss.busy && t - boss.idleSince > RELEASE_AFTER) releaseBoss();
            return;
        }
        queue.sort((a, b) => a.order - b.order);
        // The visitor is faster than us: never make them wait for content.
        while (queue.length > QUEUE_MAX) { const u = queue.pop(); u.queued = false; fadeIn(u); }
        for (let i = queue.length - 1; i >= 0; i--) {
            if (t - queue[i].queuedAt > (queue[i].show ? WAIT_MAX * 2 : WAIT_MAX)) {
                const u = queue.splice(i, 1)[0];
                u.queued = false;
                fadeIn(u);
            }
        }
        if (t < nextStartAt || t < flyingUntil || !queue.length) {
            if (t < flyingUntil) wake();
            return;
        }
        let u = queue[0];
        let kind = null;
        if (!boss.busy && hireBoss()) {
            kind = 'boss';
        } else if (helpers < MAX_HELPERS) {
            // Helpers take what's been waiting a while — never a showpiece
            // (timeline, the closing tagline): those are Blip's.
            // A real backlog (a jump into the page): help comes sooner.
            const patience = queue.length >= 3 ? HELP_AFTER * 0.3 : HELP_AFTER;
            u = queue.find(q => t - q.queuedAt > patience && !q.show);
            if (u) kind = 'helper';
        }
        if (!kind) return;
        // Blip works smart: neighbours waiting right below get swept in the
        // same gesture (a title + its subtitle, two stacked cards).
        const batch = kind === 'boss' ? takeBatch() : [queue.splice(queue.indexOf(u), 1)[0]];
        // While it's drawn, a group gets its own layer: its reveal (a clip
        // mask that changes every frame) then never repaints the page.
        batch.forEach(b => { b.queued = false; b.running = true; b.el.style.willChange = 'transform'; });
        active++;
        if (kind === 'boss') boss.busy = true; else helpers++;
        stats[kind] += batch.length;
        log(Math.round(t), kind, batch.map(b => b.el.tagName + '.' + String(b.el.className).split(' ')[0]).join('+'), 'queue', queue.length);
        nextStartAt = t + START_GAP;
        draw(u, kind, batch).catch(() => {}).then(() => {
            batch.forEach(b => { restore(b); b.running = false; });
            active--;
            if (kind === 'boss') { boss.busy = false; boss.idleSince = now(); } else helpers--;
            log(Math.round(now()), 'done', kind, u.el.className);
            wake();
            if (units.every(x => x.done) && !active) finishAll();
        });
    }

    function takeBatch() {
        const first = queue.shift();
        const out = [first];
        if (first.show) return out;
        const f = first.el.getBoundingClientRect();
        const sec = first.el.closest('section, article');
        while (queue.length && out.length < 3) {
            const n = queue[0];
            if (n.show || n.el.closest('section, article') !== sec) break;
            const r = n.el.getBoundingClientRect();
            if (r.top - f.top > window.innerHeight * 0.45 || r.bottom - f.top > window.innerHeight * 0.8) break;
            out.push(queue.shift());
        }
        return out;
    }

    /* ---------- Blip, the main worker ---------- */

    function hireBoss() {
        const B = window.BlipCursor;
        if (!B || !B.isRunning || !B.hire) return false;
        if (boss.hired && B.isWorking) return true;
        if (boss.hired) dropBoss(); // grabbed meanwhile: rehire below if possible
        if (!B.hire()) return false;
        const tip = B.tip;
        const c = {
            x: tip.x + SX - originX, y: tip.y + SY - originY,
            vx: 0, vy: 0, press: 0, pressed: false, opacity: 1, scale: 1, boss: true, abort: false
        };
        c.step = () => {
            if (!B.isWorking) { c.abort = true; return; } // grabbed / thrown: job ends now
            if (!boss.busy) {
                // Between two jobs he stays put on screen while the page
                // scrolls: track where that is in page coordinates.
                syncBoss(c);
                return;
            }
            B.workAt(c.x - SX + originX, c.y - SY + originY, c.vx, c.vy);
            if (c.press > 0.6 && !c.pressed) { c.pressed = true; B.react('click'); }
            else if (c.press < 0.2) c.pressed = false;
        };
        frameCbs.add(c.step);
        boss.c = c;
        boss.hired = true;
        boss.idleSince = now();
        wake();
        return true;
    }

    function syncBoss(c) {
        const tip = window.BlipCursor.tip;
        c.x = tip.x + SX - originX;
        c.y = tip.y + SY - originY;
        c.vx = c.vy = 0;
    }

    function dropBoss() {
        if (boss.c) frameCbs.delete(boss.c.step);
        boss.c = null;
        boss.hired = false;
    }

    function releaseBoss() {
        dropBoss();
        if (window.BlipCursor && window.BlipCursor.isWorking) window.BlipCursor.fire();
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

    // The data trail he leaves while drawing (data-trail.js); a no-op if the
    // module isn't on the page.
    const NO_TRAIL = { write() {}, caughtUp() {}, edge() {}, ring() {}, settle() { return Promise.resolve(); } };
    function trailFor(box) {
        return window.DataTrail ? window.DataTrail.create(layer, box, { accent: ACCENT[theme] }) : NO_TRAIL;
    }

    function mark(cls) {
        const m = document.createElement('div');
        m.className = 'bs-mark ' + cls;
        layer.appendChild(m);
        return m;
    }

    // The tools' marks (data-trail.js); bare boxes if it isn't on the page.
    const NO_MARK = { set() {} };
    function selection(box, measure) {
        return window.DataTrail ? window.DataTrail.selection(layer, box, measure) : { ...NO_MARK, el: mark('') };
    }
    function outline(box) {
        return window.DataTrail ? window.DataTrail.outline(layer, box) : { ...NO_MARK, el: mark('') };
    }

    function fadeMark(m, ms) {
        animate(ms, p => { m.style.opacity = 1 - p; }).then(() => m.remove());
    }

    /* ---------- One draw: out of Blip, gesture, back into Blip ---------- */

    // Where a cursor comes from / goes back to: Blip if he's up and on
    // screen, else the near side edge at the group's height.
    function home(box) {
        const B = window.BlipCursor;
        const p = B && B.isRunning ? (B.isWorking ? B.tip : B.getPosition && B.getPosition()) : null;
        const vw = document.documentElement.clientWidth, vh = window.innerHeight;
        if (p && p.x > 0 && p.y > 0 && p.x < vw && p.y < vh) {
            return { x: p.x + BLIP_C.x + SX - originX, y: p.y + BLIP_C.y + SY - originY, blip: true };
        }
        const cx = (box.l + box.r) / 2 - SX + originX;
        const left = cx < vw / 2;
        return { x: (left ? 14 : vw - 44) + SX - originX, y: clamp((box.t + box.b) / 2, box.t, box.t + vh * 0.6), blip: false };
    }

    function blipReact(kind) {
        const t = now();
        if (t - lastReactAt < 450 || !window.BlipCursor) return;
        lastReactAt = t;
        window.BlipCursor.react(kind);
    }

    async function draw(u, kind, batch) {
        const r = u.el.getBoundingClientRect();
        // The group's box in layer (document) coordinates.
        const sx = SX - originX, sy = SY - originY;
        const box = { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy, w: r.width, h: r.height };
        u.box = box;
        const tool = isTimeline(u.el) ? 'timeline' : isTagline(u.el) ? 'tagline' : toolFor(u.el, r);

        if (kind === 'boss') {
            const c = boss.c;
            c.abort = false;
            syncBoss(c);
            batch.forEach(b => { b.cursor = c; });
            try {
                if (batch.length > 1) await gBatch(c, batch);
                else await gesture(tool, c, u);
            } finally {
                batch.forEach(restore);
            }
            c.abort = false;
            return;
        }

        const from = home(box);
        const c = makeCursor(pickSprite(tool === 'timeline' ? 'paint' : tool === 'tagline' ? 'type' : tool), from.x, from.y);
        u.cursor = c;
        const full = c.inner.querySelector('.bs-bc') ? 0.75 : 1;
        if (from.blip) blipReact('click'); // the spit
        animate(200, p => { c.scale = lerp(0.3, full, p); c.opacity = p; }, outExpo);
        try {
            await gesture(tool, c, u);
        } finally {
            restore(u);
        }
        await sendHome(c, box, full);
    }

    function gesture(tool, c, u) {
        if (tool === 'timeline') return gTimeline(c, u);
        if (tool === 'tagline') return gTagline(c, u);
        if (tool === 'type') return gType(c, u);
        if (tool === 'click') return gClick(c, u);
        if (tool === 'paint') return gPaint(c, u);
        if (tool === 'move') return gMove(c, u);
        return gRect(c, u, tool === 'measure');
    }

    // A helper's way back: into Blip (shrinks into him), or out by the edge.
    // If its group scrolled away mid-draw, it just fades out where it is.
    async function sendHome(c, box, full) {
        if (c.abort) {
            c.abort = false;
            await animate(160, p => { c.opacity = 1 - p; });
            dropCursor(c);
            return;
        }
        const back = home(box);
        await travel(c, back.x, back.y, -1);
        await animate(140, p => { c.scale = lerp(full, 0.2, p); c.opacity = 1 - p; });
        dropCursor(c);
    }

    // One marquee over several neighbours: each is revealed as the
    // selection reaches it.
    async function gBatch(c, list) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const sx = SX - originX, sy = SY - originY;
        list.forEach(u => {
            const r = u.el.getBoundingClientRect();
            u.box = { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy, w: r.width, h: r.height };
        });
        const L = Math.min(...list.map(u => u.box.l)), T = Math.min(...list.map(u => u.box.t));
        const R = Math.max(...list.map(u => u.box.r)), B = Math.max(...list.map(u => u.box.b));
        const W = R - L, H = B - T;
        await travel(c, L, T);
        await A(90, p => { c.press = p; }, outExpo);
        const sel = selection({ l: L, t: T, w: W, h: H }, false);
        let last = now();
        const tr = trailFor({ l: L, t: T, w: W, h: H });
        await A(clamp(420 + Math.sqrt(W * H) * 0.45, 520, 900), e => {
            const t = now();
            const x = L + W * e, y = T + H * e;
            place(c, x, y, (t - last) / 1000); last = t;
            tr.edge(x, y);
            sel.set(e, e);
            list.forEach(u => {
                const b = u.box;
                const ri = clamp(b.r - x, 0, b.w), bi = clamp(b.b - y, 0, b.h);
                setClip(u, 'inset(0 ' + ri.toFixed(1) + 'px ' + bi.toFixed(1) + 'px 0)');
            });
        }, inOutQuart);
        c.vx = c.vy = 0;
        list.forEach(restore);
        tr.settle();
        A(120, p => { c.press = 1 - p; }, outExpo);
        fadeMark(sel.el, 180);
    }

    async function gRect(c, u, measure) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        await travel(c, b.l, b.t);
        await A(90, p => { c.press = p; }, outExpo);
        const sel = selection(b, measure);
        let last = now();
        const dur = clamp(340 + Math.sqrt(b.w * b.h) * 0.4, 420, 650);
        const tr = trailFor(b);
        await A(dur, e => {
            const t = now();
            const x = b.l + b.w * e, y = b.t + b.h * e;
            place(c, x, y, (t - last) / 1000); last = t;
            tr.edge(x, y);
            sel.set(e, e);
            setClip(u, 'inset(0 ' + (b.w * (1 - e)).toFixed(1) + 'px ' + (b.h * (1 - e)).toFixed(1) + 'px 0)');
        }, inOutQuart);
        c.vx = c.vy = 0;
        restore(u);
        A(120, p => { c.press = 1 - p; }, outExpo);
        tr.settle();
        if (measure) await wait(140, c);
        fadeMark(sel.el, 160);
    }

    async function gType(c, u) {
        const words = wordBoxes(u.el);
        if (words.length) {
            // Quick on a title, never more than ~1.3 s on a long paragraph.
            return typeWords(c, u, words, { perWord: 95, maxTotal: 1300 });
        }
        return gSweep(c, u);
    }

    // Fallback typing (no text nodes found): a stepped sweep per line.
    async function gSweep(c, u) {
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
        const per = clamp(620 / lines, 110, 260);
        const steps = clamp(Math.round(b.w / (fs * 0.55)), 6, 24);
        // The text appears a few characters behind him: in between, his data
        // trail, which dissolves into the letters as the text catches up.
        const LAG = clamp(fs * 2.6, 22, 64);
        const tr = trailFor(b);
        const clipLine = (y0, y1, X) => setClip(u, 'polygon(0px 0px,' + b.w + 'px 0px,' + b.w + 'px ' + y0 + 'px,' +
            X + 'px ' + y0 + 'px,' + X + 'px ' + y1 + 'px,0px ' + y1 + 'px)');
        let last = now();
        for (let i = 0; i < lines; i++) {
            const y0 = i * lineH, y1 = y0 + lineH;
            await A(per, (e, p) => {
                const s = Math.floor(p * steps) / steps;
                const X = b.w * s;
                const t = now();
                place(c, b.l + X, b.t + y0 + lineH / 2, (t - last) / 1000); last = t;
                tr.write(b.l + X, b.t + y0, b.t + y1);
                const tx = Math.max(0, X - LAG);
                tr.caughtUp(b.l + tx, b.t + y0);
                clipLine(y0, y1, tx);
            });
            // End of line: the text catches up with the trail.
            await A(110, e => {
                const tx = lerp(Math.max(0, b.w - LAG), b.w, e);
                tr.caughtUp(b.l + tx, b.t + y0);
                clipLine(y0, y1, tx);
            });
        }
        c.vx = c.vy = 0;
        tr.settle();
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
        const tr = trailFor(b);
        await A(420, (e, p) => {
            setClip(u, 'circle(' + (far * e).toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)');
            if (p < 0.85) tr.ring(px, py, far * e);
            ring.style.setProperty('--r', (6 + 30 * e) + 'px');
            ring.style.opacity = 1 - p;
        }, outExpo);
        ring.remove();
        tr.settle();
    }

    async function gPaint(c, u) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        await travel(c, b.l, b.t);
        const line = outline(b);
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
            line.set(e);
        }, inOutQuart);
        c.vx = c.vy = 0;
        await A(90, p => { c.press = p; }, outExpo);
        A(120, p => { c.press = 1 - p; }, outExpo);
        const tr = trailFor(b);
        await A(340, e => {
            setClip(u, 'inset(0 0 ' + (b.h * (1 - e)).toFixed(1) + 'px 0)');
            tr.edge(b.r, b.t + b.h * e);
        }, outExpo);
        tr.settle();
        fadeMark(line.el, 220);
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

    /* ---------- The closing tagline: typed word by word ---------- */

    function isTagline(el) { return !!(el.matches && el.matches('.sf-headline')); }
    // Reserved for Blip himself (never a helper, never batched).
    function isShowpiece(el) { return isTimeline(el) || isTagline(el) || !!(el.matches && el.matches('.sf-pill')); }

    function wordBoxes(el) {
        return window.DataTrail ? window.DataTrail.words(el) : [];
    }

    // Typing, word by word, the way he writes: each word is first laid down
    // as data (the trail), then resolves into its letters a beat after he
    // has moved on. Only over real words — never across empty space.
    // opts: perWord ms, slowAfterFirstPart (tagline: 2nd line slower, with
    // a breath before it), maxTotal ms (long paragraphs speed up), joy.
    async function typeWords(c, u, words, opts) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const b = u.box;
        const W = b.w;
        const clipTo = (i) => {
            const w = words[i];
            const y0 = Math.max(0, w.top - 2), y1 = w.bottom + 4;
            setClip(u, 'polygon(0px 0px,' + W + 'px 0px,' + W + 'px ' + y0 + 'px,' + (w.right + 2) + 'px ' + y0 + 'px,' +
                (w.right + 2) + 'px ' + y1 + 'px,0px ' + y1 + 'px)');
        };
        const first = words[0];
        await travel(c, b.l + Math.max(0, first.left - 2), b.t + (first.top + first.bottom) / 2);
        await A(140, p => { c.opacity = p < 0.5 ? 0.25 : 1; });
        const slots = [];
        let T = 0;
        const per = opts.maxTotal ? Math.min(opts.perWord, opts.maxTotal / words.length) : opts.perWord;
        words.forEach((w, i) => {
            const newPart = i && w.part !== words[i - 1].part;
            if (newPart && opts.slowAfterFirstPart) T += 320;
            const d = opts.slowAfterFirstPart && w.part > words[0].part ? per * 1.45 : per;
            slots.push({ start: T, end: T + d });
            T += d;
        });
        const sx = c.x, sy = c.y;
        let last = now(), shown = -1;
        const RESOLVE = 160;
        const tr = trailFor(b);
        await A(T + RESOLVE, (e, p) => {
            const ms = p * (T + RESOLVE);
            let i = 0;
            while (i < slots.length - 1 && ms >= slots[i].end) i++;
            const k = clamp((ms - slots[i].start) / (slots[i].end - slots[i].start), 0, 1);
            const w = words[i];
            const prev = i ? words[i - 1] : null;
            // A new line starts at its first word's left edge.
            const sameLine = prev && Math.abs(prev.top - w.top) < 4;
            const fx = sameLine ? b.l + prev.right + 3 : (prev ? b.l + w.left - 2 : sx);
            const fy = sameLine || prev ? b.t + (w.top + w.bottom) / 2 : sy;
            const q = outExpo(k);
            const t = now();
            place(c, lerp(fx, b.l + w.right + 3, q), lerp(fy, b.t + (w.top + w.bottom) / 2, q), (t - last) / 1000);
            last = t;
            tr.write(c.x, b.t + w.top, b.t + w.bottom);
            let done = -1;
            while (done + 1 < slots.length && ms >= slots[done + 1].end + RESOLVE) done++;
            if (done > shown) {
                shown = done;
                clipTo(done);
                const d = words[done];
                tr.caughtUp(b.l + d.right + 3, b.t + d.top);
            }
        });
        clipTo(words.length - 1);
        tr.settle();
        c.vx = c.vy = 0;
        restore(u);
        if (opts.joy && c.boss) blipReact('joy');
    }

    // "Rethink work, don't just speed it up." then — a breath — "And
    // rethink what AI can bring to each of us.", the second line slower:
    // it's the point. Then a little hop of joy.
    async function gTagline(c, u) {
        const words = wordBoxes(u.el);
        if (!words.length) return gRect(c, u, false);
        await typeWords(c, u, words, { perWord: 105, slowAfterFirstPart: true, joy: true });
        await animate(200, () => {}, linear, c);
    }

    /* ---------- The git timeline: Blip rides the trunk ---------- */

    function isTimeline(el) {
        const svg = el.querySelector && el.querySelector('.git-timeline-svg');
        return !!(svg && svg.getBoundingClientRect().width > 0 && svg.querySelector('.git-trunk'));
    }

    // Every stroke is inked as Blip passes it: the trunk under his tip, each
    // branch from where it leaves the trunk to where it merges back, the
    // nodes and commit cards popping as he reaches them, the years ticking
    // in. A pencil helper rides the newest branch above him.
    async function gTimeline(c, u) {
        const A = (ms, fn, ease) => animate(ms, fn, ease, c);
        const root = u.el;
        const svg = root.querySelector('.git-timeline-svg');
        const sr = svg.getBoundingClientRect();
        const ox = sr.left + SX - originX, oy = sr.top + SY - originY;
        const trunk = svg.querySelector('.git-trunk');
        const x1 = +trunk.getAttribute('x1'), x2 = +trunk.getAttribute('x2'), ty = +trunk.getAttribute('y1');
        const tLen = Math.max(1, x2 - x1);

        const dash = (el, len) => { el.style.strokeDasharray = len + ' ' + len; el.style.strokeDashoffset = len; };
        const branches = [...svg.querySelectorAll('.git-branch')].map(p => {
            const len = p.getTotalLength();
            const bb = p.getBBox();
            dash(p, len);
            return { p, len, a: bb.x, b: bb.x + Math.max(1, bb.width), top: bb.y, done: false };
        });
        dash(trunk, tLen);
        const pops = [];
        const pop = (el, x, kind) => { el.style.opacity = '0'; pops.push({ el, x, kind, done: false }); };
        svg.querySelectorAll('.git-node').forEach(n => {
            n.style.transformBox = 'fill-box';
            n.style.transformOrigin = 'center';
            pop(n, +n.getAttribute('cx'), 'node');
        });
        root.querySelectorAll('.git-commit-marker').forEach(m => pop(m, m.getBoundingClientRect().left - sr.left, 'card'));
        root.querySelectorAll('.git-year-marker, .git-now-marker').forEach(m => pop(m, m.getBoundingClientRect().left - sr.left + 4, 'year'));
        // Parts hidden: the group itself can be shown now.
        setClip(u, 'none');

        const popIn = (it) => {
            it.done = true;
            it.el.style.opacity = '';
            if (!it.el.animate) return;
            if (it.kind === 'node') {
                it.el.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.6)', offset: 0.6 }, { transform: 'scale(1)' }],
                    { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' });
            } else if (it.kind === 'card') {
                it.el.animate([{ opacity: 0, scale: '0.6', translate: '0 8px' }, { opacity: 1, scale: '1.08', translate: '0 -2px', offset: 0.6 },
                    { opacity: 1, scale: '1', translate: '0 0' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
            } else {
                it.el.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'ease-out' });
            }
        };

        // Where the visible part of the trunk starts / ends (it may be wider
        // than the screen inside its horizontal scroller).
        const vw = document.documentElement.clientWidth;
        const minX = Math.max(x1, -sr.left + 8), maxX = Math.min(x2, vw - sr.left - 40);

        let pencil = null;
        if (!TOUCH && branches.length) {
            const from = home({ l: ox + x1, t: oy, r: ox + x2, b: oy + ty });
            pencil = makeCursor({ sprite: window.CursorSprites.get('pencil') || window.CursorSprites.list[0] }, from.x, from.y);
            animate(200, p => { pencil.scale = lerp(0.3, 1, p); pencil.opacity = p; }, outExpo);
            if (from.blip && !c.boss) blipReact('click');
        }

        // Both head for the start of the history together.
        await Promise.all([
            travel(c, ox + minX, oy + ty),
            pencil ? travel(pencil, ox + minX + 30, oy + ty - 40) : null
        ]);
        await A(90, p => { c.press = p; }, outExpo);
        A(120, p => { c.press = 1 - p; }, outExpo);
        let last = now();
        const dur = clamp(tLen * 1.9, 1800, 3000);
        try {
            await A(dur, e => {
                const X = x1 + tLen * e;
                const t = now();
                place(c, ox + clamp(X, minX, maxX), oy + ty, (t - last) / 1000);
                last = t;
                trunk.style.strokeDashoffset = (tLen * (1 - e)).toFixed(1);
                let lead = null;
                branches.forEach(b => {
                    const k = clamp((X - b.a) / (b.b - b.a), 0, 1);
                    b.p.style.strokeDashoffset = (b.len * (1 - k)).toFixed(1);
                    if (k > 0 && k < 1 && (!lead || b.top < lead.top)) { lead = b; lead.k = k; }
                });
                if (pencil && lead) {
                    // Glides to the newest branch's tip (no teleport when the
                    // lead passes from one branch to the next).
                    const pt = lead.p.getPointAtLength(lead.len * lead.k);
                    place(pencil, lerp(pencil.x, ox + pt.x, 0.3), lerp(pencil.y, oy + pt.y, 0.3), 1 / 60);
                }
                pops.forEach(it => { if (!it.done && X >= it.x) popIn(it); });
            }, bez(0.45, 0, 0.55, 1));
        } finally {
            // Whatever happened (aborted, scrolled away): everything inked.
            trunk.style.strokeDasharray = trunk.style.strokeDashoffset = '';
            branches.forEach(b => { b.p.style.strokeDasharray = b.p.style.strokeDashoffset = ''; });
            pops.forEach(it => { if (!it.done) { it.done = true; it.el.style.opacity = ''; } });
            if (pencil) sendHome(pencil, u.box, 1);
        }
        c.vx = c.vy = 0;
    }

    /* ---------- Lifecycle ---------- */

    // Everything drawn: stop watching (a later scan() starts again).
    function finishAll() {
        if (io) io.disconnect();
        io = null;
        window.removeEventListener('scroll', onScroll);
        if (boss.hired && !boss.busy) releaseBoss();
    }

    function currentTheme() {
        const t = document.body.dataset.theme;
        return THEMES.indexOf(t) !== -1 ? t : 'default';
    }

    const enabled = !REDUCED && !!window.CursorSprites && 'IntersectionObserver' in window;

    function ensureLayer() {
        if (layer) return;
        layer = document.createElement('div');
        layer.id = 'blip-draw';
        layer.className = 'bs-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.setProperty('--bs-accent', ACCENT[theme]);
        layer.style.setProperty('--cs-ink', INK[theme]);
        layer.style.setProperty('--cs-accent', DETAIL[theme]);
        layer.style.color = FILL[theme];
        document.body.appendChild(layer);
        readScroll();
        const o = layer.getBoundingClientRect();
        originX = o.left + SX;
        originY = o.top + SY;
    }

    function ensureObservers() {
        if (io) return;
        io = new IntersectionObserver(sweep, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    function addUnits(found) {
        if (!found.length) return;
        ensureLayer();
        ensureObservers();
        // Groups whose element left the page (blog view switch) are dropped.
        units = units.filter(u => !u.done && u.el.isConnected);
        const base = units.length ? Math.max(...units.map(u => u.order)) + 1 : 0;
        found.forEach((el, i) => {
            const u = { el, order: base + i, done: false, queued: false, running: false };
            el.__bd = u;
            releaseGsap(el);
            hide(u);
            units.push(u);
            io.observe(el);
        });
    }

    // Called by the intro once Blip is back in one piece, or on its own when
    // there's no intro.
    function start() {
        if (started || !enabled) return;
        started = true;
        theme = currentTheme();
        addUnits(findUnits());
        sweep();
    }

    // New content on the page (the blog renders its list / an article after
    // load, and on every in-page navigation): pick up its groups. Returns
    // true when Blip handles the reveal (callers then skip their own).
    function scan() {
        if (!enabled) return false;
        if (!started) { start(); return true; }
        addUnits(findUnits());
        sweep();
        return true;
    }

    function init() {
        if (!enabled) return;
        // The intro calls start() when it's done; without one, Blip draws
        // what's on screen too, from the moment the loader lifts.
        if (window.BlipSwarm && window.BlipSwarm.willRun) return;
        includeVisible = true;
        if (document.body.classList.contains('loading')) {
            const mo = new MutationObserver(() => {
                if (document.body.classList.contains('loading')) return;
                mo.disconnect();
                start();
            });
            mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } else {
            start();
        }
    }

    return { init, start, scan, stats, get enabled() { return enabled; }, get running() { return active > 0; } };
})();

window.BlipDraw = BlipDraw;
