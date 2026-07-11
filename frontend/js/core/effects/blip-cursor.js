/**
 * Blip Cursor Module
 * Replaces the native mouse pointer with Blip, the site's pixel-art mascot.
 * Built on top of the vendor "cursor-kit" (see /frontend/css/blip-cursor.css):
 * that stylesheet owns every animation/keyframe (bc-* classes); this module
 * only creates the DOM, tracks the pointer, and toggles state classes.
 *
 * Hotspot contract (see kit SPEC): the SVG viewBox is 0 0 24 28, the tip sits
 * at grid unit (6,3), and the CSS shifts the SVG by (-6s,-3s) so the origin
 * of #blip-cursor itself IS the hotspot. Positioning the div at
 * translate3d(clientX, clientY, 0) drops the tip exactly under the pointer.
 */
const BlipCursor = (() => {
    const THEMES = ['terminal', 'default', 'blueprint', 'retro90s'];
    const DEFAULT_THEME = 'default';
    const MIN_WIDTH = 900;

    // Links/buttons get the "leaning toward target" hover state. Native form
    // controls are handled separately below (real caret, dimmed Blip).
    const HOVER_SELECTOR = 'a, button, [role="button"], .clickable, [data-bc-hover]';
    const NATIVE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

    const GAG_CLASSES = ['bc-gag-1', 'bc-gag-2', 'bc-gag-3'];
    const ONE_SHOT_DURATIONS = {
        'bc-click': 400,
        'bc-blink': 240,
        'bc-gag-1': 1100,
        'bc-gag-2': 1500,
        'bc-gag-3': 1400,
        'bc-wake': 420
    };

    const SNOOZE_AFTER_MS = 25000;

    // Suiveur à ressort sous-amorti : Blip traîne derrière la souris, dépasse
    // légèrement la cible et se pose avec un petit rebond (ζ ≈ 0.62).
    const SPRING_K = 190;          // raideur (s^-2)
    const SPRING_C = 17;           // friction (s^-1)
    const MAX_DT = 1 / 30;         // clamp du pas de temps (retour d'onglet, freeze)
    const SETTLE_DIST = 0.15;      // px — seuil de pose
    const SETTLE_VEL = 4;          // px/s
    // Body language piloté par la vitesse (appliqué au wrapper .bc-motion,
    // jamais aux groupes du kit ni au hotspot).
    const TILT_PER_V = 0.016;      // deg par px/s de vitesse horizontale
    const TILT_MAX = 12;           // deg
    const STRETCH_PER_V = 1 / 5200; // étirement par px/s de vitesse
    const STRETCH_MAX = 0.16;      // +16 % max, squash perpendiculaire équivalent
    const BODY_MIN_SPEED = 6;      // px/s — en dessous, repos strict

    let root = null;
    let isActive = false;      // module fully torn down vs. alive (init/destroy)
    let isRunning = false;     // currently attached (guards can flip this off/on live)
    let seenMove = false;
    let snoozing = false;
    let busyUntil = 0;
    let lastMoveAt = 0;
    let lastGag = null;

    let curX = -100, curY = -100, targetX = -100, targetY = -100;
    let velX = 0, velY = 0;
    let lastTickAt = 0;
    let motionEl = null;
    let rafId = null;
    let blinkTimer = null;
    let gagTimer = null;
    let snoozeInterval = null;
    const oneShotTimers = new Set();

    let mqCoarse = null;
    let mqReduced = null;
    let resizeTimer = null;
    let themeObserver = null;

    const handlers = {};

    function prefersReduced() {
        return !!(mqReduced && mqReduced.matches);
    }

    function isCoarsePointer() {
        return !!(mqCoarse && mqCoarse.matches);
    }

    function viewportWide() {
        return window.innerWidth >= MIN_WIDTH;
    }

    function shouldRun() {
        return !isCoarsePointer() && !prefersReduced() && viewportWide();
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

    function createDom() {
        if (root) return;
        root = document.createElement('div');
        root.id = 'blip-cursor';
        root.setAttribute('aria-hidden', 'true');
        root.className = 'bc bc-theme-' + currentTheme();
        root.innerHTML = '<div class="bc-motion">' + SVG_MARKUP + '</div>';
        motionEl = root.firstChild;
        document.body.appendChild(root);
        applyTransform(); // park off-screen until the first real pointermove
    }

    function removeDom() {
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = null;
        motionEl = null;
    }

    function applyTransform() {
        if (root) root.style.transform = 'translate3d(' + curX + 'px,' + curY + 'px,0)';
    }

    function tick(now) {
        if (!lastTickAt) lastTickAt = now;
        let dt = (now - lastTickAt) / 1000;
        lastTickAt = now;
        if (dt > MAX_DT) dt = MAX_DT;
        if (dt > 0) {
            velX += ((targetX - curX) * SPRING_K - velX * SPRING_C) * dt;
            velY += ((targetY - curY) * SPRING_K - velY * SPRING_C) * dt;
            curX += velX * dt;
            curY += velY * dt;
            if (Math.abs(targetX - curX) < SETTLE_DIST && Math.abs(targetY - curY) < SETTLE_DIST &&
                Math.abs(velX) < SETTLE_VEL && Math.abs(velY) < SETTLE_VEL) {
                curX = targetX;
                curY = targetY;
                velX = 0;
                velY = 0;
            }
        }
        applyTransform();
        applyBodyLanguage();
        rafId = requestAnimationFrame(tick);
    }

    // Il s'incline dans le sens du déplacement et s'étire le long de sa
    // trajectoire (volume conservé) ; le tremblé de pose vient du ressort.
    function applyBodyLanguage() {
        if (!motionEl) return;
        const speed = Math.hypot(velX, velY);
        if (speed < BODY_MIN_SPEED) {
            if (motionEl.style.transform) motionEl.style.transform = '';
            return;
        }
        let tilt = velX * TILT_PER_V;
        if (tilt > TILT_MAX) tilt = TILT_MAX;
        else if (tilt < -TILT_MAX) tilt = -TILT_MAX;
        let s = 1 + speed * STRETCH_PER_V;
        if (s > 1 + STRETCH_MAX) s = 1 + STRETCH_MAX;
        const ang = Math.atan2(velY, velX);
        motionEl.style.transform =
            'rotate(' + tilt.toFixed(2) + 'deg)' +
            ' rotate(' + ang.toFixed(3) + 'rad)' +
            ' scale(' + s.toFixed(3) + ',' + (1 / s).toFixed(3) + ')' +
            ' rotate(' + (-ang).toFixed(3) + 'rad)';
    }

    function calm() {
        return Date.now() > busyUntil && !snoozing;
    }

    function idleForGags() {
        return calm() && !root.classList.contains('bc-hover-link') && !root.classList.contains('bc-native');
    }

    function play(cls) {
        if (!root || prefersReduced() || !ONE_SHOT_DURATIONS[cls]) return;
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

    function wake() {
        lastMoveAt = Date.now();
        if (snoozing) {
            snoozing = false;
            root.classList.remove('bc-snooze');
            play('bc-wake');
        }
    }

    function activate() {
        if (!seenMove) {
            seenMove = true;
            document.documentElement.classList.add('bc-active');
            document.body.classList.add('blip-cursor-active');
        }
        wake();
    }

    function scheduleBlink() {
        blinkTimer = setTimeout(() => {
            if (!isRunning) return;
            if (idleForGags()) play('bc-blink');
            scheduleBlink();
        }, 6000 + Math.random() * 8000);
    }

    function scheduleGag() {
        gagTimer = setTimeout(() => {
            if (!isRunning) return;
            if (seenMove && idleForGags()) {
                let cls;
                do {
                    cls = GAG_CLASSES[Math.floor(Math.random() * GAG_CLASSES.length)];
                } while (cls === lastGag && GAG_CLASSES.length > 1);
                lastGag = cls;
                play(cls);
            }
            scheduleGag();
        }, 15000 + Math.random() * 25000);
    }

    function startSnoozeWatch() {
        snoozeInterval = setInterval(() => {
            if (!root || snoozing || !seenMove || prefersReduced()) return;
            if (Date.now() - lastMoveAt > SNOOZE_AFTER_MS && calm()) {
                snoozing = true;
                root.classList.remove('bc-hover-link', 'bc-native');
                root.classList.add('bc-snooze');
            }
        }, 1000);
    }

    function onPointerMove(e) {
        targetX = e.clientX;
        targetY = e.clientY;
        activate();
    }

    function onPointerDown() {
        activate();
        play('bc-click');
    }

    function onMouseOver(e) {
        if (!root || snoozing || !e.target || !e.target.closest) return;
        if (e.target.closest(NATIVE_SELECTOR)) {
            root.classList.add('bc-native');
            return;
        }
        if (e.target.closest(HOVER_SELECTOR)) root.classList.add('bc-hover-link');
    }

    function onMouseOut(e) {
        if (!root || !e.target || !e.target.closest) return;
        if (e.target.closest(NATIVE_SELECTOR)) root.classList.remove('bc-native');
        if (e.target.closest(HOVER_SELECTOR)) root.classList.remove('bc-hover-link');
    }

    function attachListeners() {
        handlers.pointermove = onPointerMove;
        handlers.pointerdown = onPointerDown;
        handlers.mouseover = onMouseOver;
        handlers.mouseout = onMouseOut;
        document.addEventListener('pointermove', handlers.pointermove, { passive: true });
        document.addEventListener('pointerdown', handlers.pointerdown, { passive: true });
        document.addEventListener('mouseover', handlers.mouseover);
        document.addEventListener('mouseout', handlers.mouseout);
    }

    function detachListeners() {
        if (handlers.pointermove) document.removeEventListener('pointermove', handlers.pointermove);
        if (handlers.pointerdown) document.removeEventListener('pointerdown', handlers.pointerdown);
        if (handlers.mouseover) document.removeEventListener('mouseover', handlers.mouseover);
        if (handlers.mouseout) document.removeEventListener('mouseout', handlers.mouseout);
        Object.keys(handlers).forEach(k => delete handlers[k]);
    }

    function start() {
        if (isRunning) return;
        isRunning = true;
        seenMove = false;
        snoozing = false;
        busyUntil = 0;
        lastGag = null;
        curX = targetX = -100;
        curY = targetY = -100;
        velX = velY = 0;
        lastTickAt = 0;
        createDom();
        attachListeners();
        rafId = requestAnimationFrame(tick);
        scheduleBlink();
        scheduleGag();
        startSnoozeWatch();
    }

    function stop() {
        if (!isRunning) return;
        isRunning = false;
        detachListeners();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (blinkTimer) clearTimeout(blinkTimer);
        if (gagTimer) clearTimeout(gagTimer);
        if (snoozeInterval) clearInterval(snoozeInterval);
        blinkTimer = gagTimer = snoozeInterval = null;
        oneShotTimers.forEach(t => clearTimeout(t));
        oneShotTimers.clear();
        document.documentElement.classList.remove('bc-active');
        document.body.classList.remove('blip-cursor-active');
        removeDom();
    }

    function evaluateActivation() {
        if (!isActive) return;
        if (shouldRun()) start();
        else stop();
    }

    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(evaluateActivation, 150);
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

    function init() {
        if (isActive) return;
        if (typeof window === 'undefined' || !window.matchMedia) return;
        isActive = true;

        mqCoarse = window.matchMedia('(pointer: coarse)');
        mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        addMqListener(mqCoarse, evaluateActivation);
        addMqListener(mqReduced, evaluateActivation);
        window.addEventListener('resize', onResize, { passive: true });

        themeObserver = new MutationObserver(syncTheme);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

        if (shouldRun()) start();
    }

    function destroy() {
        if (!isActive) return;
        isActive = false;
        stop();
        removeMqListener(mqCoarse, evaluateActivation);
        removeMqListener(mqReduced, evaluateActivation);
        window.removeEventListener('resize', onResize);
        clearTimeout(resizeTimer);
        resizeTimer = null;
        if (themeObserver) themeObserver.disconnect();
        themeObserver = null;
        mqCoarse = null;
        mqReduced = null;
    }

    const SVG_MARKUP = `<svg class="bc-svg" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g class="bc-anim"><g class="bc-anim2"><g class="bc-bf bc-b-n"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="6" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="15" y="12" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="16" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="17" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="17" y="15" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="17" y="16" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="17" y="18" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/><rect x="17" y="19" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/><rect x="17" y="20" width="1" height="1"/><rect x="6" y="21" width="1" height="1"/><rect x="17" y="21" width="1" height="1"/><rect x="6" y="22" width="12" height="1"/><rect x="8" y="23" width="3" height="1"/><rect x="14" y="23" width="3" height="1"/><rect x="8" y="24" width="3" height="1"/><rect x="14" y="24" width="3" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="7" y="10" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="7" y="12" width="1" height="1"/><rect x="13" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="7" y="16" width="1" height="1"/><rect x="7" y="18" width="1" height="1"/><rect x="7" y="20" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="8" y="10" width="3" height="1"/><rect x="8" y="12" width="5" height="1"/><rect x="8" y="14" width="8" height="1"/><rect x="8" y="16" width="8" height="1"/><rect x="8" y="18" width="8" height="1"/><rect x="8" y="20" width="1" height="1"/><rect x="10" y="20" width="1" height="1"/><rect x="12" y="20" width="1" height="1"/><rect x="14" y="20" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/><rect x="14" y="12" width="1" height="1"/></g><g class="bc-c-l1"><rect x="7" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="7" y="11" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="7" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="7" y="19" width="1" height="1"/></g><g class="bc-c-g1"><rect x="8" y="9" width="2" height="1"/><rect x="8" y="11" width="4" height="1"/><rect x="8" y="13" width="8" height="1"/><rect x="8" y="15" width="8" height="1"/><rect x="8" y="17" width="8" height="1"/><rect x="8" y="19" width="7" height="1"/><rect x="7" y="21" width="1" height="1"/></g><g class="bc-c-d2"><rect x="16" y="14" width="1" height="1"/><rect x="16" y="16" width="1" height="1"/><rect x="16" y="18" width="1" height="1"/><rect x="9" y="20" width="1" height="1"/><rect x="11" y="20" width="1" height="1"/><rect x="13" y="20" width="1" height="1"/><rect x="15" y="20" width="1" height="1"/></g><g class="bc-c-d1"><rect x="16" y="15" width="1" height="1"/><rect x="16" y="17" width="1" height="1"/><rect x="15" y="19" width="2" height="1"/><rect x="8" y="21" width="7" height="1"/></g><g class="bc-c-z2"><rect x="16" y="20" width="1" height="1"/></g><g class="bc-c-z1"><rect x="15" y="21" width="2" height="1"/></g></g><g class="bc-bf bc-b-sq"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="6" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="16" y="12" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="18" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="18" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="18" y="15" width="1" height="1"/><rect x="5" y="16" width="1" height="1"/><rect x="18" y="16" width="1" height="1"/><rect x="5" y="17" width="1" height="1"/><rect x="18" y="17" width="1" height="1"/><rect x="5" y="18" width="1" height="1"/><rect x="18" y="18" width="1" height="1"/><rect x="5" y="19" width="1" height="1"/><rect x="18" y="19" width="1" height="1"/><rect x="5" y="20" width="1" height="1"/><rect x="18" y="20" width="1" height="1"/><rect x="5" y="21" width="14" height="1"/><rect x="7" y="22" width="3" height="1"/><rect x="15" y="22" width="3" height="1"/><rect x="7" y="23" width="3" height="1"/><rect x="15" y="23" width="3" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="7" y="10" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="7" y="12" width="1" height="1"/><rect x="14" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="8" y="10" width="3" height="1"/><rect x="8" y="12" width="6" height="1"/><rect x="8" y="14" width="9" height="1"/><rect x="7" y="16" width="10" height="1"/><rect x="7" y="18" width="9" height="1"/><rect x="6" y="20" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/><rect x="15" y="12" width="1" height="1"/></g><g class="bc-c-l1"><rect x="7" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="7" y="11" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="7" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/></g><g class="bc-c-g1"><rect x="8" y="9" width="2" height="1"/><rect x="8" y="11" width="4" height="1"/><rect x="8" y="13" width="9" height="1"/><rect x="8" y="15" width="9" height="1"/><rect x="7" y="17" width="10" height="1"/><rect x="7" y="19" width="1" height="1"/><rect x="9" y="19" width="1" height="1"/><rect x="11" y="19" width="1" height="1"/><rect x="13" y="19" width="1" height="1"/><rect x="15" y="19" width="1" height="1"/></g><g class="bc-c-d1"><rect x="17" y="13" width="1" height="1"/><rect x="17" y="15" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/><rect x="8" y="19" width="1" height="1"/><rect x="10" y="19" width="1" height="1"/><rect x="12" y="19" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/><rect x="16" y="19" width="1" height="1"/></g><g class="bc-c-d2"><rect x="17" y="14" width="1" height="1"/><rect x="17" y="16" width="1" height="1"/><rect x="16" y="18" width="2" height="1"/><rect x="7" y="20" width="9" height="1"/></g><g class="bc-c-z1"><rect x="17" y="19" width="1" height="1"/></g><g class="bc-c-z2"><rect x="16" y="20" width="2" height="1"/></g></g><g class="bc-bf bc-b-cl"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="5" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="4" y="10" width="1" height="1"/><rect x="14" y="10" width="1" height="1"/><rect x="3" y="11" width="1" height="1"/><rect x="16" y="11" width="1" height="1"/><rect x="3" y="12" width="1" height="1"/><rect x="18" y="12" width="1" height="1"/><rect x="3" y="13" width="1" height="1"/><rect x="18" y="13" width="1" height="1"/><rect x="2" y="14" width="1" height="1"/><rect x="19" y="14" width="1" height="1"/><rect x="2" y="15" width="1" height="1"/><rect x="19" y="15" width="1" height="1"/><rect x="2" y="16" width="1" height="1"/><rect x="19" y="16" width="1" height="1"/><rect x="2" y="17" width="1" height="1"/><rect x="19" y="17" width="1" height="1"/><rect x="2" y="18" width="1" height="1"/><rect x="19" y="18" width="1" height="1"/><rect x="2" y="19" width="18" height="1"/><rect x="5" y="20" width="3" height="1"/><rect x="15" y="20" width="3" height="1"/><rect x="5" y="21" width="3" height="1"/><rect x="15" y="21" width="3" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="5" y="10" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="4" y="12" width="1" height="1"/><rect x="3" y="14" width="1" height="1"/><rect x="3" y="16" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="6" y="10" width="6" height="1"/><rect x="5" y="12" width="12" height="1"/><rect x="4" y="14" width="14" height="1"/><rect x="4" y="16" width="13" height="1"/><rect x="3" y="18" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="15" y="11" width="1" height="1"/></g><g class="bc-c-l1"><rect x="6" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="4" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="4" y="13" width="1" height="1"/><rect x="3" y="15" width="1" height="1"/><rect x="3" y="17" width="1" height="1"/></g><g class="bc-c-g1"><rect x="7" y="9" width="3" height="1"/><rect x="5" y="11" width="9" height="1"/><rect x="5" y="13" width="12" height="1"/><rect x="4" y="15" width="14" height="1"/><rect x="4" y="17" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="8" y="17" width="1" height="1"/><rect x="10" y="17" width="1" height="1"/><rect x="12" y="17" width="1" height="1"/><rect x="14" y="17" width="1" height="1"/><rect x="16" y="17" width="1" height="1"/></g><g class="bc-c-d2"><rect x="17" y="12" width="1" height="1"/><rect x="18" y="14" width="1" height="1"/><rect x="17" y="16" width="2" height="1"/><rect x="4" y="18" width="13" height="1"/></g><g class="bc-c-d1"><rect x="17" y="13" width="1" height="1"/><rect x="18" y="15" width="1" height="1"/><rect x="5" y="17" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="9" y="17" width="1" height="1"/><rect x="11" y="17" width="1" height="1"/><rect x="13" y="17" width="1" height="1"/><rect x="15" y="17" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/></g><g class="bc-c-z1"><rect x="18" y="17" width="1" height="1"/></g><g class="bc-c-z2"><rect x="17" y="18" width="2" height="1"/></g></g><g class="bc-bf bc-b-st"><g class="bc-c-k"><rect x="6" y="8" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/><rect x="6" y="9" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="13" y="10" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="14" y="11" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="15" y="12" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="15" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="15" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="15" y="15" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="15" y="16" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="15" y="17" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="15" y="18" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/><rect x="15" y="19" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/><rect x="15" y="20" width="1" height="1"/><rect x="6" y="21" width="1" height="1"/><rect x="15" y="21" width="1" height="1"/><rect x="6" y="22" width="1" height="1"/><rect x="15" y="22" width="1" height="1"/><rect x="6" y="23" width="1" height="1"/><rect x="15" y="23" width="1" height="1"/><rect x="6" y="24" width="10" height="1"/><rect x="8" y="25" width="2" height="1"/><rect x="13" y="25" width="2" height="1"/><rect x="8" y="26" width="2" height="1"/><rect x="13" y="26" width="2" height="1"/></g><g class="bc-c-l2"><rect x="7" y="8" width="1" height="1"/><rect x="9" y="8" width="1" height="1"/><rect x="7" y="10" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="7" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="7" y="16" width="1" height="1"/><rect x="7" y="18" width="1" height="1"/><rect x="7" y="20" width="1" height="1"/><rect x="7" y="22" width="1" height="1"/></g><g class="bc-c-g2"><rect x="8" y="8" width="1" height="1"/><rect x="8" y="10" width="3" height="1"/><rect x="8" y="12" width="7" height="1"/><rect x="8" y="14" width="6" height="1"/><rect x="8" y="16" width="6" height="1"/><rect x="8" y="18" width="6" height="1"/><rect x="8" y="20" width="6" height="1"/><rect x="8" y="22" width="1" height="1"/><rect x="10" y="22" width="1" height="1"/><rect x="12" y="22" width="1" height="1"/></g><g class="bc-c-w"><rect x="10" y="8" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/></g><g class="bc-c-l1"><rect x="7" y="9" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="7" y="11" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="7" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="7" y="19" width="1" height="1"/><rect x="7" y="21" width="1" height="1"/></g><g class="bc-c-g1"><rect x="8" y="9" width="2" height="1"/><rect x="8" y="11" width="4" height="1"/><rect x="8" y="13" width="6" height="1"/><rect x="8" y="15" width="6" height="1"/><rect x="8" y="17" width="6" height="1"/><rect x="8" y="19" width="6" height="1"/><rect x="8" y="21" width="5" height="1"/><rect x="7" y="23" width="1" height="1"/></g><g class="bc-c-d1"><rect x="14" y="13" width="1" height="1"/><rect x="14" y="15" width="1" height="1"/><rect x="14" y="17" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/><rect x="13" y="21" width="2" height="1"/><rect x="8" y="23" width="6" height="1"/></g><g class="bc-c-d2"><rect x="14" y="14" width="1" height="1"/><rect x="14" y="16" width="1" height="1"/><rect x="14" y="18" width="1" height="1"/><rect x="14" y="20" width="1" height="1"/><rect x="9" y="22" width="1" height="1"/><rect x="11" y="22" width="1" height="1"/><rect x="13" y="22" width="1" height="1"/></g><g class="bc-c-z2"><rect x="14" y="22" width="1" height="1"/></g><g class="bc-c-z1"><rect x="14" y="23" width="1" height="1"/></g></g><g class="bc-bf bc-b-lean"><g class="bc-c-k"><rect x="5" y="8" width="1" height="1"/><rect x="10" y="8" width="1" height="1"/><rect x="5" y="9" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="5" y="10" width="1" height="1"/><rect x="12" y="10" width="1" height="1"/><rect x="5" y="11" width="1" height="1"/><rect x="13" y="11" width="1" height="1"/><rect x="5" y="12" width="1" height="1"/><rect x="14" y="12" width="1" height="1"/><rect x="5" y="13" width="1" height="1"/><rect x="16" y="13" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="17" y="14" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/><rect x="17" y="15" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="17" y="16" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><rect x="17" y="17" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="17" y="18" width="1" height="1"/><rect x="6" y="19" width="1" height="1"/><rect x="17" y="19" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/><rect x="17" y="20" width="1" height="1"/><rect x="6" y="21" width="1" height="1"/><rect x="17" y="21" width="1" height="1"/><rect x="6" y="22" width="12" height="1"/><rect x="7" y="23" width="3" height="1"/><rect x="14" y="23" width="3" height="1"/><rect x="7" y="24" width="3" height="1"/><rect x="14" y="24" width="3" height="1"/></g><g class="bc-c-l2"><rect x="6" y="8" width="1" height="1"/><rect x="8" y="8" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="10" y="10" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="12" y="12" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="7" y="16" width="1" height="1"/><rect x="7" y="18" width="1" height="1"/><rect x="7" y="20" width="1" height="1"/></g><g class="bc-c-g2"><rect x="7" y="8" width="1" height="1"/><rect x="7" y="10" width="3" height="1"/><rect x="7" y="12" width="5" height="1"/><rect x="8" y="14" width="8" height="1"/><rect x="8" y="16" width="8" height="1"/><rect x="8" y="18" width="8" height="1"/><rect x="8" y="20" width="1" height="1"/><rect x="10" y="20" width="1" height="1"/><rect x="12" y="20" width="1" height="1"/><rect x="14" y="20" width="1" height="1"/></g><g class="bc-c-w"><rect x="9" y="8" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="12" y="11" width="1" height="1"/><rect x="13" y="12" width="1" height="1"/></g><g class="bc-c-l1"><rect x="6" y="9" width="1" height="1"/><rect x="9" y="9" width="1" height="1"/><rect x="6" y="11" width="1" height="1"/><rect x="11" y="11" width="1" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="7" y="15" width="1" height="1"/><rect x="7" y="17" width="1" height="1"/><rect x="7" y="19" width="1" height="1"/></g><g class="bc-c-g1"><rect x="7" y="9" width="2" height="1"/><rect x="7" y="11" width="4" height="1"/><rect x="7" y="13" width="9" height="1"/><rect x="8" y="15" width="8" height="1"/><rect x="8" y="17" width="8" height="1"/><rect x="8" y="19" width="7" height="1"/><rect x="7" y="21" width="1" height="1"/></g><g class="bc-c-d2"><rect x="16" y="14" width="1" height="1"/><rect x="16" y="16" width="1" height="1"/><rect x="16" y="18" width="1" height="1"/><rect x="9" y="20" width="1" height="1"/><rect x="11" y="20" width="1" height="1"/><rect x="13" y="20" width="1" height="1"/><rect x="15" y="20" width="1" height="1"/></g><g class="bc-c-d1"><rect x="16" y="15" width="1" height="1"/><rect x="16" y="17" width="1" height="1"/><rect x="15" y="19" width="2" height="1"/><rect x="8" y="21" width="7" height="1"/></g><g class="bc-c-z2"><rect x="16" y="20" width="1" height="1"/></g><g class="bc-c-z1"><rect x="15" y="21" width="2" height="1"/></g></g><g class="bc-paw bc-paw-up"><g class="bc-c-k"><rect x="17" y="11" width="4" height="1"/><rect x="17" y="12" width="1" height="1"/><rect x="20" y="12" width="1" height="1"/><rect x="17" y="13" width="1" height="1"/><rect x="20" y="13" width="1" height="1"/><rect x="17" y="14" width="4" height="1"/></g><g class="bc-c-g1"><rect x="18" y="12" width="2" height="1"/><rect x="18" y="13" width="2" height="1"/><rect x="18" y="15" width="2" height="1"/></g></g><g class="bc-paw bc-paw-dn"><g class="bc-c-g1"><rect x="18" y="15" width="1" height="1"/><rect x="20" y="16" width="2" height="1"/><rect x="20" y="17" width="2" height="1"/></g><g class="bc-c-k"><rect x="19" y="15" width="4" height="1"/><rect x="19" y="16" width="1" height="1"/><rect x="22" y="16" width="1" height="1"/><rect x="19" y="17" width="1" height="1"/><rect x="22" y="17" width="1" height="1"/><rect x="19" y="18" width="4" height="1"/></g></g><g class="bc-face"><g class="bc-e bc-e-n"><g class="bc-c-w"><rect x="9" y="13" width="1" height="1"/><rect x="13" y="13" width="1" height="1"/></g><g class="bc-c-k"><rect x="10" y="13" width="1" height="1"/><rect x="14" y="13" width="1" height="1"/><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/><rect x="9" y="15" width="2" height="1"/><rect x="13" y="15" width="2" height="1"/></g></g><g class="bc-e bc-e-wide"><g class="bc-c-w"><rect x="9" y="12" width="2" height="1"/><rect x="13" y="12" width="2" height="1"/></g><g class="bc-c-k"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/><rect x="9" y="15" width="2" height="1"/><rect x="13" y="15" width="2" height="1"/></g></g><g class="bc-lid bc-lid-1"><g class="bc-c-g1"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/></g></g><g class="bc-lid bc-lid-2"><g class="bc-c-g1"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/></g><g class="bc-c-g2"><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/></g></g><g class="bc-lid bc-lid-3"><g class="bc-c-g1"><rect x="9" y="13" width="2" height="1"/><rect x="13" y="13" width="2" height="1"/></g><g class="bc-c-g2"><rect x="9" y="14" width="2" height="1"/><rect x="13" y="14" width="2" height="1"/></g><g class="bc-c-k"><rect x="9" y="15" width="2" height="1"/><rect x="13" y="15" width="2" height="1"/></g></g><g class="bc-blush"><g class="bc-c-a"><rect x="8" y="16" width="1" height="1"/><rect x="14" y="16" width="1" height="1"/></g></g><g class="bc-blush-warm"><g class="bc-c-a"><rect x="7" y="16" width="1" height="1"/><rect x="15" y="16" width="1" height="1"/></g></g><g class="bc-m bc-m-smirk"><g class="bc-c-k"><rect x="13" y="17" width="1" height="1"/><rect x="9" y="18" width="4" height="1"/></g></g><g class="bc-m bc-m-o"><g class="bc-c-k"><rect x="10" y="17" width="3" height="1"/><rect x="10" y="18" width="3" height="1"/></g></g></g></g></g><g class="bc-tip"><g class="bc-t bc-t-n"><g class="bc-c-k"><rect x="6" y="3" width="1" height="1"/><rect x="6" y="4" width="2" height="1"/><rect x="6" y="5" width="1" height="1"/><rect x="8" y="5" width="1" height="1"/><rect x="6" y="6" width="1" height="1"/><rect x="9" y="6" width="1" height="1"/><rect x="6" y="7" width="1" height="1"/><rect x="10" y="7" width="1" height="1"/></g><g class="bc-c-tw"><rect x="7" y="5" width="1" height="1"/><rect x="7" y="6" width="2" height="1"/><rect x="9" y="7" width="1" height="1"/></g><g class="bc-c-tl"><rect x="7" y="7" width="2" height="1"/></g></g><g class="bc-t bc-t-ext"><g class="bc-c-k"><rect x="5" y="2" width="1" height="1"/><rect x="5" y="3" width="2" height="1"/><rect x="5" y="4" width="1" height="1"/><rect x="7" y="4" width="1" height="1"/><rect x="5" y="5" width="1" height="1"/><rect x="8" y="5" width="1" height="1"/><rect x="5" y="6" width="1" height="1"/><rect x="9" y="6" width="1" height="1"/><rect x="5" y="7" width="1" height="1"/><rect x="9" y="7" width="1" height="1"/></g><g class="bc-c-tw"><rect x="6" y="4" width="1" height="1"/><rect x="6" y="5" width="2" height="1"/><rect x="7" y="6" width="2" height="1"/><rect x="8" y="7" width="1" height="1"/></g><g class="bc-c-tl"><rect x="6" y="6" width="1" height="1"/><rect x="6" y="7" width="2" height="1"/></g></g></g><g class="bc-fx"><rect class="bc-sp bc-sp-1 bc-c-tw" x="5" y="2" width="1" height="1"/><rect class="bc-sp bc-sp-2 bc-c-a"  x="4" y="4" width="1" height="1"/><rect class="bc-sp bc-sp-3 bc-c-tl" x="7" y="1" width="1" height="1"/><g class="bc-zpos" transform="translate(15,6)"><g class="bc-z bc-z1"><g class="bc-c-fx"><rect x="0" y="0" width="4" height="1"/><rect x="2" y="1" width="1" height="1"/><rect x="1" y="2" width="1" height="1"/><rect x="0" y="3" width="4" height="1"/></g></g></g><g class="bc-zpos" transform="translate(17.5,2.5)"><g class="bc-z bc-z2"><g class="bc-c-fx"><rect x="0" y="0" width="5" height="1"/><rect x="3" y="1" width="1" height="1"/><rect x="2" y="2" width="1" height="1"/><rect x="1" y="3" width="1" height="1"/><rect x="0" y="4" width="5" height="1"/></g></g></g></g></svg>`;

    return {
        init,
        destroy,
        get isActive() { return isActive; },
        get isRunning() { return isRunning; }
    };
})();

// Export for use in other modules
window.BlipCursor = BlipCursor;
