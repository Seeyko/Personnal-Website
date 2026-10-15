/**
 * Blip — the site's pixel-art mascot, living on the page.
 *
 * Blip used to BE the mouse pointer, trailing it on a spring. Visitors aimed
 * with the lagging sprite and clicked next to things, so the real pointer is
 * back and Blip is now a little creature of his own:
 * - he strolls from perch to perch (heading ends, card corners, the margins),
 *   rides along with the element he sits on while the page scrolls, and naps
 *   once he has run out of steam;
 * - he is shy: a pointer swooping at him makes him sidestep, blushing. After a
 *   few dodges he gives up and lets you catch him;
 * - he can be grabbed, dragged and thrown (critically damped drag spring,
 *   coasting throw that bounces off the viewport edges).
 *
 * He is drawn with the vendor "cursor-kit" (see /frontend/css/blip-cursor.css):
 * that stylesheet owns every animation/keyframe (bc-* classes); this module
 * only creates the DOM, runs the physics and toggles state classes.
 * Hotspot contract (kit SPEC): the SVG viewBox is 0 0 24 28 and the tip sits at
 * grid unit (6,3); the CSS shifts the SVG so the root's origin IS the tip, and
 * every position below (x, y) is that tip in viewport pixels.
 *
 * Boot: when the intro (blip-swarm.js) runs, it ends by fusing the swarm back
 * into one Blip and hands over with appear(x, y). Without the intro he simply
 * wakes up in a margin once the page has loaded.
 * prefers-reduced-motion: no Blip at all.
 */
const BlipCursor = (() => {
    const THEMES = ['terminal', 'default', 'blueprint', 'retro90s', 'fps'];
    const DEFAULT_THEME = 'default';

    // Sprite geometry relative to the hotspot, in px (kit --bc-px = 1.75).
    const PX = 1.75;
    const BODY = { l: -6 * PX, t: -3 * PX, w: 24 * PX, h: 28 * PX };
    const CENTER = { x: BODY.l + 12 * PX, y: BODY.t + 14 * PX };
    const FEET = BODY.t + 26 * PX;      // where his feet touch a perch
    const EDGE = 8;                     // keep the whole sprite this far inside the viewport

    const GAG_CLASSES = ['bc-gag-1', 'bc-gag-2', 'bc-gag-3'];
    const ONE_SHOT_DURATIONS = {
        'bc-click': 400,
        'bc-blink': 240,
        'bc-gag-1': 1100,
        'bc-gag-2': 1500,
        'bc-gag-3': 1400,
        'bc-wake': 420,
        'bc-twirl': 900 // site-integration one-shot (duo dance with Cathode)
    };

    // Reactions other modules may ask for (CathodeGuide's meet scenes).
    // Whitelist keeps play() internal: no arbitrary class injection.
    const REACTIONS = {
        click: 'bc-click',
        blink: 'bc-blink',
        joy: 'bc-gag-1',      // bounce + blush + mouth-o
        listen: 'bc-gag-2',   // slow eye-roll, attentive
        wave: 'bc-gag-3',     // paw up/down - the "check"
        wake: 'bc-wake',
        twirl: 'bc-twirl'     // full spin (keyframes live below the kit marker)
    };

    // One-shot class → semantic SFX event; the active theme's sound pack
    // (if any) decides what each reaction actually sounds like.
    const SFX_EVENTS = {
        'bc-click': 'blip:click',
        'bc-blink': 'blip:blink',
        'bc-gag-1': 'blip:joy',
        'bc-gag-2': 'blip:listen',
        'bc-gag-3': 'blip:wave',
        'bc-wake': 'blip:wake',
        'bc-twirl': 'blip:twirl'
    };

    // ─── Physics (px, s) ───
    const MAX_DT = 1 / 30;
    const FOLLOW_K = 320;              // body → "carrot" spring while walking / resting
    const FOLLOW_C = 2 * Math.sqrt(FOLLOW_K); // critically damped: arrives, never wobbles
    const GRAB_K = 900;                // body → pointer while held
    const GRAB_C = 2 * Math.sqrt(GRAB_K) * 0.72; // a touch under-damped: jelly, not lag
    const GRAVITY = 2200;              // thrown: he arcs and falls…
    const AIR_DRAG = 0.6;              // …with a little horizontal air drag
    const GROUND_DRAG = 9;             // sliding to a stop once on a surface
    const THROW_MAX = 2400;            // release speed cap
    const THROW_MIN = 150;             // slower than this on release = simply put down
    const WALL_BOUNCE = 0.55;
    const FLOOR_BOUNCE = 0.35;
    const REST_VY = 90;                // vertical speed under which a bounce becomes a landing

    // ─── Shyness (fine pointers only) ───
    const SHY_RADIUS = 105;            // personal space, measured to his body centre
    const SHY_APPROACH = 90;           // px/s toward him that counts as "coming at me"
    const SHY_FLYBY = 1200;            // faster than this the pointer is just passing by
    const DODGE_COOLDOWN = 450;        // ms between two sidesteps
    const MAX_DODGES = 3;              // after that he gives up and can be caught
    const SHY_RESET_MS = 2600;         // pointer away this long → dodges counter resets

    // ─── Life ───
    const REST_MIN = 2600, REST_MAX = 6500;     // pause between two strolls
    const ENERGY_MIN = 4, ENERGY_MAX = 7;       // strolls before a nap
    const NAP_MIN = 16000, NAP_MAX = 30000;
    const SPEED_FACTOR = 0.036;                  // stroll duration = 0.4 + sqrt(dist)*factor

    // Body language driven by velocity (on the .bc-motion wrapper, never on
    // the kit's groups nor the hotspot).
    const TILT_PER_V = 0.016;      // deg per px/s of horizontal speed
    const TILT_MAX = 14;
    const STRETCH_PER_V = 1 / 5200;
    const STRETCH_MAX = 0.18;
    const BODY_MIN_SPEED = 6;

    // Where he likes to sit: the top edge of headings, cards and images —
    // never paragraphs or controls.
    const PERCH_SELECTOR = 'h1, h2, h3, .section-title, img, ' +
        '[class*="card"]:not([class*="card-"]), .hero-stats';
    // He never stays parked over something people click.
    const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [tabindex]:not([tabindex="-1"])';

    let root = null;
    let motionEl = null;
    let hitEl = null;
    let isActive = false;      // module alive (init/destroy)
    let isRunning = false;     // Blip on the page
    let waitingForIntro = false;

    // State
    let mode = 'rest';         // 'rest' | 'move' | 'grab' | 'thrown'
    let x = -200, y = -200, vx = 0, vy = 0;
    let carrotX = 0, carrotY = 0;
    let anchor = null;         // { el, ox } perch on an element, or null = free spot
    let homeX = 0, homeY = 0;  // free spot (viewport coords)
    let tween = null;          // current stroll
    let nextThinkAt = 0;
    let holdUntil = 0;         // summon(): stay put until then
    let energy = ENERGY_MAX;
    let dozing = false;
    let wakeAt = 0;
    let busyUntil = 0;
    let lastGag = null;

    // Pointer
    let finePointer = false;
    let ptrX = -1e4, ptrY = -1e4, ptrVX = 0, ptrVY = 0, ptrT = 0, ptrInside = false;
    let shy = false, shyOffAt = 0, dodges = 0, lastDodgeAt = 0, ptrFarSince = 0;
    let gaveUp = false;

    // Grab
    let grabPointerId = null, grabOffX = 0, grabOffY = 0, grabStartT = 0, grabTravel = 0;
    let dragVX = 0, dragVY = 0, lastDragX = 0, lastDragY = 0, lastDragT = 0;
    let throwPeak = 0;
    let surfaces = [];         // perch tops he can land on while falling
    let ground = null;         // null | 'floor' | element he slid onto
    let nextGuardAt = 0;

    let lastTickAt = 0;
    let rafId = null;
    let wakeTimer = null;
    let lastTransform = '';
    // Docked = perched and at rest: he's switched to position:absolute so he
    // scrolls WITH the page on the compositor (pixel-locked to his perch, no
    // JS at all while scrolling). (dockX, dockY) = his viewport position when
    // docked, at scroll (dockSX, dockSY).
    let docked = false, dockX = 0, dockY = 0, dockSX = 0, dockSY = 0;
    let scrollEndTimer = null;
    let seenScrollY = 0;           // scroll position he last looked around at
    let blinkTimer = null;
    let gagTimer = null;
    const oneShotTimers = new Set();

    let mqReduced = null;
    let mqFine = null;
    let themeObserver = null;
    const handlers = {};

    const now = () => performance.now();
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

    function prefersReduced() {
        return !!(mqReduced && mqReduced.matches);
    }

    function currentTheme() {
        const t = document.body && document.body.dataset ? document.body.dataset.theme : null;
        return THEMES.indexOf(t) !== -1 ? t : DEFAULT_THEME;
    }

    function syncTheme() {
        if (!root) return;
        THEMES.forEach(t => root.classList.remove('bc-theme-' + t));
        root.classList.add('bc-theme-' + currentTheme());
    }

    // Viewport size, cached: reading clientWidth inside the frame loop can
    // force a synchronous layout. Refreshed on resize.
    let VW = 0, VH = 0;
    function measureViewport() {
        VW = document.documentElement.clientWidth || window.innerWidth;
        VH = window.innerHeight;
    }
    function vw() { return VW; }
    function vh() { return VH; }

    // Clamp a hotspot position so the whole sprite stays on screen.
    function clampX(px) { return clamp(px, EDGE - BODY.l, vw() - EDGE - (BODY.l + BODY.w)); }
    function clampY(py) { return clamp(py, EDGE - BODY.t, vh() - EDGE - (BODY.t + BODY.h)); }

    /* ---------- DOM ---------- */

    function createDom() {
        if (root) return;
        root = document.createElement('div');
        root.id = 'blip-cursor';
        root.setAttribute('aria-hidden', 'true');
        root.className = 'bc bc-pet bc-theme-' + currentTheme();
        root.innerHTML = '<div class="bc-motion">' + SVG_MARKUP + '</div><div class="bc-hit"></div>';
        motionEl = root.firstChild;
        hitEl = root.lastChild;
        document.body.appendChild(root);
        applyTransform();
    }

    function removeDom() {
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = motionEl = hitEl = null;
    }

    function applyTransform() {
        if (!root) return;
        // Whole pixels at rest keep the pixel art crisp; sub-pixel while moving
        // keeps the motion smooth.
        const still = Math.abs(vx) + Math.abs(vy) < 4;
        const tx = still ? Math.round(x) : x;
        const ty = still ? Math.round(y) : y;
        const v = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
        if (v !== lastTransform) { root.style.transform = v; lastTransform = v; }
    }

    // He leans into his motion and stretches along it (volume kept), then
    // snaps back to a clean pose once he settles.
    function applyBodyLanguage() {
        if (!motionEl) return;
        const speed = Math.hypot(vx, vy);
        if (speed < BODY_MIN_SPEED) {
            if (motionEl.style.transform) motionEl.style.transform = '';
            return;
        }
        const tilt = clamp(vx * TILT_PER_V, -TILT_MAX, TILT_MAX);
        const s = Math.min(1 + speed * STRETCH_PER_V, 1 + STRETCH_MAX);
        const ang = Math.atan2(vy, vx);
        motionEl.style.transform =
            'rotate(' + tilt.toFixed(2) + 'deg)' +
            ' rotate(' + ang.toFixed(3) + 'rad)' +
            ' scale(' + s.toFixed(3) + ',' + (1 / s).toFixed(3) + ')' +
            ' rotate(' + (-ang).toFixed(3) + 'rad)';
    }

    /* ---------- One-shots ---------- */

    function play(cls) {
        if (!root || prefersReduced() || !ONE_SHOT_DURATIONS[cls]) return;
        if (window.SFX && SFX_EVENTS[cls]) window.SFX.play(SFX_EVENTS[cls]);
        root.classList.remove(cls);
        void root.offsetWidth; // force reflow so the animation restarts cleanly
        root.classList.add(cls);
        busyUntil = Date.now() + ONE_SHOT_DURATIONS[cls];
        const timer = setTimeout(() => {
            oneShotTimers.delete(timer);
            if (root) root.classList.remove(cls);
        }, ONE_SHOT_DURATIONS[cls]);
        oneShotTimers.add(timer);
    }

    function calm() {
        return Date.now() > busyUntil && !dozing && mode === 'rest' && !shy;
    }

    function scheduleBlink() {
        blinkTimer = setTimeout(() => {
            if (!isRunning) return;
            if (calm()) play('bc-blink');
            scheduleBlink();
        }, 4000 + Math.random() * 7000);
    }

    function scheduleGag() {
        gagTimer = setTimeout(() => {
            if (!isRunning) return;
            if (calm()) {
                let cls;
                do {
                    cls = GAG_CLASSES[Math.floor(Math.random() * GAG_CLASSES.length)];
                } while (cls === lastGag && GAG_CLASSES.length > 1);
                lastGag = cls;
                play(cls);
            }
            scheduleGag();
        }, 14000 + Math.random() * 22000);
    }

    /* ---------- Naps ---------- */

    function doze() {
        if (dozing || !root) return;
        dozing = true;
        wakeAt = now() + rand(NAP_MIN, NAP_MAX);
        root.classList.add('bc-snooze');
        if (window.SFX) window.SFX.play('blip:snooze');
    }

    function wake(withAnim) {
        if (!dozing) return;
        dozing = false;
        energy = Math.round(rand(ENERGY_MIN, ENERGY_MAX));
        if (root) root.classList.remove('bc-snooze');
        if (withAnim !== false) play('bc-wake');
        nextThinkAt = now() + rand(900, 1800);
    }

    /* ---------- Where to go ---------- */

    function anchorPoint(a, rect) {
        const r = rect || a.el.getBoundingClientRect();
        return { x: r.left + Math.min(a.ox, Math.max(0, r.width - 8)), y: r.top - FEET };
    }

    function anchorUsable(a, rect) {
        if (!a || !a.el || !a.el.isConnected) return false;
        const r = rect || a.el.getBoundingClientRect();
        if (r.width < 40 || r.height < 12) return false;
        const p = anchorPoint(a, r);
        // Fully on screen (incl. the sprite) and not tucked under the fixed header.
        return p.y + BODY.t > 70 && p.y + BODY.t + BODY.h < vh() - 10 &&
            p.x + BODY.l > EDGE && p.x + BODY.l + BODY.w < vw() - EDGE;
    }

    function visible(el) {
        if (el.closest('#blip-cursor, #blip-swarm, #blip-draw, #cathode-guide, #loading-screen, [aria-hidden="true"], [data-bd-pending]')) return false;
        if (typeof el.checkVisibility === 'function' &&
            !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
        return true;
    }

    function perchCandidates() {
        const out = [];
        const els = document.querySelectorAll(PERCH_SELECTOR);
        for (let i = 0; i < els.length && out.length < 60; i++) {
            const el = els[i];
            const r = el.getBoundingClientRect();
            if (r.bottom < 80 || r.top > vh() - 60 || r.width < 60) continue;
            if (!visible(el)) continue;
            // Sit near one end, never in the middle of what people read.
            const leftEnd = Math.random() < 0.5;
            const ox = leftEnd ? rand(6, Math.min(36, r.width * 0.2)) : r.width - rand(26, Math.min(60, r.width * 0.3));
            const a = { el, ox };
            if (anchorUsable(a)) out.push(a);
        }
        return out;
    }

    // A spot is "near the pointer" when he'd land inside his personal space.
    function nearPointer(px, py) {
        return finePointer && ptrInside && Math.hypot(px + CENTER.x - ptrX, py + CENTER.y - ptrY) < SHY_RADIUS * 1.8;
    }

    function freeSpot() {
        // The margins: left or right band, middle height — away from the pointer.
        const w = vw(), h = vh();
        const band = Math.max(60, w * 0.16);
        let spot = null;
        for (let i = 0; i < 6; i++) {
            const left = Math.random() < 0.5;
            const px = left ? rand(EDGE - BODY.l, band) : rand(w - band, w);
            spot = { x: clampX(px), y: clampY(rand(h * 0.28, h * 0.86)) };
            if (!nearPointer(spot.x, spot.y)) break;
        }
        return spot;
    }

    function cathodeSpot() {
        const cg = document.getElementById('cathode-guide');
        if (!cg) return null;
        const r = cg.getBoundingClientRect();
        if (r.width < 4 || r.bottom < 0 || r.top > vh()) return null;
        const side = r.left > vw() / 2 ? -1 : 1;
        return { x: clampX(side > 0 ? r.right + 10 : r.left - 34), y: clampY(r.bottom - FEET) };
    }

    function think() {
        seenScrollY = window.scrollY;
        if (energy <= 0) { doze(); return; }
        energy--;
        const roll = Math.random();
        if (roll < 0.12) {
            const c = cathodeSpot();
            if (c) { strollTo(null, c.x, c.y); return; }
        }
        if (roll < 0.72) {
            const cands = perchCandidates().filter(a => {
                if (anchor && a.el === anchor.el) return false;
                const p = anchorPoint(a);
                return !nearPointer(p.x, p.y);
            });
            if (cands.length) {
                // Prefer nearby perches: a stroll, not a teleport across the page.
                cands.sort((a, b) => dist2(anchorPoint(a)) - dist2(anchorPoint(b)));
                const pick = cands[Math.floor(Math.pow(Math.random(), 1.8) * Math.min(cands.length, 8))];
                strollTo(pick);
                return;
            }
        }
        const f = freeSpot();
        strollTo(null, f.x, f.y);
    }

    function dist2(p) { return (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); }

    // A stroll is a slightly bent, eased path (cursors move with intent), the
    // body follows its "carrot" on a critically damped spring so any
    // interruption (dodge, grab) blends without a jump.
    function strollTo(a, tx, ty, opts) {
        undock();
        const o = opts || {};
        const dest = a ? anchorPoint(a) : { x: tx, y: ty };
        const d = Math.hypot(dest.x - x, dest.y - y);
        const dur = o.dur || clamp(0.4 + Math.sqrt(d) * SPEED_FACTOR, 0.45, 1.7);
        const bend = o.bend != null ? o.bend : (Math.random() < 0.5 ? -1 : 1) * rand(0.05, 0.14) * Math.min(d, 500);
        tween = {
            x0: carrotX, y0: carrotY, t0: now(), dur: dur * 1000, bend,
            ease: o.ease || easeInOutCubic,
            anchor: a || null, tx: dest.x, ty: dest.y
        };
        anchor = null;
        mode = 'move';
        kick();
    }

    function tweenPoint(t) {
        const tw = tween;
        let ex = tw.tx, ey = tw.ty;
        if (tw.anchor) {
            // The perch may scroll while he's on his way: aim at where it is now.
            const p = anchorPoint(tw.anchor);
            ex = p.x; ey = p.y;
        }
        const k = clamp((t - tw.t0) / tw.dur, 0, 1);
        const e = tw.ease(k);
        const dx = ex - tw.x0, dy = ey - tw.y0;
        const len = Math.hypot(dx, dy) || 1;
        const off = Math.sin(Math.PI * e) * tw.bend;
        return { x: tw.x0 + dx * e - dy / len * off, y: tw.y0 + dy * e + dx / len * off, done: k >= 1 };
    }

    function arrive() {
        const tw = tween;
        tween = null;
        mode = 'rest';
        if (tw.anchor && anchorUsable(tw.anchor)) {
            anchor = tw.anchor;
        } else {
            anchor = null;
            homeX = clampX(tw.tx);
            homeY = clampY(tw.ty);
        }
        nextThinkAt = now() + rand(REST_MIN, REST_MAX);
    }

    function settleHere() {
        undock();
        anchor = null;
        homeX = clampX(x);
        homeY = clampY(y);
        carrotX = homeX;
        carrotY = homeY;
        mode = 'rest';
        tween = null;
    }

    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    /* ---------- Shyness ---------- */

    function bodyCenter() { return { x: x + CENTER.x, y: y + CENTER.y }; }

    function setShy(on) {
        if (shy === on || !root) return;
        shy = on;
        root.classList.toggle('bc-shy', on);
    }

    function updateShy(t) {
        if (!finePointer || mode === 'grab' || mode === 'thrown') return;
        const c = bodyCenter();
        const dx = c.x - ptrX, dy = c.y - ptrY;
        const d = Math.hypot(dx, dy);
        if (!ptrInside || d > SHY_RADIUS * 1.7) {
            if (shy && t > shyOffAt) setShy(false);
            if (!ptrFarSince) ptrFarSince = t;
            if (t - ptrFarSince > SHY_RESET_MS) { dodges = 0; gaveUp = false; }
            return;
        }
        ptrFarSince = 0;
        if (d > SHY_RADIUS) return;

        setShy(true);
        shyOffAt = t + 700;
        if (dozing) { wake(); return; } // startled awake: that's his reaction this time

        const approach = d > 0.001 ? (ptrVX * dx + ptrVY * dy) / d : 0;
        if (Math.hypot(ptrVX, ptrVY) > SHY_FLYBY) return;
        if (approach < SHY_APPROACH || t - lastDodgeAt < DODGE_COOLDOWN) return;
        if (dodges >= MAX_DODGES) {
            if (!gaveUp) { gaveUp = true; play('bc-gag-1'); } // fine, you win: blushes, stays
            return;
        }
        dodge(c, dx / (d || 1), dy / (d || 1), d);
        dodges++;
        lastDodgeAt = t;
    }

    // Sidestep away from the pointer, slightly off-axis so it reads as a
    // flinch rather than a straight run. Cornered? Slide along the wall.
    function dodge(c, ux, uy, d) {
        const len = SHY_RADIUS + 50 - d * 0.4;
        let best = null;
        [rand(-0.5, 0.5), 1.25, -1.25, 2.2, -2.2].some(rot => {
            const cs = Math.cos(rot), sn = Math.sin(rot);
            const dirX = ux * cs - uy * sn, dirY = ux * sn + uy * cs;
            const nx = clampX(x + dirX * len), ny = clampY(y + dirY * len);
            const nd = Math.hypot(nx + CENTER.x - ptrX, ny + CENTER.y - ptrY);
            if (!best || nd > best.nd) best = { x: nx, y: ny, nd };
            return nd > SHY_RADIUS;
        });
        play('bc-click'); // the little flinch squash
        carrotX = x; carrotY = y;
        strollTo(null, best.x, best.y, { dur: 0.34, ease: easeOutCubic, bend: rand(-18, 18) });
    }

    /* ---------- Grab & throw ---------- */

    function onHitDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        try { hitEl.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
        undock();
        grabPointerId = e.pointerId;
        grabOffX = e.clientX - x;
        grabOffY = e.clientY - y;
        grabStartT = now();
        grabTravel = 0;
        lastDragX = e.clientX; lastDragY = e.clientY; lastDragT = grabStartT;
        dragVX = dragVY = 0;
        ptrX = e.clientX; ptrY = e.clientY;
        tween = null;
        anchor = null;
        mode = 'grab';
        wake(false);
        setShy(false);
        root.classList.add('bc-grabbed');
        document.documentElement.classList.add('bc-dragging');
        kick();
        if (window.SFX) window.SFX.play('blip:grab');
    }

    function onHitMove(e) {
        if (mode !== 'grab' || e.pointerId !== grabPointerId) return;
        const t = now();
        const dt = Math.max(1, t - lastDragT) / 1000;
        const ix = (e.clientX - lastDragX) / dt, iy = (e.clientY - lastDragY) / dt;
        const w = Math.min(1, dt * 14);
        dragVX += (ix - dragVX) * w;
        dragVY += (iy - dragVY) * w;
        grabTravel += Math.hypot(e.clientX - lastDragX, e.clientY - lastDragY);
        lastDragX = ptrX = e.clientX;
        lastDragY = ptrY = e.clientY;
        lastDragT = t;
    }

    function onHitUp(e) {
        if (mode !== 'grab' || (e && e.pointerId !== undefined && e.pointerId !== grabPointerId)) return;
        grabPointerId = null;
        root.classList.remove('bc-grabbed');
        document.documentElement.classList.remove('bc-dragging');
        // A held-still pointer has no speed, whatever the last EMA said.
        const stale = now() - lastDragT > 90;
        let rvx = stale ? 0 : dragVX, rvy = stale ? 0 : dragVY;
        const sp = Math.hypot(rvx, rvy);
        if (sp > THROW_MAX) { rvx *= THROW_MAX / sp; rvy *= THROW_MAX / sp; }
        dodges = 0;
        gaveUp = false;
        lastInteraction();
        if (grabTravel < 5 && now() - grabStartT < 350) {
            // A click on him, not a drag: he loves that.
            settleHere();
            play('bc-gag-1');
            nextThinkAt = now() + rand(2500, 4000);
            return;
        }
        // Let go mid-air: whether thrown or dropped, he falls.
        vx = rvx; vy = rvy;
        throwPeak = Math.min(sp, THROW_MAX);
        ground = null;
        surfaces = perchSurfaces();
        mode = 'thrown';
        if (sp > THROW_MIN && window.SFX) window.SFX.play('blip:throw');
    }

    function lastInteraction() {
        energy = Math.max(energy, 2);
    }

    /* ---------- Main loop ---------- */

    function syncDocked() {
        if (!docked) return;
        x = dockX - (window.scrollX - dockSX);
        y = dockY - (window.scrollY - dockSY);
        carrotX = x; carrotY = y;
    }

    function dock() {
        if (docked || !root) return;
        docked = true;
        dockX = x; dockY = y; dockSX = window.scrollX; dockSY = window.scrollY;
        root.classList.add('bc-docked');
        root.style.transform = 'translate3d(0,0,0)';
        const o = root.getBoundingClientRect(); // where (0,0) lands in this containing block
        lastTransform = 'translate3d(' + Math.round(x - o.left) + 'px,' + Math.round(y - o.top) + 'px,0)';
        root.style.transform = lastTransform;
    }

    function undock() {
        if (!docked) return;
        syncDocked();
        docked = false;
        if (root) root.classList.remove('bc-docked');
        lastTransform = '';
        applyTransform();
    }

    // The loop only runs while something moves. At rest Blip costs nothing
    // per frame: the loop sleeps and a timer (next stroll, nap end, cover
    // check) or an event (scroll, resize, a pointer coming close, a grab)
    // wakes it.
    function kick() {
        if (!isRunning || rafId) return;
        if (wakeTimer) { clearTimeout(wakeTimer); wakeTimer = null; }
        lastTickAt = 0;
        rafId = requestAnimationFrame(tick);
    }

    function canSleep() {
        return mode === 'rest' && vx === 0 && vy === 0 && !shy && !motionEl.style.transform;
    }

    function onScrollEnd() {
        if (scrollEndTimer) clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
            scrollEndTimer = null;
            // New content scrolled in: he's curious and goes to have a look
            // (unless he's asleep — then he just sleeps on).
            const sy = window.scrollY;
            if (Math.abs(sy - seenScrollY) > vh() * 0.45 && !dozing && mode === 'rest') {
                nextThinkAt = Math.min(nextThinkAt, now() + rand(450, 1000));
                energy = Math.max(energy, 1);
            }
            seenScrollY = sy;
            kick();
        }, 140);
    }

    function sleep(t) {
        rafId = null;
        let next = Math.min(nextGuardAt, dozing ? wakeAt : Math.max(nextThinkAt, holdUntil));
        if (!dozing && Date.now() < busyUntil) next = Math.min(next, t + (busyUntil - Date.now()) + 20);
        wakeTimer = setTimeout(() => { wakeTimer = null; kick(); }, Math.max(40, next - t));
    }

    function tick(t) {
        rafId = null;
        if (!isRunning) return;
        if (!lastTickAt) lastTickAt = t - 16;
        let dt = (t - lastTickAt) / 1000;
        lastTickAt = t;
        if (dt > MAX_DT) dt = MAX_DT;
        if (dt <= 0) { rafId = requestAnimationFrame(tick); return; }
        syncDocked();

        updateShy(t);

        if (mode === 'grab') {
            const tx = ptrX - grabOffX, ty = ptrY - grabOffY;
            vx += ((tx - x) * GRAB_K - vx * GRAB_C) * dt;
            vy += ((ty - y) * GRAB_K - vy * GRAB_C) * dt;
            x += vx * dt;
            y += vy * dt;
        } else if (mode === 'thrown') {
            fall(dt);
        } else {
            if (mode === 'move') {
                const p = tweenPoint(t);
                carrotX = p.x; carrotY = p.y;
                if (p.done && Math.hypot(carrotX - x, carrotY - y) < 3) arrive();
            } else {
                if (anchor) {
                    const ar = anchor.el.getBoundingClientRect();
                    if (!anchorUsable(anchor, ar)) {
                        // His perch scrolled away: hop to a free spot in view.
                        undock();
                        const cur = anchorPoint(anchor, ar);
                        x = clampX(cur.x); y = clampY(cur.y);
                        carrotX = x; carrotY = y;
                        anchor = null;
                        const f = freeSpot();
                        strollTo(null, f.x, f.y);
                    } else {
                        const p = anchorPoint(anchor, ar);
                        if (docked && (Math.abs(p.x - x) > 1 || Math.abs(p.y - y) > 1)) {
                            // The perch moved on its own (layout, inner scroller): re-seat.
                            undock();
                            x = carrotX = p.x; y = carrotY = p.y;
                        }
                        // Riding the scroll: stay glued, no spring lag.
                        if (Math.abs(p.y - carrotY) > 0.5 && Math.abs(vy) < 30) { y += p.y - carrotY; }
                        carrotX = p.x; carrotY = p.y;
                    }
                } else {
                    carrotX = homeX; carrotY = homeY;
                }
                // Asleep, summoned or not: never stay parked on a link / button
                // (the page may also have scrolled one under him).
                if (t > nextGuardAt) {
                    nextGuardAt = t + 1000;
                    if (mode === 'rest' && coversInteractive()) {
                        wake(false);
                        holdUntil = 0;
                        energy = Math.max(energy, 1);
                        think();
                    }
                }
                if (dozing) {
                    if (t > wakeAt) wake();
                } else if (t > nextThinkAt && t > holdUntil && Date.now() > busyUntil &&
                    (!shy || t - ptrT > 1500)) {
                    // Shy next to a pointer that just sits there: he moves along.
                    think();
                }
            }
            vx += ((carrotX - x) * FOLLOW_K - vx * FOLLOW_C) * dt;
            vy += ((carrotY - y) * FOLLOW_K - vy * FOLLOW_C) * dt;
            x += vx * dt;
            y += vy * dt;
            if (mode === 'rest' && Math.abs(carrotX - x) < 0.2 && Math.abs(carrotY - y) < 0.2 &&
                Math.abs(vx) < 3 && Math.abs(vy) < 3) {
                x = carrotX; y = carrotY; vx = vy = 0;
            }
        }
        if (!docked) applyTransform();
        applyBodyLanguage();
        if (canSleep()) {
            if (anchor && !docked) dock();
            sleep(t);
        } else {
            rafId = requestAnimationFrame(tick);
        }
    }

    // Element tops he can land on, read fresh at release.
    function perchSurfaces() {
        const out = [];
        const els = document.querySelectorAll(PERCH_SELECTOR);
        for (let i = 0; i < els.length && out.length < 80; i++) {
            const r = els[i].getBoundingClientRect();
            if (r.width < 60 || r.bottom < 0 || r.top > vh() || !visible(els[i])) continue;
            out.push(els[i]);
        }
        return out;
    }

    // Thrown or dropped: a ballistic arc, bounces off the walls, lands on the
    // viewport floor or on the top edge of a card / heading he falls onto.
    function fall(dt) {
        const prevFeet = y + FEET;
        if (ground) {
            vx *= Math.exp(-GROUND_DRAG * dt);
            vy = 0;
        } else {
            vy += GRAVITY * dt;
            vx *= Math.exp(-AIR_DRAG * dt);
        }
        x += vx * dt;
        y += vy * dt;

        const minX = EDGE - BODY.l, maxX = vw() - EDGE - (BODY.l + BODY.w);
        const minY = EDGE - BODY.t, maxY = vh() - EDGE - (BODY.t + BODY.h);
        let hit = 0;
        if (x < minX) { x = minX; hit = Math.abs(vx); vx = Math.abs(vx) * WALL_BOUNCE; }
        if (x > maxX) { x = maxX; hit = Math.abs(vx); vx = -Math.abs(vx) * WALL_BOUNCE; }
        if (y < minY) { y = minY; hit = Math.max(hit, Math.abs(vy)); vy = Math.abs(vy) * WALL_BOUNCE; }

        let surfaceY = null, surfaceEl = null;
        if (ground && ground !== 'floor') {
            // Slid off the edge of his landing spot?
            const r = ground.getBoundingClientRect();
            const cx = x + CENTER.x;
            if (cx < r.left || cx > r.right) ground = null;
            else y = r.top - FEET;
        } else if (!ground && vy > 0) {
            const cx = x + CENTER.x;
            for (let i = 0; i < surfaces.length; i++) {
                const r = surfaces[i].getBoundingClientRect();
                if (cx >= r.left + 4 && cx <= r.right - 4 && prevFeet <= r.top + 1 && y + FEET >= r.top &&
                    r.top - FEET + BODY.t > 70) {
                    surfaceY = r.top - FEET; surfaceEl = surfaces[i];
                    break;
                }
            }
            if (surfaceY === null && y > maxY) { surfaceY = maxY; surfaceEl = 'floor'; }
        }
        if (surfaceY !== null) {
            y = surfaceY;
            hit = Math.max(hit, vy);
            if (vy < REST_VY) { vy = 0; ground = surfaceEl; }
            else vy = -vy * FLOOR_BOUNCE;
        }
        if (hit > 380) {
            play('bc-click'); // the impact squash
            if (window.SFX) window.SFX.play('blip:bonk', { speed: hit });
        }
        if (ground && Math.abs(vx) < 25) land();
    }

    function land() {
        const on = ground;
        vx = vy = 0;
        ground = null;
        settleHere();
        if (on && on !== 'floor' && on.isConnected) {
            anchor = { el: on, ox: x - on.getBoundingClientRect().left };
            if (!anchorUsable(anchor)) anchor = null;
        }
        // A big throw leaves him dizzy; a gentle one just makes him look around.
        play(throwPeak > 1600 ? 'bc-twirl' : 'bc-gag-2');
        nextThinkAt = now() + rand(REST_MIN, REST_MAX);
    }

    // Is his body sitting over a link / button? Then he moves along.
    function coversInteractive() {
        if (!document.elementsFromPoint) return false;
        const pts = [[x + CENTER.x, y + CENTER.y], [x + CENTER.x, y + FEET - 4]];
        for (let i = 0; i < pts.length; i++) {
            const stack = document.elementsFromPoint(pts[i][0], pts[i][1]);
            for (let j = 0; j < stack.length; j++) {
                const el = stack[j];
                if (root && root.contains(el)) continue;
                if (el.closest(INTERACTIVE)) return true;
                break; // only what's actually on top under him matters
            }
        }
        return false;
    }

    /* ---------- Pointer tracking (for shyness) ---------- */

    function onPointerMove(e) {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        const t = now();
        const dt = Math.max(1, t - ptrT) / 1000;
        if (ptrT && dt < 0.2) {
            const w = Math.min(1, dt * 12);
            ptrVX += ((e.clientX - ptrX) / dt - ptrVX) * w;
            ptrVY += ((e.clientY - ptrY) / dt - ptrVY) * w;
        } else {
            ptrVX = ptrVY = 0;
        }
        ptrX = e.clientX;
        ptrY = e.clientY;
        ptrT = t;
        ptrInside = true;
        // Only wake the loop when the pointer is anywhere near him.
        syncDocked();
        if (!rafId && (shy || Math.hypot(ptrX - x - CENTER.x, ptrY - y - CENTER.y) < SHY_RADIUS * 2)) kick();
    }

    function onPointerLeave(e) {
        if (!e.relatedTarget) ptrInside = false;
    }

    // At rest (docked on a perch or fixed in a margin) nothing needs doing
    // while the page scrolls: one check once it stops. If the loop is already
    // running it picks the scroll up by itself.
    function onScroll() {
        if (!rafId) onScrollEnd();
    }

    function onResize() {
        measureViewport();
        kick();
        homeX = clampX(homeX);
        homeY = clampY(homeY);
        x = clampX(x);
        y = clampY(y);
    }

    function attachListeners() {
        handlers.pointermove = onPointerMove;
        handlers.mouseout = onPointerLeave;
        handlers.resize = onResize;
        handlers.scroll = onScroll;
        handlers.hitDown = onHitDown;
        handlers.hitMove = onHitMove;
        handlers.hitUp = onHitUp;
        document.addEventListener('pointermove', handlers.pointermove, { passive: true });
        document.addEventListener('mouseout', handlers.mouseout, { passive: true });
        window.addEventListener('resize', handlers.resize, { passive: true });
        window.addEventListener('scroll', handlers.scroll, { passive: true, capture: true });
        hitEl.addEventListener('pointerdown', handlers.hitDown);
        hitEl.addEventListener('pointermove', handlers.hitMove, { passive: true });
        hitEl.addEventListener('pointerup', handlers.hitUp);
        hitEl.addEventListener('pointercancel', handlers.hitUp);
        hitEl.addEventListener('lostpointercapture', handlers.hitUp);
    }

    function detachListeners() {
        if (handlers.pointermove) document.removeEventListener('pointermove', handlers.pointermove);
        if (handlers.mouseout) document.removeEventListener('mouseout', handlers.mouseout);
        if (handlers.resize) window.removeEventListener('resize', handlers.resize);
        if (handlers.scroll) window.removeEventListener('scroll', handlers.scroll, { capture: true });
        Object.keys(handlers).forEach(k => delete handlers[k]);
    }

    /* ---------- Lifecycle ---------- */

    function start(px, py, entrance) {
        if (isRunning || !isActive || prefersReduced()) return;
        isRunning = true;
        waitingForIntro = false;
        mode = 'rest';
        tween = null;
        anchor = null;
        dozing = false;
        shy = false;
        dodges = 0;
        energy = Math.round(rand(ENERGY_MIN, ENERGY_MAX));
        busyUntil = 0;
        lastGag = null;
        vx = vy = 0;
        lastTickAt = 0;
        lastTransform = '';
        measureViewport();
        x = homeX = carrotX = clampX(px);
        y = homeY = carrotY = clampY(py);
        createDom();
        document.body.classList.add('blip-cursor-active');
        attachListeners();
        rafId = requestAnimationFrame(tick);
        scheduleBlink();
        scheduleGag();
        nextThinkAt = now() + rand(1800, 3200);
        if (entrance) play(entrance);
    }

    function stop() {
        if (!isRunning) return;
        isRunning = false;
        detachListeners();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (wakeTimer) clearTimeout(wakeTimer);
        if (scrollEndTimer) clearTimeout(scrollEndTimer);
        wakeTimer = scrollEndTimer = null;
        docked = false;
        if (blinkTimer) clearTimeout(blinkTimer);
        if (gagTimer) clearTimeout(gagTimer);
        blinkTimer = gagTimer = null;
        oneShotTimers.forEach(t => clearTimeout(t));
        oneShotTimers.clear();
        document.documentElement.classList.remove('bc-dragging');
        document.body.classList.remove('blip-cursor-active');
        removeDom();
    }

    // Without the intro: once the page is shown, he wakes up in a margin.
    function spawnAlone() {
        const go = () => {
            if (isRunning || !isActive) return;
            measureViewport();
            const f = freeSpot();
            start(f.x, f.y, 'bc-wake');
        };
        if (document.body.classList.contains('loading')) {
            const mo = new MutationObserver(() => {
                if (document.body.classList.contains('loading')) return;
                mo.disconnect();
                setTimeout(go, 600);
            });
            mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } else {
            setTimeout(go, 300);
        }
    }

    function onReducedChange() {
        if (prefersReduced()) stop();
        else if (!isRunning && !waitingForIntro) spawnAlone();
    }

    function onFineChange() {
        finePointer = !!(mqFine && mqFine.matches);
        if (!finePointer) setShy(false);
    }

    function init() {
        if (isActive) return;
        if (typeof window === 'undefined' || !window.matchMedia) return;
        isActive = true;

        mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
        finePointer = mqFine.matches;
        addMqListener(mqReduced, onReducedChange);
        addMqListener(mqFine, onFineChange);

        themeObserver = new MutationObserver(syncTheme);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

        if (prefersReduced()) return;
        // The intro owns his entrance (it fuses the swarm back into him).
        if (window.BlipSwarm && window.BlipSwarm.willRun) waitingForIntro = true;
        else spawnAlone();
    }

    function destroy() {
        if (!isActive) return;
        isActive = false;
        stop();
        removeMqListener(mqReduced, onReducedChange);
        removeMqListener(mqFine, onFineChange);
        if (themeObserver) themeObserver.disconnect();
        themeObserver = null;
        mqReduced = mqFine = null;
    }

    function addMqListener(mq, fn) {
        if (!mq) return;
        if (mq.addEventListener) mq.addEventListener('change', fn);
        else if (mq.addListener) mq.addListener(fn); // Safari <14 fallback
    }

    function removeMqListener(mq, fn) {
        if (!mq) return;
        if (mq.removeEventListener) mq.removeEventListener('change', fn);
        else if (mq.removeListener) mq.removeListener(fn);
    }

    const SVG_MARKUP = `<svg class="bc-svg" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g class="bc-anim"><g class="bc-anim2"><g class="bc-bf bc-b-n"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="6" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="15" y="12" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="16" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="17" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="17" y="15" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="17" y="16" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="17" y="18" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/><rect x="17" y="19" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/><rect x="17" y="20" width="1" height="1"/><rect x="6" y="21" width="1" height="1"/><rect x="17" y="21" width="1" height="1"/><rect x="6" y="22" width="12" height="1"/><rect x="8" y="23" width="3" height="1"/><rect x="14" y="23" width="3" height="1"/><rect x="8" y="24" width="3" height="1"/><rect x="14" y="24" width="3" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="7" y="10" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="7" y="12" width="1" height="1"/><rect x="13" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="7" y="16" width="1" height="1"/><rect x="7" y="18" width="1" height="1"/><rect x="7" y="20" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="8" y="10" width="3" height="1"/><rect x="8" y="12" width="5" height="1"/><rect x="8" y="14" width="8" height="1"/><rect x="8" y="16" width="8" height="1"/><rect x="8" y="18" width="8" height="1"/><rect x="8" y="20" width="1" height="1"/><rect x="10" y="20" width="1" height="1"/><rect x="12" y="20" width="1" height="1"/><rect x="14" y="20" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/><rect x="14" y="12" width="1" height="1"/></g><g class="bc-c-l1"><rect x="7" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="7" y="11" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="7" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="7" y="19" width="1" height="1"/></g><g class="bc-c-g1"><rect x="8" y="9" width="2" height="1"/><rect x="8" y="11" width="4" height="1"/><rect x="8" y="13" width="8" height="1"/><rect x="8" y="15" width="8" height="1"/><rect x="8" y="17" width="8" height="1"/><rect x="8" y="19" width="7" height="1"/><rect x="7" y="21" width="1" height="1"/></g><g class="bc-c-d2"><rect x="16" y="14" width="1" height="1"/><rect x="16" y="16" width="1" height="1"/><rect x="16" y="18" width="1" height="1"/><rect x="9" y="20" width="1" height="1"/><rect x="11" y="20" width="1" height="1"/><rect x="13" y="20" width="1" height="1"/><rect x="15" y="20" width="1" height="1"/></g><g class="bc-c-d1"><rect x="16" y="15" width="1" height="1"/><rect x="16" y="17" width="1" height="1"/><rect x="15" y="19" width="2" height="1"/><rect x="8" y="21" width="7" height="1"/></g><g class="bc-c-z2"><rect x="16" y="20" width="1" height="1"/></g><g class="bc-c-z1"><rect x="15" y="21" width="2" height="1"/></g></g><g class="bc-bf bc-b-sq"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="6" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="16" y="12" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="18" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="18" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="18" y="15" width="1" height="1"/><rect x="5" y="16" width="1" height="1"/><rect x="18" y="16" width="1" height="1"/><rect x="5" y="17" width="1" height="1"/><rect x="18" y="17" width="1" height="1"/><rect x="5" y="18" width="1" height="1"/><rect x="18" y="18" width="1" height="1"/><rect x="5" y="19" width="1" height="1"/><rect x="18" y="19" width="1" height="1"/><rect x="5" y="20" width="1" height="1"/><rect x="18" y="20" width="1" height="1"/><rect x="5" y="21" width="14" height="1"/><rect x="7" y="22" width="3" height="1"/><rect x="15" y="22" width="3" height="1"/><rect x="7" y="23" width="3" height="1"/><rect x="15" y="23" width="3" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="7" y="10" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="7" y="12" width="1" height="1"/><rect x="14" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="8" y="10" width="3" height="1"/><rect x="8" y="12" width="6" height="1"/><rect x="8" y="14" width="9" height="1"/><rect x="7" y="16" width="10" height="1"/><rect x="7" y="18" width="9" height="1"/><rect x="6" y="20" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/><rect x="15" y="12" width="1" height="1"/></g><g class="bc-c-l1"><rect x="7" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="7" y="11" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="7" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/></g><g class="bc-c-g1"><rect x="8" y="9" width="2" height="1"/><rect x="8" y="11" width="4" height="1"/><rect x="8" y="13" width="9" height="1"/><rect x="8" y="15" width="9" height="1"/><rect x="7" y="17" width="10" height="1"/><rect x="7" y="19" width="1" height="1"/><rect x="9" y="19" width="1" height="1"/><rect x="11" y="19" width="1" height="1"/><rect x="13" y="19" width="1" height="1"/><rect x="15" y="19" width="1" height="1"/></g><g class="bc-c-d1"><rect x="17" y="13" width="1" height="1"/><rect x="17" y="15" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/><rect x="8" y="19" width="1" height="1"/><rect x="10" y="19" width="1" height="1"/><rect x="12" y="19" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/><rect x="16" y="19" width="1" height="1"/></g><g class="bc-c-d2"><rect x="17" y="14" width="1" height="1"/><rect x="17" y="16" width="1" height="1"/><rect x="16" y="18" width="2" height="1"/><rect x="7" y="20" width="9" height="1"/></g><g class="bc-c-z1"><rect x="17" y="19" width="1" height="1"/></g><g class="bc-c-z2"><rect x="16" y="20" width="2" height="1"/></g></g><g class="bc-bf bc-b-cl"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="5" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="4" y="10" width="1" height="1"/><rect x="14" y="10" width="1" height="1"/><rect x="3" y="11" width="1" height="1"/><rect x="16" y="11" width="1" height="1"/><rect x="3" y="12" width="1" height="1"/><rect x="18" y="12" width="1" height="1"/><rect x="3" y="13" width="1" height="1"/><rect x="18" y="13" width="1" height="1"/><rect x="2" y="14" width="1" height="1"/><rect x="19" y="14" width="1" height="1"/><rect x="2" y="15" width="1" height="1"/><rect x="19" y="15" width="1" height="1"/><rect x="2" y="16" width="1" height="1"/><rect x="19" y="16" width="1" height="1"/><rect x="2" y="17" width="1" height="1"/><rect x="19" y="17" width="1" height="1"/><rect x="2" y="18" width="1" height="1"/><rect x="19" y="18" width="1" height="1"/><rect x="2" y="19" width="18" height="1"/><rect x="5" y="20" width="3" height="1"/><rect x="15" y="20" width="3" height="1"/><rect x="5" y="21" width="3" height="1"/><rect x="15" y="21" width="3" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="5" y="10" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="4" y="12" width="1" height="1"/><rect x="3" y="14" width="1" height="1"/><rect x="3" y="16" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="6" y="10" width="6" height="1"/><rect x="5" y="12" width="12" height="1"/><rect x="4" y="14" width="14" height="1"/><rect x="4" y="16" width="13" height="1"/><rect x="3" y="18" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="15" y="11" width="1" height="1"/></g><g class="bc-c-l1"><rect x="6" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="4" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="4" y="13" width="1" height="1"/><rect x="3" y="15" width="1" height="1"/><rect x="3" y="17" width="1" height="1"/></g><g class="bc-c-g1"><rect x="7" y="9" width="3" height="1"/><rect x="5" y="11" width="9" height="1"/><rect x="5" y="13" width="12" height="1"/><rect x="4" y="15" width="14" height="1"/><rect x="4" y="17" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="8" y="17" width="1" height="1"/><rect x="10" y="17" width="1" height="1"/><rect x="12" y="17" width="1" height="1"/><rect x="14" y="17" width="1" height="1"/><rect x="16" y="17" width="1" height="1"/></g><g class="bc-c-d2"><rect x="17" y="12" width="1" height="1"/><rect x="18" y="14" width="1" height="1"/><rect x="17" y="16" width="2" height="1"/><rect x="4" y="18" width="13" height="1"/></g><g class="bc-c-d1"><rect x="17" y="13" width="1" height="1"/><rect x="18" y="15" width="1" height="1"/><rect x="5" y="17" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="9" y="17" width="1" height="1"/><rect x="11" y="17" width="1" height="1"/><rect x="13" y="17" width="1" height="1"/><rect x="15" y="17" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/></g><g class="bc-c-z1"><rect x="18" y="17" width="1" height="1"/></g><g class="bc-c-z2"><rect x="17" y="18" width="2" height="1"/></g></g><g class="bc-bf bc-b-st"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="6" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="15" y="12" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="15" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="15" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="15" y="15" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="15" y="16" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="15" y="17" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="15" y="18" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/><rect x="15" y="19" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/><rect x="15" y="20" width="1" height="1"/><rect x="6" y="21" width="1" height="1"/><rect x="15" y="21" width="1" height="1"/><rect x="6" y="22" width="1" height="1"/><rect x="15" y="22" width="1" height="1"/><rect x="6" y="23" width="1" height="1"/><rect x="15" y="23" width="1" height="1"/><rect x="6" y="24" width="10" height="1"/><rect x="8" y="25" width="2" height="1"/><rect x="13" y="25" width="2" height="1"/><rect x="8" y="26" width="2" height="1"/><rect x="13" y="26" width="2" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="7" y="10" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="7" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="7" y="16" width="1" height="1"/><rect x="7" y="18" width="1" height="1"/><rect x="7" y="20" width="1" height="1"/><rect x="7" y="22" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="8" y="10" width="3" height="1"/><rect x="8" y="12" width="7" height="1"/><rect x="8" y="14" width="6" height="1"/><rect x="8" y="16" width="6" height="1"/><rect x="8" y="18" width="6" height="1"/><rect x="8" y="20" width="6" height="1"/><rect x="8" y="22" width="1" height="1"/><rect x="10" y="22" width="1" height="1"/><rect x="12" y="22" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/></g><g class="bc-c-l1"><rect x="7" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="7" y="11" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="7" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="7" y="19" width="1" height="1"/><rect x="7" y="21" width="1" height="1"/></g><g class="bc-c-g1"><rect x="8" y="9" width="2" height="1"/><rect x="8" y="11" width="4" height="1"/><rect x="8" y="13" width="6" height="1"/><rect x="8" y="15" width="6" height="1"/><rect x="8" y="17" width="6" height="1"/><rect x="8" y="19" width="6" height="1"/><rect x="8" y="21" width="5" height="1"/><rect x="7" y="23" width="1" height="1"/></g><g class="bc-c-d1"><rect x="14" y="13" width="1" height="1"/><rect x="14" y="15" width="1" height="1"/><rect x="14" y="17" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/><rect x="13" y="21" width="2" height="1"/><rect x="8" y="23" width="6" height="1"/></g><g class="bc-c-d2"><rect x="14" y="14" width="1" height="1"/><rect x="14" y="16" width="1" height="1"/><rect x="14" y="18" width="1" height="1"/><rect x="14" y="20" width="1" height="1"/><rect x="9" y="22" width="1" height="1"/><rect x="11" y="22" width="1" height="1"/><rect x="13" y="22" width="1" height="1"/></g><g class="bc-c-z2"><rect x="14" y="22" width="1" height="1"/></g><g class="bc-c-z1"><rect x="14" y="23" width="1" height="1"/></g></g><g class="bc-bf bc-b-lean"><g class="bc-c-k"><rect x="5" y="8" width="1" height="1"/><rect x="10" y="8" width="1" height="1"/><rect x="5" y="9" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="5" y="10" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="5" y="11" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/><rect x="5" y="12" width="1" height="1"/><rect x="14" y="12" width="1" height="1"/><rect x="5" y="13" width="1" height="1"/><rect x="16" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="17" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="17" y="15" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="17" y="16" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="17" y="18" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/><rect x="17" y="19" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/><rect x="17" y="20" width="1" height="1"/><rect x="6" y="21" width="1" height="1"/><rect x="17" y="21" width="1" height="1"/><rect x="6" y="22" width="12" height="1"/><rect x="7" y="23" width="3" height="1"/><rect x="14" y="23" width="3" height="1"/><rect x="7" y="24" width="3" height="1"/><rect x="14" y="24" width="3" height="1"/></g><g class="bc-c-l2"><rect x="6" y="8" width="1" height="1"/><rect x="8" y="8" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="10" y="10" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="12" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="7" y="16" width="1" height="1"/><rect x="7" y="18" width="1" height="1"/><rect x="7" y="20" width="1" height="1"/></g><g class="bc-c-g2"><rect x="7" y="8" width="1" height="1"/><rect x="7" y="10" width="3" height="1"/><rect x="7" y="12" width="5" height="1"/><rect x="8" y="14" width="8" height="1"/><rect x="8" y="16" width="8" height="1"/><rect x="8" y="18" width="8" height="1"/><rect x="8" y="20" width="1" height="1"/><rect x="10" y="20" width="1" height="1"/><rect x="12" y="20" width="1" height="1"/><rect x="14" y="20" width="1" height="1"/></g><g class="bc-c-w"><rect x="9" y="8" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="13" y="12" width="1" height="1"/></g><g class="bc-c-l1"><rect x="6" y="9" width="1" height="1"/><rect x="9" y="9" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="11" y="11" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="7" y="19" width="1" height="1"/></g><g class="bc-c-g1"><rect x="7" y="9" width="2" height="1"/><rect x="7" y="11" width="4" height="1"/><rect x="7" y="13" width="9" height="1"/><rect x="8" y="15" width="8" height="1"/><rect x="8" y="17" width="8" height="1"/><rect x="8" y="19" width="7" height="1"/><rect x="7" y="21" width="1" height="1"/></g><g class="bc-c-d2"><rect x="16" y="14" width="1" height="1"/><rect x="16" y="16" width="1" height="1"/><rect x="16" y="18" width="1" height="1"/><rect x="9" y="20" width="1" height="1"/><rect x="11" y="20" width="1" height="1"/><rect x="13" y="20" width="1" height="1"/><rect x="15" y="20" width="1" height="1"/></g><g class="bc-c-d1"><rect x="16" y="15" width="1" height="1"/><rect x="16" y="17" width="1" height="1"/><rect x="15" y="19" width="2" height="1"/><rect x="8" y="21" width="7" height="1"/></g><g class="bc-c-z2"><rect x="16" y="20" width="1" height="1"/></g><g class="bc-c-z1"><rect x="15" y="21" width="2" height="1"/></g></g><g class="bc-paw bc-paw-up"><g class="bc-c-k"><rect x="17" y="11" width="4" height="1"/><rect x="17" y="12" width="1" height="1"/><rect x="20" y="12" width="1" height="1"/><rect x="17" y="13" width="1" height="1"/><rect x="20" y="13" width="1" height="1"/><rect x="17" y="14" width="4" height="1"/></g><g class="bc-c-g1"><rect x="18" y="12" width="2" height="1"/><rect x="18" y="13" width="2" height="1"/><rect x="18" y="15" width="2" height="1"/></g></g><g class="bc-paw bc-paw-dn"><g class="bc-c-g1"><rect x="18" y="15" width="1" height="1"/><rect x="20" y="16" width="2" height="1"/><rect x="20" y="17" width="2" height="1"/></g><g class="bc-c-k"><rect x="19" y="15" width="4" height="1"/><rect x="19" y="16" width="1" height="1"/><rect x="22" y="16" width="1" height="1"/><rect x="19" y="17" width="1" height="1"/><rect x="22" y="17" width="1" height="1"/><rect x="19" y="18" width="4" height="1"/></g></g><g class="bc-face"><g class="bc-e bc-e-n"><g class="bc-c-w"><rect x="9" y="13" width="1" height="1"/><rect x="13" y="13" width="1" height="1"/></g><g class="bc-c-k"><rect x="10" y="13" width="1" height="1"/><rect x="14" y="13" width="1" height="1"/><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/><rect x="9" y="15" width="2" height="1"/><rect x="13" y="15" width="2" height="1"/></g></g><g class="bc-e bc-e-wide"><g class="bc-c-w"><rect x="9" y="12" width="2" height="1"/><rect x="13" y="12" width="2" height="1"/></g><g class="bc-c-k"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/><rect x="9" y="15" width="2" height="1"/><rect x="13" y="15" width="2" height="1"/></g></g><g class="bc-lid bc-lid-1"><g class="bc-c-g1"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/></g></g><g class="bc-lid bc-lid-2"><g class="bc-c-g1"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/></g><g class="bc-c-g2"><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/></g></g><g class="bc-lid bc-lid-3"><g class="bc-c-g1"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/></g><g class="bc-c-g2"><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/></g><g class="bc-c-k"><rect x="9" y="15" width="2" height="1"/><rect x="13" y="15" width="2" height="1"/></g></g><g class="bc-blush"><g class="bc-c-a"><rect x="8" y="16" width="1" height="1"/><rect x="14" y="16" width="1" height="1"/></g></g><g class="bc-blush-warm"><g class="bc-c-a"><rect x="7" y="16" width="1" height="1"/><rect x="15" y="16" width="1" height="1"/></g></g><g class="bc-m bc-m-smirk"><g class="bc-c-k"><rect x="13" y="17" width="1" height="1"/><rect x="9" y="18" width="4" height="1"/></g></g><g class="bc-m bc-m-o"><g class="bc-c-k"><rect x="10" y="17" width="3" height="1"/><rect x="10" y="18" width="3" height="1"/></g></g></g></g></g><g class="bc-tip"><g class="bc-t bc-t-n"><g class="bc-c-k"><rect x="6" y="3" width="1" height="1"/><rect x="6" y="4" width="2" height="1"/><rect x="6" y="5" width="1" height="1"/><rect x="8" y="5" width="1" height="1"/><rect x="6" y="6" width="1" height="1"/><rect x="9" y="6" width="1" height="1"/><rect x="6" y="7" width="1" height="1"/><rect x="10" y="7" width="1" height="1"/></g><g class="bc-c-tw"><rect x="7" y="5" width="1" height="1"/><rect x="7" y="6" width="2" height="1"/><rect x="9" y="7" width="1" height="1"/></g><g class="bc-c-tl"><rect x="7" y="7" width="2" height="1"/></g></g><g class="bc-t bc-t-ext"><g class="bc-c-k"><rect x="5" y="2" width="1" height="1"/><rect x="5" y="3" width="2" height="1"/><rect x="5" y="4" width="1" height="1"/><rect x="7" y="4" width="1" height="1"/><rect x="5" y="5" width="1" height="1"/><rect x="8" y="5" width="1" height="1"/><rect x="5" y="6" width="1" height="1"/><rect x="9" y="6" width="1" height="1"/><rect x="5" y="7" width="1" height="1"/><rect x="9" y="7" width="1" height="1"/></g><g class="bc-c-tw"><rect x="6" y="4" width="1" height="1"/><rect x="6" y="5" width="2" height="1"/><rect x="7" y="6" width="2" height="1"/><rect x="8" y="7" width="1" height="1"/></g><g class="bc-c-tl"><rect x="6" y="6" width="1" height="1"/><rect x="6" y="7" width="2" height="1"/></g></g></g><g class="bc-fx"><rect class="bc-sp bc-sp-1 bc-c-tw" x="5" y="2" width="1" height="1"/><rect class="bc-sp bc-sp-2 bc-c-a"  x="4" y="4" width="1" height="1"/><rect class="bc-sp bc-sp-3 bc-c-tl" x="7" y="1" width="1" height="1"/><g class="bc-zpos" transform="translate(15,6)"><g class="bc-z bc-z1"><g class="bc-c-fx"><rect x="0" y="0" width="4" height="1"/><rect x="2" y="1" width="1" height="1"/><rect x="1" y="2" width="1" height="1"/><rect x="0" y="3" width="4" height="1"/></g></g></g><g class="bc-zpos" transform="translate(17.5,2.5)"><g class="bc-z bc-z2"><g class="bc-c-fx"><rect x="0" y="0" width="5" height="1"/><rect x="3" y="1" width="1" height="1"/><rect x="2" y="2" width="1" height="1"/><rect x="1" y="3" width="1" height="1"/><rect x="0" y="4" width="5" height="1"/></g></g></g></g></svg>`;

    /* ---------- Public API ---------- */

    // The intro hands Blip over here, his tip at (px, py), right where the
    // fused sprite stands. The intro also calls it with no args to bail out.
    function appear(px, py) {
        if (!isActive || isRunning) return;
        if (px == null) { waitingForIntro = false; spawnAlone(); return; }
        start(px, py, null);
        // Fused mid-page, over the content: savour it a beat, then go perch.
        nextThinkAt = now() + 1500;
    }

    // Where Blip's hotspot currently is, or null while he's hidden/asleep.
    // Used by CathodeGuide to notice when the two mascots are close.
    function getPosition() {
        if (!isRunning || dozing || mode === 'thrown' || mode === 'grab') return null;
        syncDocked();
        return { x, y, mode: 'pet' };
    }

    // Ask Blip to play a one-shot reaction (whitelisted). Returns true if it
    // actually played - callers use that to keep two-character scenes honest.
    function react(kind) {
        if (!isRunning || !root || prefersReduced()) return false;
        const cls = REACTIONS[kind];
        if (!cls) return false;
        wake(false);
        play(cls);
        return true;
    }

    // Call Blip somewhere (Cathode's repair SOS): he strolls over and hangs
    // around for a while.
    function summon(px, py) {
        if (!isRunning || mode === 'grab' || mode === 'thrown') return false;
        wake(false);
        strollTo(null, clampX(px), clampY(py));
        holdUntil = now() + 9000;
        return true;
    }

    return {
        init,
        destroy,
        appear,
        getPosition,
        react,
        summon,
        get isActive() { return isActive; },
        get isRunning() { return isRunning; },
        // The kit SVG, for the intro's swarm Blips.
        get markup() { return SVG_MARKUP; }
    };
})();

// Export for use in other modules
window.BlipCursor = BlipCursor;
