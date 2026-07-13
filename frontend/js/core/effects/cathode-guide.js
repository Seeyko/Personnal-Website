/**
 * Cathode-Guide Module
 * Cathode (the site's CRT mascot) is the site's living guide: she reacts to
 * whichever section is in view (typed, i18n'd speech bubble on first visit,
 * then that section's idle animation), and between reactions she lives her
 * own life along the bottom edge of the viewport - strolling, spinning,
 * hopping, and (when the visitor lingers in one spot) climbing on the site's
 * furniture: project cards squish under her, timeline commits become
 * stepping stones.
 *
 * Built on top of the vendor "guide-kit" (see /frontend/css/cathode-guide.css):
 * that stylesheet owns every kit animation/keyframe (cg-* classes, compiled
 * from beat tables - never hand-edit it). This module creates the DOM,
 * watches scroll position via IntersectionObserver, toggles state classes +
 * injects the bubble text per the kit's class API (cg-enter / cg-enter-boot /
 * cg-idle-* / cg-exit / cg-off), and drives the "life" layer: the root
 * element's transform (position along the floor / on top of perches) plus
 * the site-integration classes cg-alive/cg-walking/cg-jumping/cg-landing/
 * cg-spinning, which live below the kit marker in the stylesheet.
 *
 * Sections observed: hero (.hero), #now, #work, #writing, #timeline, #about,
 * #contact. Any section missing from the current page (e.g. #writing isn't
 * on index.html yet) is simply skipped - the module never assumes a fixed
 * page shape.
 */
const CathodeGuide = (() => {
    const STORAGE_KEY = 'cathode-guide-off';
    const TOGGLE_BTN_ID = 'cathode-guide-toggle';
    const MOBILE_QUERY = '(max-width: 899px)';
    const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
    const THEMES = ['terminal', 'default', 'blueprint', 'retro90s'];

    // Sections the guide reacts to, in document order. `bar` is the little
    // tab label shown in the bubble's title bar, adapted to each theme's
    // fiction (unix tab / drawing number / 90s filename / plain word).
    const SECTION_DEFS = [
        { key: 'hero', selector: '.hero', bar: { terminal: 'guide.sh', default: 'bonjour', blueprint: 'PLAN A-00', retro90s: 'welcome.htm' } },
        { key: 'now', selector: '#now', bar: { terminal: 'now --live', default: 'en ce moment', blueprint: 'REV. COURANTE', retro90s: 'news.gif' } },
        { key: 'work', selector: '#work', bar: { terminal: 'work.log', default: 'projets', blueprint: 'COUPE B-02', retro90s: 'cool-stuff.htm' } },
        { key: 'writing', selector: '#writing', bar: { terminal: 'blog.md', default: 'notes', blueprint: 'CARTOUCHE C-03', retro90s: 'zine.txt' } },
        { key: 'timeline', selector: '#timeline', bar: { terminal: 'git log', default: 'parcours', blueprint: 'PHASAGE D-04', retro90s: 'history.htm' } },
        { key: 'about', selector: '#about', bar: { terminal: 'whoami', default: 'qui suis-je', blueprint: 'DÉTAIL E-05', retro90s: 'aboutme.htm' } },
        { key: 'contact', selector: '#contact', bar: { terminal: 'ping', default: 'contact', blueprint: 'ANNEXE F-06', retro90s: 'guestbook.htm' } }
    ];
    const SECTION_MAP = SECTION_DEFS.reduce((m, s) => { m[s.key] = s; return m; }, {});
    const MOBILE_ALLOWED = ['hero', 'contact'];

    // Terminal keeps the "$ / >" prompt fiction; the other themes speak in
    // their own voice, without a fake shell prompt.
    const LINE_PREFIX = {
        terminal: { first: '$ ', next: '> ' },
        default: { first: '', next: '' },
        blueprint: { first: '', next: '' },
        retro90s: { first: '', next: '' }
    };

    // Bubble typewriter timing - matches the kit's own CSS timing contract
    // (steps() duration + stagger), see guide-kit SPEC.md.
    const CHAR_MS = 34;
    const LINE_GAP_MS = 150;
    const MAX_LINE_CHARS = 24; // + 2-char "$ "/"> " prefix = kit's 26ch limit
    const BUBBLE_VISIBLE_MS = 7000;

    let isActive = false;      // init()/destroy() guard
    let mounted = false;       // root exists in the DOM (not dismissed)
    let offState = false;      // 'cg-off' shell (powered down, still visible)

    let root = null;
    let bubbleEl = null;
    let barEl = null;
    let bodyEl = null;
    let spriteEl = null;

    let sectionObserver = null;
    let mqMobile = null;
    let mqReduced = null;

    let currentSectionKey = null;
    let hasBooted = false;      // the CRT power-on entrance plays once, not per section
    const visited = new Set();
    const timers = new Set();

    let toggleBtn = null;
    let toggleHandler = null;
    let spriteClickHandler = null;
    let spriteKeyHandler = null;
    let languageHandler = null;
    let reducedHandler = null;

    function isMobile() {
        return !!(mqMobile && mqMobile.matches);
    }

    function prefersReduced() {
        return !!(mqReduced && mqReduced.matches);
    }

    function clearTimers() {
        timers.forEach(id => clearTimeout(id));
        timers.clear();
    }

    function setTimer(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
        timers.add(id);
        return id;
    }

    function currentLang() {
        return (window.LanguageManager && LanguageManager.currentLang) || 'fr';
    }

    function currentTheme() {
        const t = document.body && document.body.dataset ? document.body.dataset.theme : null;
        return THEMES.indexOf(t) !== -1 ? t : 'default';
    }

    // Per-theme copy with graceful fallback: cathodeGuide.themes.<theme>.<key>
    // first, then the generic cathodeGuide.<key> used before theming existed.
    function sectionText(key) {
        if (!window.LanguageManager || !LanguageManager.isLoaded) return null;
        const themedKey = 'cathodeGuide.themes.' + currentTheme() + '.' + key;
        const themed = LanguageManager.t(themedKey);
        if (themed && typeof themed === 'string' && themed !== themedKey) return themed;
        const baseKey = 'cathodeGuide.' + key;
        const base = LanguageManager.t(baseKey);
        return (base && typeof base === 'string' && base !== baseKey) ? base : null;
    }

    // Greedy word-wrap into lines the kit can type out (<=26ch incl. prefix).
    // The line prefixes are themed (terminal keeps its "$ / >" prompt).
    function wrapLines(text, maxLines) {
        const words = String(text || '').trim().split(/\s+/).filter(Boolean);
        const raw = [];
        let cur = '';
        words.forEach(w => {
            const trial = cur ? cur + ' ' + w : w;
            if (trial.length > MAX_LINE_CHARS && cur) {
                raw.push(cur);
                cur = w;
            } else {
                cur = trial;
            }
        });
        if (cur) raw.push(cur);
        const limited = maxLines ? raw.slice(0, maxLines) : raw;
        const prefix = LINE_PREFIX[currentTheme()] || LINE_PREFIX.terminal;
        return limited.map((l, i) => (i === 0 ? prefix.first : prefix.next) + l);
    }

    function fillBubble(barTitle, text) {
        if (!bodyEl || !barEl) return false;
        barEl.textContent = barTitle;
        bodyEl.innerHTML = '';
        // 3 lines everywhere: she lives on the floor now, there's always
        // vertical room, and truncating mid-sentence reads like a bug.
        const lines = wrapLines(text, 3);
        let delay = 0;
        lines.forEach(line => {
            const span = document.createElement('span');
            span.className = 'cg-line';
            span.textContent = line;
            span.style.setProperty('--cg-chars', String(line.length));
            span.style.setProperty('--cg-delay', delay + 'ms');
            delay += line.length * CHAR_MS + LINE_GAP_MS;
            bodyEl.appendChild(span);
        });
        return true;
    }

    function renderBubbleContent(key) {
        const def = SECTION_MAP[key];
        const text = sectionText(key);
        if (!text) return false;
        const bar = def && def.bar ? (def.bar[currentTheme()] || def.bar.terminal) : 'guide.sh';
        return fillBubble(bar, text);
    }

    function showBubble(key) {
        if (!bubbleEl) return;
        if (!renderBubbleContent(key)) return;
        bubbleOwner = 'section';
        bubbleEl.classList.remove('cg-hide');
        bubbleEl.classList.add('cg-show');
    }

    function hideBubble() {
        if (!bubbleEl) return;
        bubbleOwner = null;
        bubbleEl.classList.remove('cg-show');
        bubbleEl.classList.add('cg-hide');
    }

    function setIdle(key) {
        if (!root) return;
        SECTION_DEFS.forEach(s => root.classList.remove('cg-idle-' + s.key));
        root.classList.add('cg-idle-' + key);
    }

    // Plays the kit's documented entry sequence (see SPEC.md "Séquence
    // d'intégration recommandée"): pop/boot -> bubble at +400ms (hero:
    // +2800ms) -> drop the entry class once it's finished -> auto-hide the
    // bubble ~7s after it appeared. Under prefers-reduced-motion the kit CSS
    // collapses every animation to a static pose immediately (see its
    // dedicated media block), so there is no reason to make the visitor wait
    // through the fake 3s boot / 1.7s pop before the bubble can appear.
    function playEnter(key, withBubble) {
        if (!root) return;
        const reduced = prefersReduced();
        offState = false;
        root.classList.remove('cg-off', 'cg-exit');
        const enterCls = key === 'hero' ? 'cg-enter-boot' : 'cg-enter';
        root.classList.remove('cg-enter', 'cg-enter-boot');
        void root.offsetWidth; // force reflow so the animation (re)starts clean
        root.classList.add(enterCls);
        setIdle(key);

        const enterEnd = reduced ? 50 : (key === 'hero' ? 3100 : 1700);
        setTimer(() => { if (root) root.classList.remove(enterCls); }, enterEnd);

        if (withBubble) {
            const bubbleAt = reduced ? 150 : (key === 'hero' ? 2800 : 400);
            setTimer(() => showBubble(key), bubbleAt);
            setTimer(() => hideBubble(), bubbleAt + BUBBLE_VISIBLE_MS);
        }
    }

    function onSectionChange(key) {
        if (currentSectionKey === key) return;
        currentSectionKey = key;
        if (!mounted) return; // dismissed - just remember where the visitor is

        if (isMobile() && MOBILE_ALLOWED.indexOf(key) === -1) {
            // Keep the small-screen footprint minimal: idle keeps running
            // quietly on whatever state it already had, no bubble noise.
            return;
        }
        if (offState) return; // powered off - only a click/toggle brings it back

        clearTimers();
        // Whatever was showing belonged to the section we're leaving - close
        // it before reacting to the new one. Without this, cancelling the
        // previous section's pending auto-hide timer (clearTimers, above)
        // combined with a revisit's "no bubble" branch would leave a stale
        // bubble stuck open indefinitely with the wrong text. Guarded on
        // cg-show so a pristine bubble (nothing shown yet) never plays a
        // phantom close animation.
        if (bubbleEl && bubbleEl.classList.contains('cg-show')) hideBubble();
        const firstVisit = !visited.has(key);
        visited.add(key);

        if (firstVisit) {
            // She has something to say: stop strolling and say it in place.
            if (alive && (lifeState === 'walk' || lifeState === 'stand')) {
                setLifeState('stand');
                nextThinkAt = performance.now() + 3000;
            }
            if (!hasBooted) {
                // Very first reaction of the visit: the full TV pop / boot entrance.
                hasBooted = true;
                playEnter(key, true);
            } else {
                // Every later new section: she's already on screen, so don't
                // replay the power-on animation (that read as if she reloaded on
                // each scroll). Just switch to this section's idle look and let
                // her say her line, no reflow-restarted pop/boot.
                root.classList.remove('cg-enter', 'cg-enter-boot', 'cg-exit');
                setIdle(key);
                setTimer(() => showBubble(key), prefersReduced() ? 0 : 200);
                setTimer(() => hideBubble(), (prefersReduced() ? 0 : 200) + BUBBLE_VISIBLE_MS);
            }
        } else {
            // Section revisited: screen state still updates, but quietly -
            // no re-entry pop, no repeat bubble.
            root.classList.remove('cg-enter', 'cg-enter-boot', 'cg-exit');
            setIdle(key);
        }
    }

    function buildObserver() {
        sectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const key = entry.target.getAttribute('data-cg-section');
                if (key) onSectionChange(key);
            });
        }, { root: null, rootMargin: '-45% 0px -45% 0px', threshold: 0 });

        SECTION_DEFS.forEach(def => {
            const el = document.querySelector(def.selector);
            if (!el) return; // section not present on this page - skip silently
            el.setAttribute('data-cg-section', def.key);
            sectionObserver.observe(el);
        });
    }

    function onSpriteClick() {
        if (offState) reinvoke();
        else powerOff();
    }

    function onSpriteKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            onSpriteClick();
        }
    }

    function mountRoot() {
        if (root) return;
        root = document.createElement('div');
        root.id = 'cathode-guide';
        root.setAttribute('role', 'img');
        root.setAttribute('aria-label', currentLang() === 'en' ? 'Cathode, the site guide' : 'Cathode, le guide du site');
        root.innerHTML = BUBBLE_HTML + SPRITE_HTML;

        bubbleEl = root.querySelector('.cg-bubble');
        barEl = bubbleEl.querySelector('.cg-bar b');
        bodyEl = bubbleEl.querySelector('.cg-body');
        bodyEl.setAttribute('aria-live', 'polite');
        spriteEl = root.querySelector('.cg-sprite');
        spriteEl.setAttribute('role', 'button');
        spriteEl.setAttribute('tabindex', '0');
        spriteEl.setAttribute('aria-label', currentLang() === 'en' ? 'Turn Cathode off' : 'Éteindre Cathode');

        spriteClickHandler = onSpriteClick;
        spriteKeyHandler = onSpriteKeydown;
        spriteEl.addEventListener('click', spriteClickHandler);
        spriteEl.addEventListener('keydown', spriteKeyHandler);

        document.body.appendChild(root);
        mounted = true;
    }

    function unmountRoot() {
        if (spriteEl) {
            if (spriteClickHandler) spriteEl.removeEventListener('click', spriteClickHandler);
            if (spriteKeyHandler) spriteEl.removeEventListener('keydown', spriteKeyHandler);
        }
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = null;
        bubbleEl = null;
        barEl = null;
        bodyEl = null;
        spriteEl = null;
        crackEl = null; // lived inside .cg-sprite, gone with the root
        mounted = false;
    }

    function powerOff() {
        if (!root) return;
        clearTimers();
        offState = true;
        hideBubble();
        // Powered-down TVs don't sit on shelves they climbed onto: put her
        // back on the floor before the sag animation plays. Physics states
        // (tumble/dizzy/rest) keep their spot - gravity doesn't care that
        // the screen is off, and teleporting her would look far worse.
        if (alive) {
            cancelScene();
            jumpArc = null;
            if (perchEl) {
                perchEl.classList.remove('cg-perch-squish', 'cg-perch-release');
                perchEl = null;
            }
            if (lifeState !== 'tumble' && lifeState !== 'dizzy' && lifeState !== 'rest') {
                py = 0;
                setLifeState('stand');
            }
            setFace(null);
            root.classList.remove('cg-walking', 'cg-jumping', 'cg-landing', 'cg-spinning');
            applyLifeTransform();
        }
        root.classList.remove('cg-enter', 'cg-enter-boot', 'cg-exit');
        root.classList.add('cg-off');
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    }

    // Brings Cathode back, either via a re-click on its own dark shell or via
    // the footer "[cathode --on]" fallback (see kit SPEC "Dismiss / ré-invocation").
    function reinvoke() {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        if (!mounted) mountRoot();
        clearTimers();
        offState = false;
        const key = currentSectionKey || 'hero';
        root.classList.remove('cg-off', 'cg-exit');
        void root.offsetWidth;
        root.classList.add('cg-enter');
        setIdle(key);
        setTimer(() => { if (root) root.classList.remove('cg-enter'); }, prefersReduced() ? 50 : 1700);
        evaluateLife();
        if (alive) nextThinkAt = performance.now() + 2500;
    }

    function bindToggleButton() {
        toggleBtn = document.getElementById(TOGGLE_BTN_ID);
        if (!toggleBtn) return;
        toggleHandler = () => { if (!mounted || offState) reinvoke(); };
        toggleBtn.addEventListener('click', toggleHandler);
    }

    /* ==================== Life engine ====================
       Cathode's autonomous layer. The stylesheet's site-integration zone
       pins the root to left:0/bottom:0 once cg-alive is set, so this engine
       owns her position through a single translate3d: px along the floor,
       py above it (0 = feet on the floor line). Kit animations all live on
       inner elements, so the root transform never fights them.

       She strolls, spins and hops on her own; when the visitor lingers
       without scrolling she climbs the furniture (cards squish on landing,
       timeline commits are stepping stones) and hops back down the moment
       the page moves under her. Reduced motion keeps the engine off - the
       static docked position from the stylesheet then applies unchanged. */

    const LIFE = {
        WALK_SPEED: 46,              // px/s stroll speed
        EDGE_PAD: 10,                // min gap to the viewport edges
        CTA_CLEARANCE: 150,          // keep clear of the bottom-right floating CTA
        IDLE_BEFORE_CLIMB_MS: 9000,  // visitor inactivity before she climbs things
        HOP_TILT: 13,                // deg she rocks onto the pushing foot mid-hop
        PERCH_SELECTOR: '.project-card, .git-commit-marker, .mobile-commit, .now-card, .about-card, .contact-card, .hero-cta',
        QUIP_CHANCE: 0.65,
        QUIP_VISIBLE_MS: 4600
    };

    /* Gyroscope physics (phones). Gravity is projected onto the page plane:
       a gentle tilt makes her lean and slide, a steep one knocks her off her
       feet into a full 2D tumble - she rolls, bounces off all four viewport
       walls, and settles wherever gravity says "down" now is (flip the phone
       and the ceiling becomes her floor). Violent impacts can crack her
       screen; Blip is the repairman. All units: px, s, and g as a 0..1
       fraction of full gravity in the page plane. */
    const GYRO = {
        // Direction thresholds are on the *unit* in-plane gravity (nx):
        // 0.14 ≈ an 8° felt slope, 0.5 ≈ 30° - past that she loses footing.
        LEAN_ONLY: 0.06,     // below SLIDE but above this: she just leans
        SLIDE: 0.14,         // enough felt slope to drag her along the floor
        TUMBLE: 0.5,         // she can't keep her feet anymore
        PERCH_SLIP: 0.3,     // perched grip starts failing
        G: 2300,             // px/s² under full in-plane gravity
        RESTITUTION: 0.38,   // wall bounce energy
        FLOOR_DRAG: 3.2,     // tangential friction against the resting wall (1/s)
        AIR_DRAG: 0.25,      // while airborne (1/s)
        SETTLE_SPEED: 30,    // px/s: below this against the floor she can settle
        SETTLE_MS: 550,
        BUMP_SPEED: 170,     // impact speed worth a squash + dust
        BREAK_SPEED: 820,    // a *hard* impact; two of those in one tumble may crack
        BREAK_COOLDOWN: 90000,
        SHAKE_ACCEL: 16,     // m/s² (devicemotion, gravity removed) = a real shake
        STALE_MS: 1500       // no orientation data newer than this: gyro idle
    };

    const MEET = {
        DIST: 96,            // px between Blip's hotspot and her center
        HOLD_MS: 350,        // sustained closeness before a scene starts
        COOLDOWN: 16000,
        CHECK_EVERY: 180     // proximity poll period inside the rAF loop
    };

    // Gyro state
    let gyroBound = false;
    let gyroPermHooked = false;
    let gyroGranted = false;
    let gyroAskRef = null;
    let gvx = 0, gvy = 0;        // gravity vector, page coords (x right, y down)
    let gyroAt = -1e9;           // perf-clock time of the last orientation event
    let velX = 0, velY = 0;      // free-body velocity (tumble; velX doubles for slide)
    let pyTop = 0;               // top coord (viewport px) while off the bottom floor
    let rot = 0;                 // sprite rotation shown via --cg-rot
    let angVel = 0;              // deg/s while tumbling
    let leanShown = 0;           // smoothed standing lean
    let restEdge = 'bottom';     // which wall she's resting against
    let settledMs = 0;
    let perchSlipMs = 0;
    let bumpCooldownAt = 0;
    let hardBumps = 0;           // brutal impacts within the current tumble

    // Screen break / repair state
    let broken = false;
    let lastBreakAt = -1e9;
    let nextSosAt = 0;
    let repairing = false;
    let crackEl = null;

    // Meet (Blip) state
    let meetNearMs = 0;
    let meetCooldownUntil = 0;
    let meetCheckAt = 0;
    let sceneToken = 0;          // bumping it aborts a scene's pending steps
    let fxLayer = null;
    const lastLineIdx = {};      // anti-repeat per i18n path

    let alive = false;
    let lifeRaf = null;
    let lifeLastTs = 0;
    let px = 20;                 // left offset of the root, viewport px
    let py = 0;                  // feet height above the floor line
    let dir = 1;                 // 1 facing right, -1 facing left
    let lifeState = 'stand';     // stand | walk | jump | perch
    let walkTarget = 0;
    let jumpArc = null;          // {fromX,fromY,toX,toY,start,dur,peak,perch}
    let perchEl = null;
    let perchHops = 0;
    let hopDir = 0;              // timeline crossing direction (+1/-1, 0 = not crossing)
    let hopFoot = 1;             // which "foot" pushes off next - flips every stone hop
    let jumpTilt = 0;            // current airborne lean (deg) - the skip rock
    let nextThinkAt = 0;
    let lastUserAct = 0;
    let climbCooldownUntil = 0;  // pause between climb sessions - she's alive, not manic
    let floorBase = 20;
    let floorProbeAt = -1;
    let bubbleOwner = null;      // 'section' | 'quip' - who opened the bubble
    const lifeTimers = new Set();
    const lifeHandlers = {};

    function lifeSetTimeout(fn, ms) {
        const id = setTimeout(() => { lifeTimers.delete(id); fn(); }, ms);
        lifeTimers.add(id);
        return id;
    }

    function spriteSize() {
        return root ? (root.offsetWidth || 74) : 74;
    }

    function lifeMaxX() {
        return Math.max(LIFE.EDGE_PAD, window.innerWidth - spriteSize() - LIFE.CTA_CLEARANCE);
    }

    // The floor line: the old docked insets (20px desktop / 12px mobile),
    // raised above any fixed bottom bar a theme installs (retro90s status bar).
    function probeFloor(now) {
        if (now - floorProbeAt < 1000 && floorProbeAt >= 0) return;
        floorProbeAt = now;
        let base = window.innerWidth < 900 ? 12 : 20;
        const bar = document.querySelector('.retro-status-bar');
        if (bar && bar.offsetHeight) base = Math.max(base, bar.offsetHeight + 6);
        floorBase = base;
    }

    function applyLifeTransform() {
        if (!root) return;
        root.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + (-currentYGap()).toFixed(1) + 'px,0)';
        root.style.setProperty('--cg-dir', dir < 0 ? '-1' : '1');
        // One rotation channel: tumble rotation (full), the skip rock while
        // hopping across stones, or the standing lean (small) otherwise.
        let shown;
        if (lifeState === 'tumble' || lifeState === 'dizzy' || lifeState === 'rest') shown = rot;
        else if (lifeState === 'jump') shown = leanShown + jumpTilt;
        else shown = leanShown;
        root.style.setProperty('--cg-rot', shown.toFixed(2) + 'deg');
        // Bubble opens toward the roomy side of the screen - and downward
        // when she's high up (resting on the ceiling, tall perches).
        root.classList.toggle('cg-bub-right', px + spriteSize() / 2 > window.innerWidth / 2);
        root.classList.toggle('cg-bub-below', window.innerHeight - currentYGap() - spriteSize() < 150);
    }

    function setLifeState(s) {
        lifeState = s;
        if (!root) return;
        root.classList.toggle('cg-walking', s === 'walk');
        root.classList.toggle('cg-jumping', s === 'jump');
        root.classList.toggle('cg-sliding', s === 'slide');
        root.classList.toggle('cg-tumbling', s === 'tumble' || s === 'dizzy' || s === 'rest');
    }

    function bubbleShowing() {
        return !!(bubbleEl && bubbleEl.classList.contains('cg-show'));
    }

    function startWalk(now) {
        const lo = LIFE.EDGE_PAD, hi = lifeMaxX();
        if (hi - lo < 40) { setLifeState('stand'); nextThinkAt = now + 2200; return; }
        // Short strolls (≤ ~340px) keep her decisions frequent — a full
        // viewport crossing would lock her out of reacting for ~30s.
        const reach = 120 + Math.random() * 220;
        walkTarget = Math.min(hi, Math.max(lo, px + (Math.random() < 0.5 ? -reach : reach)));
        if (Math.abs(walkTarget - px) < 30) walkTarget = px > (lo + hi) / 2 ? px - reach : px + reach;
        walkTarget = Math.min(hi, Math.max(lo, walkTarget));
        dir = walkTarget > px ? 1 : -1;
        setLifeState('walk');
    }

    function playSpin() {
        if (!root) return;
        root.classList.remove('cg-spinning');
        void root.offsetWidth;
        root.classList.add('cg-spinning');
        lifeSetTimeout(() => { if (root) root.classList.remove('cg-spinning'); }, 980);
    }

    function startSpin(now) {
        setLifeState('stand');
        playSpin();
        nextThinkAt = now + 1500 + Math.random() * 1400;
    }

    // Both timeline layouts are "stepping stones over water": the desktop
    // horizontal markers (.git-commit-marker) and the mobile vertical commit
    // cards (.mobile-commit), which replace them below 1024px. The desktop
    // markers are display:none on mobile, so without the mobile class she'd
    // have nothing on the timeline to hop across on a phone.
    function isTimelineStone(el) {
        return !!(el && el.classList &&
            (el.classList.contains('git-commit-marker') || el.classList.contains('mobile-commit')));
    }

    function startJump(toX, toY, perch, now) {
        const dist = Math.hypot(toX - px, toY - py);
        // Timeline commits are stepping stones over water, and she crosses the
        // whole run of them like a kid skipping across a pond: quick, springy
        // hops in close succession, rocking onto the opposite foot each time
        // (see hopFoot -> jumpTilt). Snappy and light, not a slow careful hop.
        // Every other perch (cards, CTAs) keeps the plain default hop.
        const steppingStone = isTimelineStone(perch);
        const dur = steppingStone
            ? Math.min(560, 300 + dist * 0.5)
            : Math.min(950, 420 + dist * 0.55);
        const peak = steppingStone
            ? 40 + Math.min(78, dist * 0.3)
            : 36 + Math.min(90, dist * 0.22);
        if (steppingStone) hopFoot = -hopFoot;
        jumpArc = {
            fromX: px, fromY: py, toX, toY, perch: perch || null,
            start: now, dur, peak, foot: steppingStone ? hopFoot : 0
        };
        if (Math.abs(toX - px) > 4) dir = toX >= px ? 1 : -1;
        setLifeState('jump');
    }

    function perchTop(el) {
        const r = el.getBoundingClientRect();
        return {
            x: r.left + r.width / 2 - spriteSize() / 2,
            y: (window.innerHeight - r.top) - floorBase - 3
        };
    }

    function perchCandidates() {
        const els = document.querySelectorAll(LIFE.PERCH_SELECTOR);
        const out = [];
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el === perchEl) continue;
            const r = el.getBoundingClientRect();
            if (!r.width || r.width < 40 || !r.height) continue;
            // Reachable band: below the fixed header, high enough that she
            // (and her bubble) still fit above the perch.
            if (r.top < 80 || r.top > window.innerHeight - 120) continue;
            const cx = r.left + r.width / 2;
            if (cx < 20 || cx > window.innerWidth - 20) continue;
            out.push(el);
        }
        return out;
    }

    function pickPerch() {
        const c = perchCandidates();
        if (!c.length) return null;
        c.sort((a, b) =>
            Math.abs(a.getBoundingClientRect().left - px) -
            Math.abs(b.getBoundingClientRect().left - px));
        return c[Math.floor(Math.random() * Math.min(3, c.length))];
    }

    // The next stepping stone along the travel direction `dir` (+1 = right on
    // the desktop row / down the mobile list, -1 = the other way). Desktop
    // markers sit in a horizontal row, the mobile commit cards stack
    // vertically; either way she keeps to that one rail and only ever steps
    // forward, so a crossing runs cleanly from one end to the other without
    // bouncing between two neighbours. dir 0 falls back to nearest either way.
    function nextMarkerFrom(el, dir) {
        if (!isTimelineStone(el)) return null;
        const mobile = el.classList.contains('mobile-commit');
        const from = el.getBoundingClientRect();
        const fromPos = mobile ? from.top : from.left;
        let best = null, bestGap = Infinity;
        perchCandidates().forEach(cand => {
            if (cand === el) return;
            if (mobile ? !cand.classList.contains('mobile-commit')
                       : !cand.classList.contains('git-commit-marker')) return;
            const r = cand.getBoundingClientRect();
            // Stay on the rail: ignore stones drifting off the perpendicular axis.
            if (mobile ? Math.abs(r.left - from.left) > 60
                       : Math.abs(r.top - from.top) > 220) return;
            const gap = (mobile ? r.top : r.left) - fromPos;
            const along = dir ? gap * dir : Math.abs(gap); // only forward when dir set
            if (along > 24 && along < 480 && along < bestGap) {
                best = cand;
                bestGap = along;
            }
        });
        return best;
    }

    // The visible timeline stones in travel order (left->right on the desktop
    // row, top->bottom down the mobile list). Null unless there's a real run.
    function timelineStonesInOrder() {
        const stones = perchCandidates().filter(isTimelineStone);
        if (stones.length < 2) return null;
        const mobile = stones[0].classList.contains('mobile-commit');
        stones.sort((a, b) => {
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            return mobile ? ra.top - rb.top : ra.left - rb.left;
        });
        return { stones, mobile };
    }

    // Start a crossing at the end nearest her and head for the far end, so one
    // run skips across the whole line of stones. Returns {entry, dir} or null.
    function pickTimelineRun() {
        const run = timelineStonesInOrder();
        if (!run) return null;
        const { stones, mobile } = run;
        const first = stones[0], last = stones[stones.length - 1];
        const axis = (el) => {
            const r = el.getBoundingClientRect();
            return mobile ? r.top + r.height / 2 : r.left + r.width / 2;
        };
        // She lives on the floor: on the vertical mobile list the nearest end
        // is the bottom one; on the desktop row it's whichever end her x is by.
        const myPos = mobile ? window.innerHeight : px + spriteSize() / 2;
        const nearFirst = Math.abs(axis(first) - myPos) <= Math.abs(axis(last) - myPos);
        return nearFirst ? { entry: first, dir: 1 } : { entry: last, dir: -1 };
    }

    function squishPerch(el) {
        if (!el) return;
        el.classList.add('cg-perch-squish');
        lifeSetTimeout(() => {
            el.classList.remove('cg-perch-squish');
            el.classList.add('cg-perch-release');
            lifeSetTimeout(() => el.classList.remove('cg-perch-release'), 380);
        }, 300);
    }

    // Themed line arrays under a cathodeGuide.* path (quips, meet, gyro...).
    function themedLines(pathBase) {
        if (!window.LanguageManager || !LanguageManager.isLoaded) return null;
        const v = LanguageManager.t(pathBase + '.' + currentTheme());
        return Array.isArray(v) && v.length ? v : null;
    }

    // Throwaway speech (owner 'quip'): never talks over a section bubble,
    // and its auto-hide never closes someone else's bubble.
    function speakLine(text, visibleMs) {
        if (!bubbleEl || bubbleShowing() || offState) return false;
        const def = SECTION_MAP[currentSectionKey];
        const bar = def && def.bar ? (def.bar[currentTheme()] || def.bar.terminal) : 'cathode';
        if (!fillBubble(bar, text)) return false;
        bubbleOwner = 'quip';
        bubbleEl.classList.remove('cg-hide');
        bubbleEl.classList.add('cg-show');
        lifeSetTimeout(() => { if (bubbleOwner === 'quip') hideBubble(); }, visibleMs || LIFE.QUIP_VISIBLE_MS);
        return true;
    }

    function speakFrom(pathBase, visibleMs) {
        const arr = themedLines(pathBase);
        if (!arr) return false;
        let idx;
        do { idx = Math.floor(Math.random() * arr.length); } while (arr.length > 1 && idx === lastLineIdx[pathBase]);
        lastLineIdx[pathBase] = idx;
        return speakLine(arr[idx], visibleMs);
    }

    // A short perched one-liner, in the current theme's voice.
    function maybeQuip() {
        if (broken || Math.random() > LIFE.QUIP_CHANCE) return;
        speakFrom('cathodeGuide.quips');
    }

    function landJump(now) {
        px = jumpArc.toX;
        py = jumpArc.toY;
        const perch = jumpArc.perch;
        jumpArc = null;
        jumpTilt = 0;
        if (root) {
            root.classList.add('cg-landing');
            lifeSetTimeout(() => { if (root) root.classList.remove('cg-landing'); }, 340);
        }
        if (perch && document.contains(perch)) {
            perchEl = perch;
            perchHops++;
            setLifeState('perch');
            squishPerch(perch);
            // Mid-crossing she barely touches down before the next hop, so the
            // run reads as a continuous skip across every stone. Only when she
            // has arrived somewhere to stay (a card, or the far end of the
            // timeline) does she take the long, relaxed dwell.
            const crossing = hopDir && isTimelineStone(perch) && nextMarkerFrom(perch, hopDir);
            if (crossing) {
                nextThinkAt = now + 120 + Math.random() * 110;
            } else {
                nextThinkAt = now + 3800 + Math.random() * 3200;
                lifeSetTimeout(maybeQuip, 520);
            }
        } else {
            perchEl = null;
            py = 0;
            setLifeState('stand');
            nextThinkAt = now + 900 + Math.random() * 2000;
        }
    }

    function hopDown(now) {
        perchEl = null;
        hopDir = 0; // back on the floor: the crossing is over
        const lo = LIFE.EDGE_PAD, hi = lifeMaxX();
        const tx = Math.min(hi, Math.max(lo, px + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 60)));
        startJump(tx, 0, null, now);
    }

    function think(now) {
        if (!alive || !root) return;
        if (offState) { nextThinkAt = now + 2500; return; }
        if (bubbleShowing() && bubbleOwner === 'section') { nextThinkAt = now + 1500; return; }

        if (lifeState === 'perch') {
            // On the timeline she commits to the whole crossing: straight on to
            // the next stone along the way, no dawdling, until she runs out -
            // then a little victory spin and down onto the floor.
            if (hopDir && isTimelineStone(perchEl)) {
                const next = nextMarkerFrom(perchEl, hopDir);
                if (next) {
                    const p = perchTop(next);
                    startJump(p.x, p.y, next, now);
                } else {
                    // Reached the far bank: a victory spin, then step down on
                    // the next beat (hopDir is 0 now, so that beat takes the
                    // ordinary card/CTA branch below and hops her onto the floor).
                    playSpin();
                    hopDir = 0;
                    nextThinkAt = now + 1100 + Math.random() * 400;
                    climbCooldownUntil = now + 9000 + Math.random() * 9000;
                }
                return;
            }
            // On a card / CTA: a beat, maybe a spin, then back down.
            if (Math.random() < 0.25) {
                playSpin(); // a little victory spin right there on the perch
                nextThinkAt = now + 2500 + Math.random() * 2500;
                return;
            }
            hopDown(now);
            climbCooldownUntil = now + 8000 + Math.random() * 9000;
            return;
        }

        // The visitor has settled somewhere: time to climb on things. If the
        // timeline is in view she skips across the whole run of stones;
        // otherwise she picks a nearby perch to sit on.
        if (!broken && now - lastUserAct > LIFE.IDLE_BEFORE_CLIMB_MS && now > climbCooldownUntil) {
            const run = pickTimelineRun();
            if (run) {
                perchHops = 0;
                hopDir = run.dir;
                const p = perchTop(run.entry);
                startJump(p.x, p.y, run.entry, now);
                return;
            }
            const target = pickPerch();
            if (target) {
                perchHops = 0;
                hopDir = 0;
                const p = perchTop(target);
                startJump(p.x, p.y, target, now);
                return;
            }
        }

        // Mid-walk check found nothing to climb: just keep strolling.
        if (lifeState === 'walk') {
            nextThinkAt = now + 2000;
            return;
        }

        // A broken screen kills the joie de vivre: no spins, no hops, no
        // climbing - just slow sad pacing until Blip shows up with his tools.
        if (broken) {
            if (Math.random() < 0.4) startWalk(now);
            else { setLifeState('stand'); nextThinkAt = now + 2400 + Math.random() * 3000; }
            return;
        }

        const r = Math.random();
        if (r < 0.48) {
            startWalk(now);
        } else if (r < 0.60) {
            startSpin(now);
        } else if (r < 0.72) {
            const tx = Math.min(lifeMaxX(), Math.max(LIFE.EDGE_PAD, px + (Math.random() - 0.5) * 90));
            startJump(tx, 0, null, now); // playful little hop
        } else {
            setLifeState('stand');
            nextThinkAt = now + 1600 + Math.random() * 3200;
        }
    }

    function lifeTick(ts) {
        if (!alive) return;
        lifeRaf = requestAnimationFrame(lifeTick);
        if (!lifeLastTs) lifeLastTs = ts;
        let dt = (ts - lifeLastTs) / 1000;
        lifeLastTs = ts;
        if (dt > 0.05) dt = 0.05; // tab-return / freeze clamp
        probeFloor(ts);

        const gv = gravityNow();
        const onFloorState = lifeState === 'stand' || lifeState === 'walk' || lifeState === 'slide';

        // --- Gravity triggers -------------------------------------------
        if (gv.live && onFloorState) {
            if (dominantEdge(gv) !== 'bottom' || Math.abs(gv.nx) > GYRO.TUMBLE) {
                // Floor isn't "down" anymore, or the slope is hopeless: tumble.
                enterTumble(ts, velX, 0);
            } else if (Math.abs(gv.nx) > GYRO.SLIDE && lifeState !== 'slide') {
                cancelScene();
                setLifeState('slide');
            }
        }
        if (gv.live && lifeState === 'perch') {
            if (Math.abs(gv.nx) > GYRO.TUMBLE || dominantEdge(gv) !== 'bottom') {
                enterTumble(ts, gv.x * 220, -60);
            } else if (Math.abs(gv.nx) > GYRO.PERCH_SLIP) {
                perchSlipMs += dt * 1000;
                if (perchSlipMs > 500) { perchSlipMs = 0; hopDown(ts); }
            } else {
                perchSlipMs = 0;
            }
        }

        // Standing lean: she leans with the slope (and into her slide).
        let leanTarget = 0;
        if (onFloorState && gv.live) leanTarget = Math.max(-14, Math.min(14, gv.nx * 24));
        if (lifeState === 'slide') leanTarget += Math.max(-8, Math.min(8, velX * 0.03));
        leanShown += (leanTarget - leanShown) * Math.min(1, dt * 9);

        // --- States -------------------------------------------------------
        if (lifeState === 'walk') {
            px += LIFE.WALK_SPEED * dt * dir;
            if ((dir > 0 && px >= walkTarget) || (dir < 0 && px <= walkTarget)) {
                px = walkTarget;
                setLifeState('stand');
                nextThinkAt = ts + 900 + Math.random() * 2600;
            } else if (ts > nextThinkAt && ts - lastUserAct > LIFE.IDLE_BEFORE_CLIMB_MS) {
                think(ts); // the visitor settled mid-stroll: allowed to climb now
            }
        } else if (lifeState === 'slide') {
            velX += gv.x * GYRO.G * 0.62 * dt;
            velX -= velX * 2.2 * dt; // ground friction
            px += velX * dt;
            const lo = 4, hi = window.innerWidth - spriteSize() - 4;
            if (px <= lo || px >= hi) {
                const impact = Math.abs(velX);
                px = Math.max(lo, Math.min(hi, px));
                velX = -velX * GYRO.RESTITUTION;
                if (impact > GYRO.BUMP_SPEED && ts > bumpCooldownAt) {
                    bumpCooldownAt = ts + 250;
                    root.classList.add('cg-landing');
                    lifeSetTimeout(() => { if (root) root.classList.remove('cg-landing'); }, 300);
                    const c = spriteCenter();
                    spawnFx(px <= lo ? px + 4 : px + spriteSize() - 4, c.y, 'dust', 3, { spread: 10 });
                    setFace('cg-face-ouch', 420);
                }
            }
            if (Math.abs(velX) > 20) dir = velX > 0 ? 1 : -1;
            if ((!gv.live || Math.abs(gv.nx) < GYRO.LEAN_ONLY) && Math.abs(velX) < 18) {
                velX = 0;
                setLifeState('stand');
                nextThinkAt = ts + 700 + Math.random() * 1200;
            }
        } else if (lifeState === 'tumble') {
            tumbleStep(dt, ts);
        } else if (lifeState === 'dizzy') {
            // Settle into the wall's resting pose (enterDizzy normalized rot
            // so this lerp takes the short way); the woozy wobble is CSS.
            rot += (restRotFor(restEdge) - rot) * Math.min(1, dt * 8);
            if (ts > nextThinkAt) leaveDizzy(ts);
        } else if (lifeState === 'rest') {
            // Glued to a non-bottom wall while gravity pins her there.
            if (!gv.live || dominantEdge(gv) === 'bottom') {
                enterTumble(ts, 0, 0); // gravity flipped back: fall home
            } else if (dominantEdge(gv) !== restEdge) {
                enterTumble(ts, 0, 0);
            }
        } else if (lifeState === 'meet') {
            // Scenes drive everything via timers; just keep her grounded.
            if (py > 0 && !perchEl) py = Math.max(0, py - 500 * dt);
        } else if (lifeState === 'jump' && jumpArc) {
            const t = Math.min(1, (ts - jumpArc.start) / jumpArc.dur);
            const e = t * (2 - t); // ease-out on the horizontal
            px = jumpArc.fromX + (jumpArc.toX - jumpArc.fromX) * e;
            py = jumpArc.fromY + (jumpArc.toY - jumpArc.fromY) * t + jumpArc.peak * 4 * t * (1 - t);
            // Skip rock: lean onto the pushing foot at the apex, alternating
            // each stone hop (foot flips in startJump), so she reads as hopping
            // leg over leg. Zero at take-off and landing, zero for plain hops.
            jumpTilt = (jumpArc.foot || 0) * LIFE.HOP_TILT * Math.sin(Math.PI * t);
            if (t >= 1) landJump(ts);
        } else if (lifeState === 'perch') {
            if (!perchEl || !document.contains(perchEl)) {
                perchEl = null;
                py = 0;
                setLifeState('stand');
            } else {
                const r = perchEl.getBoundingClientRect();
                const cx = r.left + r.width / 2;
                // Perches can move under her (page scroll is caught as user
                // activity, but the timeline pans horizontally inside its own
                // scroller): bail out before she gets carried off-screen.
                if (!r.width || r.top < 60 || r.top > window.innerHeight - 60 ||
                    cx < 30 || cx > window.innerWidth - 30) {
                    hopDown(ts);
                } else {
                    // Ride the perch (hover lifts, reveal animations...).
                    const tx = r.left + r.width / 2 - spriteSize() / 2;
                    const ty = (window.innerHeight - r.top) - floorBase - 3;
                    px += (tx - px) * 0.3;
                    py += (ty - py) * 0.3;
                }
            }
            if (ts > nextThinkAt) think(ts);
        } else {
            if (py > 0) py = Math.max(0, py - 900 * dt); // safety: settle down
            if (ts > nextThinkAt) think(ts);
        }

        meetCheck(ts);
        brokenBeacon(ts);
        applyLifeTransform();
    }

    // The page just moved/acted under her: rects are stale, get off the
    // furniture. Also feeds the "visitor is busy" clock that gates climbing.
    function onUserActivity() {
        lastUserAct = performance.now();
        if (lifeState === 'meet') cancelScene(); // may hand back a perch state
        if (lifeState === 'perch') {
            hopDown(lastUserAct);
        } else if (lifeState === 'jump' && jumpArc && jumpArc.perch) {
            jumpArc.perch = null; // retarget mid-air: land on the floor instead
            jumpArc.toY = 0;
            jumpArc.foot = 0;     // straighten out - the crossing is interrupted
            hopDir = 0;
        }
        // Tumble/dizzy/rest are pure physics against the viewport - scrolling
        // the page beneath her doesn't disturb them.
    }

    function onLifeResize() {
        px = Math.min(Math.max(LIFE.EDGE_PAD, px), Math.max(LIFE.EDGE_PAD, window.innerWidth - spriteSize() - LIFE.EDGE_PAD));
        floorProbeAt = -1;
    }

    function lifeAllowed() {
        return mounted && !prefersReduced();
    }

    function startLife() {
        if (alive || !lifeAllowed() || !root) return;
        alive = true;
        px = window.innerWidth < 900 ? 12 : 20;
        py = 0;
        dir = 1;
        lastUserAct = performance.now();
        nextThinkAt = performance.now() + 2500;
        lifeLastTs = 0;
        floorProbeAt = -1;
        probeFloor(0);
        root.classList.add('cg-alive');
        setLifeState('stand');
        applyLifeTransform();
        lifeHandlers.scroll = onUserActivity;
        lifeHandlers.wheel = onUserActivity;
        lifeHandlers.touchmove = onUserActivity;
        lifeHandlers.keydown = onUserActivity;
        lifeHandlers.resize = onLifeResize;
        window.addEventListener('scroll', lifeHandlers.scroll, { passive: true });
        window.addEventListener('wheel', lifeHandlers.wheel, { passive: true });
        window.addEventListener('touchmove', lifeHandlers.touchmove, { passive: true });
        window.addEventListener('keydown', lifeHandlers.keydown);
        window.addEventListener('resize', lifeHandlers.resize);
        hookGyroPermission(); // attaches right away except on iOS (gesture-gated)
        lifeRaf = requestAnimationFrame(lifeTick);
    }

    function stopLife() {
        if (!alive) return;
        alive = false;
        sceneToken++;
        repairing = false;
        if (lifeRaf) cancelAnimationFrame(lifeRaf);
        lifeRaf = null;
        lifeTimers.forEach(id => clearTimeout(id));
        lifeTimers.clear();
        detachGyro();
        if (gyroAskRef) {
            document.removeEventListener('touchend', gyroAskRef);
            gyroAskRef = null;
            gyroPermHooked = false;
        }
        ['scroll', 'wheel', 'touchmove', 'keydown', 'resize'].forEach(k => {
            if (lifeHandlers[k]) window.removeEventListener(k, lifeHandlers[k]);
            delete lifeHandlers[k];
        });
        jumpArc = null;
        if (perchEl) {
            perchEl.classList.remove('cg-perch-squish', 'cg-perch-release');
            perchEl = null;
        }
        if (root) {
            py = 0; // never freeze mid-air
            rot = 0;
            leanShown = 0;
            setFace(null);
            setLifeState('stand');
            root.classList.remove('cg-walking', 'cg-jumping', 'cg-landing', 'cg-spinning',
                'cg-sliding', 'cg-tumbling', 'cg-fixed-flash');
            applyLifeTransform();
        }
    }

    /* ---------- FX particles (hearts, stars, dust, sparks) ----------
       Tiny pixel-art SVGs in a fixed full-screen layer just under Cathode.
       Everything is fire-and-forget: CSS animates, animationend removes. */

    const FX_SHAPES = {
        heart: '<svg viewBox="0 0 7 6"><path d="M1 0h2v1h1V0h2v1h1v2h-1v1h-1v1h-1v1h-1V5h-1V4H1V3H0V1h1z"/></svg>',
        star: '<svg viewBox="0 0 5 5"><path d="M2 0h1v2h2v1H3v2H2V3H0V2h2z"/></svg>',
        dust: '<svg viewBox="0 0 3 3"><path d="M0 0h2v2H0z"/></svg>',
        spark: '<svg viewBox="0 0 5 5"><path d="M2 0h1v1h1v1h1v1H4v1H3v1H2V4H1V3H0V2h1V1h1z"/></svg>'
    };
    const FX_HEART_COLOR = {
        terminal: '#33ff00', default: '#e0685e', blueprint: '#ff8aa8', retro90s: '#ff00aa'
    };

    function fxColor(kind) {
        if (kind === 'heart') return FX_HEART_COLOR[currentTheme()] || '#e0685e';
        return (root && getComputedStyle(root).getPropertyValue('--cg-ink').trim()) || '#33ff00';
    }

    function ensureFxLayer() {
        if (fxLayer && document.contains(fxLayer)) return fxLayer;
        fxLayer = document.createElement('div');
        fxLayer.id = 'cathode-fx';
        fxLayer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(fxLayer);
        return fxLayer;
    }

    // kind: heart|star|dust|spark; opts.spread px, opts.up bias, opts.orbit
    function spawnFx(x, y, kind, count, opts) {
        if (prefersReduced()) return;
        const layer = ensureFxLayer();
        const o = opts || {};
        for (let i = 0; i < count; i++) {
            const p = document.createElement('i');
            p.className = 'cg-fx cg-fx-' + (o.orbit ? 'orbit' : 'float');
            p.innerHTML = FX_SHAPES[kind] || FX_SHAPES.star;
            const spread = o.spread || 26;
            const dx = (Math.random() - 0.5) * spread * 2;
            const rise = (o.up === false ? 8 : 34) + Math.random() * 26;
            p.style.left = (x + dx) + 'px';
            p.style.top = (y + (Math.random() - 0.5) * (o.spread || 26)) + 'px';
            p.style.color = fxColor(kind);
            p.style.setProperty('--fx-dx', ((Math.random() - 0.5) * 30).toFixed(1) + 'px');
            p.style.setProperty('--fx-dy', (-rise).toFixed(1) + 'px');
            p.style.setProperty('--fx-dur', (700 + Math.random() * 600).toFixed(0) + 'ms');
            p.style.setProperty('--fx-delay', (i * (o.stagger || 40)) + 'ms');
            p.style.setProperty('--fx-size', (o.size || (kind === 'dust' ? 5 : 8)) + 'px');
            if (o.orbit) p.style.setProperty('--fx-angle', (i * (360 / count)).toFixed(0) + 'deg');
            p.addEventListener('animationend', () => { if (p.parentNode) p.parentNode.removeChild(p); });
            layer.appendChild(p);
            // Backstop removal in case animationend is swallowed (display:none tab)
            lifeSetTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 3200);
        }
    }

    function spriteCenter() {
        const s = spriteSize();
        return { x: px + s / 2, y: window.innerHeight - currentYGap() - s / 2 };
    }

    /* ---------- Facial expressions (mimiques) ----------
       Forced looks layered over the kit's idle faces via site-integration
       classes; mutually exclusive, optionally self-clearing. */

    const FACE_CLASSES = ['cg-face-happy', 'cg-face-heart', 'cg-face-ouch', 'cg-face-dizzy'];

    function setFace(cls, ms) {
        if (!root) return;
        FACE_CLASSES.forEach(c => root.classList.remove(c));
        if (cls) {
            root.classList.add(cls);
            if (ms) lifeSetTimeout(() => { if (root) root.classList.remove(cls); }, ms);
        }
    }

    /* ---------- Gyroscope: gravity in the page plane ----------
       deviceorientation beta/gamma → unit gravity vector (gvx right, gvy
       down), corrected for the browser's own screen rotation. Held upright
       ⇒ (0, 1); rolled left ⇒ gravity points left; phone upside down ⇒
       gravity points to the page's top edge. */

    function onDeviceOrientation(e) {
        if (e.beta == null || e.gamma == null) return;
        const b = e.beta * Math.PI / 180;
        const g = e.gamma * Math.PI / 180;
        // Gravity in device frame (x right, y up-screen), projected on-screen
        let dx = Math.sin(g) * Math.cos(b);
        let dy = Math.sin(b); // device +y is up-screen; page +y is down: flip below
        const angle = (screen.orientation && typeof screen.orientation.angle === 'number')
            ? screen.orientation.angle
            : (typeof window.orientation === 'number' ? window.orientation : 0);
        const a = -angle * Math.PI / 180;
        gvx = dx * Math.cos(a) - dy * Math.sin(a);
        gvy = dx * Math.sin(a) + dy * Math.cos(a);
        gyroAt = performance.now();
    }

    // A hard shake kicks her airborne - and shaking harder WHILE she
    // tumbles pumps energy in instead of being ignored, which is exactly
    // how screens end up cracked.
    function onDeviceMotion(e) {
        const acc = e.acceleration;
        if (!acc || acc.x == null) return;
        const mag = Math.hypot(acc.x, acc.y || 0);
        if (mag < GYRO.SHAKE_ACCEL) return;
        const now = performance.now();
        if (lifeState === 'tumble') {
            velX += -acc.x * 20 + (Math.random() - 0.5) * 60;
            velY += -(acc.y || 0) * 16 - 60;
            angVel += (Math.random() - 0.5) * 300;
            return;
        }
        if (now < bumpCooldownAt) return;
        enterTumble(now,
            -acc.x * 24 + (Math.random() - 0.5) * 80,
            -Math.abs(acc.y || 0) * 18 - 160);
    }

    function gyroLive() {
        return performance.now() - gyroAt < GYRO.STALE_MS;
    }

    // In-plane gravity with a default "page down" when the phone lies flat
    // (real gravity then points into the screen and the page has no pull).
    // x/y drive the physics (strength included); nx/ny are the unit
    // direction - thresholds use those, so "how tilted does it FEEL" doesn't
    // depend on how far back the phone is pitched.
    function gravityNow() {
        if (!gyroLive()) return { x: 0, y: 1, nx: 0, ny: 1, live: false };
        const mag = Math.hypot(gvx, gvy);
        if (mag < 0.22) return { x: 0, y: 0.7, nx: 0, ny: 1, live: false };
        return { x: gvx, y: gvy, nx: gvx / mag, ny: gvy / mag, live: true };
    }

    function attachGyro() {
        if (gyroBound || typeof window.DeviceOrientationEvent === 'undefined') return;
        gyroBound = true;
        lifeHandlers.deviceorientation = onDeviceOrientation;
        window.addEventListener('deviceorientation', lifeHandlers.deviceorientation, { passive: true });
        if (typeof window.DeviceMotionEvent !== 'undefined') {
            lifeHandlers.devicemotion = onDeviceMotion;
            window.addEventListener('devicemotion', lifeHandlers.devicemotion, { passive: true });
        }
    }

    function detachGyro() {
        if (!gyroBound) return;
        gyroBound = false;
        if (lifeHandlers.deviceorientation) window.removeEventListener('deviceorientation', lifeHandlers.deviceorientation);
        if (lifeHandlers.devicemotion) window.removeEventListener('devicemotion', lifeHandlers.devicemotion);
        delete lifeHandlers.deviceorientation;
        delete lifeHandlers.devicemotion;
    }

    // iOS 13+ gates motion events behind a permission that MUST be requested
    // from a user gesture; hook the first touch. Everything stays silent if
    // the visitor declines - she simply doesn't feel gravity.
    function hookGyroPermission() {
        if (gyroPermHooked || typeof window.DeviceOrientationEvent === 'undefined') return;
        // Phones/tablets only: some convertible laptops expose the sensor
        // too, and nobody wants their mascot sliding around mid-mouse-work.
        if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
        const needsAsk = typeof DeviceOrientationEvent.requestPermission === 'function';
        if (!needsAsk || gyroGranted) { attachGyro(); return; }
        gyroPermHooked = true;
        gyroAskRef = () => {
            gyroAskRef = null;
            gyroPermHooked = false;
            const asks = [DeviceOrientationEvent.requestPermission()];
            if (typeof DeviceMotionEvent !== 'undefined' &&
                typeof DeviceMotionEvent.requestPermission === 'function') {
                asks.push(DeviceMotionEvent.requestPermission());
            }
            Promise.allSettled(asks).then(res => {
                if (res[0].status === 'fulfilled' && res[0].value === 'granted') {
                    gyroGranted = true;
                    if (alive) attachGyro();
                }
            });
        };
        document.addEventListener('touchend', gyroAskRef, { once: true, passive: true });
    }

    /* ---------- Tumble: free-body physics against the viewport ---------- */

    function currentYGap() {
        if (lifeState === 'tumble' || lifeState === 'dizzy' || lifeState === 'rest') {
            return window.innerHeight - spriteSize() - pyTop;
        }
        return floorBase + py;
    }

    function dominantEdge(gv) {
        if (Math.abs(gv.y) >= Math.abs(gv.x)) return gv.y >= 0 ? 'bottom' : 'top';
        return gv.x >= 0 ? 'right' : 'left';
    }

    // Sprite rotation so her feet touch the given wall.
    function restRotFor(edge) {
        return edge === 'bottom' ? 0 : edge === 'top' ? 180 : edge === 'left' ? 90 : -90;
    }

    function enterTumble(now, kickX, kickY) {
        if (!alive || !root) return;
        cancelScene();
        if (perchEl) {
            perchEl.classList.remove('cg-perch-squish', 'cg-perch-release');
            perchEl = null;
        }
        jumpArc = null;
        pyTop = window.innerHeight - spriteSize() - currentYGapForFloor();
        velX = (kickX != null ? kickX : velX);
        velY = (kickY != null ? kickY : 0);
        // A pinch of chaos so even a straight fall reads as a real tumble.
        angVel = velX * 2.4 + (Math.random() - 0.5) * 280;
        settledMs = 0;
        hardBumps = 0; // fresh tumble session (mid-tumble shakes don't pass here)
        setFace('cg-face-ouch', 700);
        setLifeState('tumble');
        nextThinkAt = now + 500;
    }

    function currentYGapForFloor() {
        // Y-gap as if still in floor coordinates (used only on transition in)
        return floorBase + py;
    }

    function tumbleStep(dt, ts) {
        const s = spriteSize();
        const gv = gravityNow();
        velX += gv.x * GYRO.G * dt;
        velY += gv.y * GYRO.G * dt;
        velX -= velX * GYRO.AIR_DRAG * dt;
        velY -= velY * GYRO.AIR_DRAG * dt;
        px += velX * dt;
        pyTop += velY * dt;

        const minX = 4, maxXw = window.innerWidth - s - 4;
        const minY = 4, maxYw = window.innerHeight - s - Math.max(4, floorBase - 8);
        let bumpSpeed = 0, bumpAt = null, onEdge = null;

        if (px <= minX) { bumpSpeed = Math.max(bumpSpeed, -velX); px = minX; velX = -velX * GYRO.RESTITUTION; velY *= (1 - GYRO.FLOOR_DRAG * dt); onEdge = 'left'; bumpAt = { x: px + 2, y: pyTop + s / 2 }; }
        else if (px >= maxXw) { bumpSpeed = Math.max(bumpSpeed, velX); px = maxXw; velX = -velX * GYRO.RESTITUTION; velY *= (1 - GYRO.FLOOR_DRAG * dt); onEdge = 'right'; bumpAt = { x: px + s - 2, y: pyTop + s / 2 }; }
        if (pyTop <= minY) { bumpSpeed = Math.max(bumpSpeed, -velY); pyTop = minY; velY = -velY * GYRO.RESTITUTION; velX *= (1 - GYRO.FLOOR_DRAG * dt); onEdge = 'top'; bumpAt = { x: px + s / 2, y: pyTop + 2 }; }
        else if (pyTop >= maxYw) { bumpSpeed = Math.max(bumpSpeed, velY); pyTop = maxYw; velY = -velY * GYRO.RESTITUTION; velX *= (1 - GYRO.FLOOR_DRAG * dt); onEdge = 'bottom'; bumpAt = { x: px + s / 2, y: pyTop + s - 2 }; }

        // Rolling: angular velocity follows the tangential speed against the
        // wall she's touching; airborne it just decays.
        const touchingEdge = dominantEdge(gv);
        const resting =
            (touchingEdge === 'bottom' && pyTop >= maxYw - 1) ||
            (touchingEdge === 'top' && pyTop <= minY + 1) ||
            (touchingEdge === 'left' && px <= minX + 1) ||
            (touchingEdge === 'right' && px >= maxXw - 1);
        if (resting) {
            const tangential = (touchingEdge === 'bottom') ? velX
                : (touchingEdge === 'top') ? -velX
                : (touchingEdge === 'left') ? -velY : velY;
            angVel = tangential / (s / 2) * 57.3;
        } else {
            angVel *= (1 - 0.5 * dt);
        }
        rot += angVel * dt;

        if (bumpSpeed > GYRO.BUMP_SPEED && ts > bumpCooldownAt) {
            bumpCooldownAt = ts + 220;
            root.classList.add('cg-landing');
            lifeSetTimeout(() => { if (root) root.classList.remove('cg-landing'); }, 300);
            if (bumpAt) spawnFx(bumpAt.x, bumpAt.y, 'dust', 4, { spread: 14, up: true });
            setFace('cg-face-ouch', 450);
            // Breaking the screen is a rare, earned event: it takes repeated
            // brutal impacts in one tumble (a wild shake), not a single flip.
            if (bumpSpeed > GYRO.BREAK_SPEED) {
                hardBumps++;
                if (!broken && ts - lastBreakAt > GYRO.BREAK_COOLDOWN &&
                    (hardBumps >= 3 || (hardBumps >= 2 && Math.random() < 0.5))) {
                    crackScreen(ts);
                }
            }
        }

        // Settle: slow, resting against the wall gravity points at.
        const speed = Math.hypot(velX, velY);
        if (resting && speed < GYRO.SETTLE_SPEED) {
            settledMs += dt * 1000;
            if (settledMs > GYRO.SETTLE_MS) enterDizzy(ts, touchingEdge);
        } else {
            settledMs = 0;
        }
    }

    function enterDizzy(ts, edge) {
        restEdge = edge;
        velX = velY = angVel = 0;
        // Re-express the accumulated tumble turns as the nearest equivalent
        // of the resting pose, so the dizzy branch can lerp there the short
        // way instead of unwinding three full rotations.
        const target = restRotFor(edge);
        const diff = ((target - rot) % 360 + 540) % 360 - 180;
        rot = target - diff;
        setLifeState('dizzy');
        setFace('cg-face-dizzy');
        const c = spriteCenter();
        spawnFx(c.x, c.y - spriteSize() * 0.55, 'star', 3, { orbit: true, spread: 6, size: 7 });
        speakFrom(broken ? 'cathodeGuide.gyro.broken' : (edge === 'bottom' ? 'cathodeGuide.gyro.dizzy' : 'cathodeGuide.gyro.flipped'), 3800);
        nextThinkAt = ts + 2600 + Math.random() * 1000;
    }

    // dizzy → rest (stuck to a wall) or back to normal floor life.
    function leaveDizzy(ts) {
        setFace(null);
        if (restEdge === 'bottom') {
            py = Math.max(0, window.innerHeight - spriteSize() - pyTop - floorBase);
            rot = 0;
            setLifeState('stand');
            nextThinkAt = ts + 1200 + Math.random() * 1500;
        } else {
            setLifeState('rest');
        }
    }

    /* ---------- Cracked screen + Blip the repairman ---------- */

    function crackScreen(ts) {
        broken = true;
        lastBreakAt = ts;
        nextSosAt = ts + 2500;
        if (root && !crackEl) {
            const sprite = root.querySelector('.cg-sprite');
            crackEl = document.createElement('div');
            crackEl.className = 'cg-crack';
            crackEl.innerHTML = '<svg viewBox="0 0 16 12" preserveAspectRatio="none">' +
                '<path d="M8 0 L7 3 L9 5 L6 7 L8 9 L7 12" />' +
                '<path d="M8 5 L11 4 L13 6" /><path d="M7 6 L4 8 L3 7" />' +
                '<path d="M9 5 L10 8" /></svg>';
            sprite.appendChild(crackEl);
        }
        if (root) root.classList.add('cg-broken');
        const c = spriteCenter();
        spawnFx(c.x, c.y, 'spark', 6, { spread: 18 });
    }

    // SOS beacon while broken: garbled themed lines + red LED (CSS), and on
    // touch devices Blip is summoned to hurry over on his own.
    function brokenBeacon(ts) {
        if (!broken || repairing || offState) return;
        if (ts < nextSosAt) return;
        nextSosAt = ts + 9000 + Math.random() * 5000;
        speakFrom('cathodeGuide.gyro.broken', 3600);
        if (window.BlipCursor && BlipCursor.summon) {
            const c = spriteCenter();
            BlipCursor.summon(c.x + spriteSize() * 0.9, c.y - spriteSize() * 0.4);
        }
    }

    function startRepair(ts, blipPos) {
        if (repairing || !broken) return;
        repairing = true;
        const token = ++sceneToken;
        setLifeState('meet');
        dir = blipPos.x >= px + spriteSize() / 2 ? 1 : -1;
        const step = (ms, fn) => lifeSetTimeout(() => { if (sceneToken === token && alive) fn(); }, ms);

        if (window.BlipCursor && BlipCursor.react) BlipCursor.react('wave');
        step(500, () => {
            const c = spriteCenter();
            spawnFx(c.x + dir * spriteSize() * 0.4, c.y - 6, 'spark', 5, { spread: 10, stagger: 130 });
            if (window.BlipCursor && BlipCursor.react) BlipCursor.react('wave');
        });
        step(1250, () => {
            const c = spriteCenter();
            spawnFx(c.x, c.y - 4, 'spark', 4, { spread: 12, stagger: 110 });
        });
        step(2000, () => {
            // Fixed! Screen flickers back on.
            broken = false;
            if (root) {
                root.classList.remove('cg-broken');
                root.classList.add('cg-fixed-flash');
                lifeSetTimeout(() => { if (root) root.classList.remove('cg-fixed-flash'); }, 700);
            }
            if (crackEl) {
                const el = crackEl;
                crackEl = null;
                el.classList.add('cg-crack-heal');
                lifeSetTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
            }
            setFace('cg-face-happy', 2400);
            speakFrom('cathodeGuide.gyro.fixed', 4200);
        });
        step(2600, () => {
            const c = spriteCenter();
            spawnFx((c.x + blipPos.x) / 2, c.y - spriteSize() * 0.6, 'heart', 3, { spread: 12, stagger: 150 });
            if (window.BlipCursor && BlipCursor.react) BlipCursor.react('twirl');
            playSpin();
        });
        step(3600, () => {
            repairing = false;
            meetCooldownUntil = performance.now() + MEET.COOLDOWN;
            setLifeState('stand');
            nextThinkAt = performance.now() + 1500;
        });
    }

    /* ---------- Meet scenes: Blip × Cathode ----------
       Four little two-character numbers. Every step re-validates its scene
       token (user can yank the cursor away mid-scene) and, where it makes
       sense, that Blip is still around. */

    function cancelScene() {
        sceneToken++;
        if (repairing) repairing = false;
        if (lifeState === 'meet') {
            setFace(null);
            if (perchEl && document.contains(perchEl)) setLifeState('perch');
            else setLifeState('stand');
            nextThinkAt = performance.now() + 800;
        }
    }

    function blipNear(maxDist) {
        if (!window.BlipCursor || !BlipCursor.getPosition) return null;
        const p = BlipCursor.getPosition();
        if (!p) return null;
        const c = spriteCenter();
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        return d <= maxDist ? { x: p.x, y: p.y, dist: d } : null;
    }

    function startMeet(ts, blipPos) {
        const scenes = ['check', 'hug', 'talk', 'dance'];
        const scene = scenes[Math.floor(Math.random() * scenes.length)];
        const token = ++sceneToken;
        const wasPerched = lifeState === 'perch';
        const anchorPerch = perchEl;
        setLifeState('meet');
        dir = blipPos.x >= px + spriteSize() / 2 ? 1 : -1;
        meetCooldownUntil = ts + MEET.COOLDOWN + Math.random() * 8000;

        // Steps only run while the scene is still valid and Blip hasn't left.
        const step = (ms, fn, needBlip) => lifeSetTimeout(() => {
            if (sceneToken !== token || !alive) return;
            if (needBlip !== false && !blipNear(230)) { cancelScene(); return; }
            fn();
        }, ms);
        const endAt = (ms) => lifeSetTimeout(() => {
            if (sceneToken !== token || !alive) return;
            setFace(null);
            if (wasPerched && anchorPerch && document.contains(anchorPerch)) {
                perchEl = anchorPerch;
                setLifeState('perch');
            } else {
                setLifeState('stand');
            }
            nextThinkAt = performance.now() + 1200 + Math.random() * 1600;
        }, ms, false);

        if (scene === 'check') {
            setFace('cg-face-happy');
            step(160, () => { if (window.BlipCursor) BlipCursor.react('wave'); });
            step(480, () => {
                root.classList.add('cg-landing'); // little anticipation squash
                lifeSetTimeout(() => { if (root) root.classList.remove('cg-landing'); }, 300);
            });
            step(640, () => {
                const c = spriteCenter();
                const near = blipNear(230) || blipPos;
                spawnFx((c.x + near.x) / 2, Math.min(c.y, near.y) - 8, 'star', 5, { spread: 14, stagger: 60 });
            });
            step(1150, () => playSpin());
            endAt(2300);
        } else if (scene === 'hug') {
            setFace('cg-face-heart');
            step(220, () => { if (window.BlipCursor) BlipCursor.react('joy'); });
            step(700, () => {
                const c = spriteCenter();
                const near = blipNear(230) || blipPos;
                spawnFx((c.x + near.x) / 2, Math.min(c.y, near.y) - 10, 'heart', 4, { spread: 12, stagger: 170 });
            });
            step(1500, () => {
                const c = spriteCenter();
                spawnFx(c.x, c.y - spriteSize() * 0.7, 'heart', 2, { spread: 8, stagger: 200 });
            });
            endAt(2900);
        } else if (scene === 'talk') {
            setFace('cg-face-happy');
            step(150, () => speakFrom('cathodeGuide.meet', 3600), false);
            step(700, () => { if (window.BlipCursor) BlipCursor.react('listen'); });
            step(2100, () => { if (window.BlipCursor) BlipCursor.react('joy'); });
            endAt(3900);
        } else { // dance
            setFace('cg-face-happy');
            step(260, () => {
                playSpin();
                if (window.BlipCursor) BlipCursor.react('twirl');
            });
            step(700, () => {
                const c = spriteCenter();
                const near = blipNear(230) || blipPos;
                spawnFx((c.x + near.x) / 2, Math.min(c.y, near.y) - 6, 'star', 6, { spread: 20, stagger: 70 });
            });
            endAt(2100);
        }
    }

    // Called from the rAF loop, throttled: is Blip hanging around close by?
    function meetCheck(ts) {
        if (ts < meetCheckAt) return;
        meetCheckAt = ts + MEET.CHECK_EVERY;
        if (offState || !root) return;
        const okState = lifeState === 'stand' || lifeState === 'walk' || lifeState === 'perch';
        if (!okState) { meetNearMs = 0; return; }
        const near = blipNear(MEET.DIST);
        if (!near) { meetNearMs = 0; return; }
        // A broken screen turns any close encounter into the repair scene.
        if (broken) {
            meetNearMs += MEET.CHECK_EVERY;
            if (meetNearMs >= MEET.HOLD_MS) { meetNearMs = 0; startRepair(ts, near); }
            return;
        }
        if (ts < meetCooldownUntil || (bubbleShowing() && bubbleOwner === 'section')) return;
        meetNearMs += MEET.CHECK_EVERY;
        if (meetNearMs >= MEET.HOLD_MS) {
            meetNearMs = 0;
            startMeet(ts, near);
        }
    }

    function evaluateLife() {
        if (lifeAllowed()) {
            startLife();
        } else {
            stopLife();
            // Back to the stylesheet's static dock (reduced motion / teardown).
            if (root) {
                root.classList.remove('cg-alive');
                root.style.transform = '';
            }
        }
    }

    function unbindToggleButton() {
        if (toggleBtn && toggleHandler) toggleBtn.removeEventListener('click', toggleHandler);
        toggleBtn = null;
        toggleHandler = null;
    }

    // Language can change in-place (no reload, unlike theme switches) - if a
    // bubble is currently showing, re-render it in the new language so it
    // doesn't linger stale mid-session.
    function onLanguageChanged() {
        if (!bubbleEl || !bubbleEl.classList.contains('cg-show') || !currentSectionKey) return;
        if (bubbleOwner === 'quip') { hideBubble(); return; } // quips are throwaway lines
        renderBubbleContent(currentSectionKey);
    }

    function init() {
        if (isActive) return;
        if (typeof window === 'undefined' || !window.matchMedia) return;
        isActive = true;

        mqMobile = window.matchMedia(MOBILE_QUERY);
        mqReduced = window.matchMedia(REDUCED_QUERY);

        let dismissed = false;
        try { dismissed = localStorage.getItem(STORAGE_KEY) === '1'; } catch {}

        if (!dismissed) mountRoot();
        bindToggleButton();
        buildObserver();

        languageHandler = onLanguageChanged;
        window.addEventListener('languageChanged', languageHandler);

        reducedHandler = evaluateLife;
        if (mqReduced) {
            if (mqReduced.addEventListener) mqReduced.addEventListener('change', reducedHandler);
            else if (mqReduced.addListener) mqReduced.addListener(reducedHandler); // Safari <14
        }
        evaluateLife();
    }

    function destroy() {
        if (!isActive) return;
        isActive = false;

        stopLife();
        clearTimers();
        if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = null; }
        unbindToggleButton();
        if (languageHandler) { window.removeEventListener('languageChanged', languageHandler); languageHandler = null; }
        if (reducedHandler && mqReduced) {
            if (mqReduced.removeEventListener) mqReduced.removeEventListener('change', reducedHandler);
            else if (mqReduced.removeListener) mqReduced.removeListener(reducedHandler);
        }
        reducedHandler = null;
        unmountRoot();
        if (fxLayer && fxLayer.parentNode) fxLayer.parentNode.removeChild(fxLayer);
        fxLayer = null;
        broken = false;

        mqMobile = null;
        mqReduced = null;
        currentSectionKey = null;
        visited.clear();
        offState = false;
    }

    const BUBBLE_HTML = '<div class="cg-bubble"><div class="cg-bar"><i></i><i></i><i></i><b></b></div><div class="cg-body"></div></div>';

    // Sprite markup verbatim from the guide-kit (cathode-guide.html) - the
    // kit's contract says "SVG, ne pas modifier": every animation hook the
    // CSS drives lives in these class names, untouched.
    const SPRITE_HTML = `  <div class="cg-sprite">
    <div class="cg-shadow"></div>
    <div class="cg-pop"><div class="cg-hop"><div class="cg-nod"><div class="cg-tilt">
<svg class="cg-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
<defs>
<clipPath id="cg-clip"><rect x="7" y="9" width="8" height="6"/></clipPath>
<clipPath id="cg-clip-lines"><rect x="7" y="12.1" width="8" height="2.9"/></clipPath>
</defs>
<g class="cg-sf cg-sf-base"><rect x="4" y="5" width="14" height="1" fill="#12120f"/><rect x="3" y="6" width="1" height="1" fill="#12120f"/><rect x="4" y="6" width="13" height="1" fill="#fff8e8"/><rect x="17" y="6" width="1" height="1" fill="#f2e2c4"/><rect x="18" y="6" width="1" height="1" fill="#12120f"/><rect x="3" y="7" width="1" height="1" fill="#12120f"/><rect x="4" y="7" width="1" height="1" fill="#fff8e8"/><rect x="5" y="7" width="12" height="1" fill="#f2e2c4"/><rect x="17" y="7" width="1" height="1" fill="#cdb894"/><rect x="18" y="7" width="1" height="1" fill="#12120f"/><rect x="3" y="8" width="1" height="1" fill="#12120f"/><rect x="4" y="8" width="1" height="1" fill="#fff8e8"/><rect x="5" y="8" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="8" width="10" height="1" fill="#12120f"/><rect x="16" y="8" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="8" width="1" height="1" fill="#cdb894"/><rect x="18" y="8" width="1" height="1" fill="#12120f"/><rect x="3" y="9" width="1" height="1" fill="#12120f"/><rect x="4" y="9" width="1" height="1" fill="#fff8e8"/><rect x="5" y="9" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="9" width="1" height="1" fill="#12120f"/><rect x="7" y="9" width="8" height="1" fill="#181815"/><rect x="15" y="9" width="1" height="1" fill="#12120f"/><rect x="16" y="9" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="9" width="1" height="1" fill="#cdb894"/><rect x="18" y="9" width="1" height="1" fill="#12120f"/><rect x="3" y="10" width="1" height="1" fill="#12120f"/><rect x="4" y="10" width="1" height="1" fill="#fff8e8"/><rect x="5" y="10" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="10" width="1" height="1" fill="#12120f"/><rect x="7" y="10" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="10" width="1" height="1" fill="#12120f"/><rect x="16" y="10" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="10" width="1" height="1" fill="#cdb894"/><rect x="18" y="10" width="1" height="1" fill="#12120f"/><rect x="3" y="11" width="1" height="1" fill="#12120f"/><rect x="4" y="11" width="1" height="1" fill="#fff8e8"/><rect x="5" y="11" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="11" width="1" height="1" fill="#12120f"/><rect x="7" y="11" width="8" height="1" fill="#181815"/><rect x="15" y="11" width="1" height="1" fill="#12120f"/><rect x="16" y="11" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="11" width="1" height="1" fill="#cdb894"/><rect x="18" y="11" width="1" height="1" fill="#12120f"/><rect x="3" y="12" width="1" height="1" fill="#12120f"/><rect x="4" y="12" width="1" height="1" fill="#fff8e8"/><rect x="5" y="12" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="12" width="1" height="1" fill="#12120f"/><rect x="7" y="12" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="12" width="1" height="1" fill="#12120f"/><rect x="16" y="12" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="12" width="1" height="1" fill="#cdb894"/><rect x="18" y="12" width="1" height="1" fill="#12120f"/><rect x="3" y="13" width="1" height="1" fill="#12120f"/><rect x="4" y="13" width="1" height="1" fill="#fff8e8"/><rect x="5" y="13" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="13" width="1" height="1" fill="#12120f"/><rect x="7" y="13" width="8" height="1" fill="#181815"/><rect x="15" y="13" width="1" height="1" fill="#12120f"/><rect x="16" y="13" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="13" width="1" height="1" fill="#cdb894"/><rect x="18" y="13" width="1" height="1" fill="#12120f"/><rect x="3" y="14" width="1" height="1" fill="#12120f"/><rect x="4" y="14" width="1" height="1" fill="#fff8e8"/><rect x="5" y="14" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="14" width="1" height="1" fill="#12120f"/><rect x="7" y="14" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="14" width="1" height="1" fill="#12120f"/><rect x="16" y="14" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="14" width="1" height="1" fill="#cdb894"/><rect x="18" y="14" width="1" height="1" fill="#12120f"/><rect x="3" y="15" width="1" height="1" fill="#12120f"/><rect x="4" y="15" width="1" height="1" fill="#fff8e8"/><rect x="5" y="15" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="15" width="10" height="1" fill="#12120f"/><rect x="16" y="15" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="15" width="1" height="1" fill="#cdb894"/><rect x="18" y="15" width="1" height="1" fill="#12120f"/><rect x="3" y="16" width="1" height="1" fill="#12120f"/><rect x="4" y="16" width="1" height="1" fill="#fff8e8"/><rect x="5" y="16" width="12" height="1" fill="#f2e2c4"/><rect x="17" y="16" width="1" height="1" fill="#cdb894"/><rect x="18" y="16" width="1" height="1" fill="#12120f"/><rect x="3" y="17" width="1" height="1" fill="#12120f"/><rect x="4" y="17" width="1" height="1" fill="#cdb894"/><rect x="5" y="17" width="8" height="1" fill="#f2e2c4"/><rect x="13" y="17" width="1" height="1" fill="#ffb000"/><rect x="14" y="17" width="1" height="1" fill="#a08a60"/><rect x="15" y="17" width="1" height="1" fill="#f2e2c4"/><rect x="16" y="17" width="1" height="1" fill="#cdb894"/><rect x="17" y="17" width="1" height="1" fill="#a08a60"/><rect x="18" y="17" width="1" height="1" fill="#12120f"/><rect x="3" y="18" width="1" height="1" fill="#12120f"/><rect x="4" y="18" width="13" height="1" fill="#cdb894"/><rect x="17" y="18" width="1" height="1" fill="#a08a60"/><rect x="18" y="18" width="1" height="1" fill="#12120f"/><rect x="4" y="19" width="14" height="1" fill="#12120f"/><rect x="5" y="20" width="3" height="1" fill="#12120f"/><rect x="14" y="20" width="3" height="1" fill="#12120f"/><rect x="5" y="21" width="3" height="1" fill="#12120f"/><rect x="14" y="21" width="3" height="1" fill="#12120f"/></g><g class="cg-sf cg-sf-squash"><rect x="4" y="6" width="14" height="1" fill="#12120f"/><rect x="3" y="7" width="1" height="1" fill="#12120f"/><rect x="4" y="7" width="13" height="1" fill="#fff8e8"/><rect x="17" y="7" width="1" height="1" fill="#f2e2c4"/><rect x="18" y="7" width="1" height="1" fill="#12120f"/><rect x="3" y="8" width="1" height="1" fill="#12120f"/><rect x="4" y="8" width="1" height="1" fill="#fff8e8"/><rect x="5" y="8" width="12" height="1" fill="#f2e2c4"/><rect x="17" y="8" width="1" height="1" fill="#cdb894"/><rect x="18" y="8" width="1" height="1" fill="#12120f"/><rect x="3" y="9" width="1" height="1" fill="#12120f"/><rect x="4" y="9" width="1" height="1" fill="#fff8e8"/><rect x="5" y="9" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="9" width="10" height="1" fill="#12120f"/><rect x="16" y="9" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="9" width="1" height="1" fill="#cdb894"/><rect x="18" y="9" width="1" height="1" fill="#12120f"/><rect x="3" y="10" width="1" height="1" fill="#12120f"/><rect x="4" y="10" width="1" height="1" fill="#fff8e8"/><rect x="5" y="10" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="10" width="1" height="1" fill="#12120f"/><rect x="7" y="10" width="8" height="1" fill="#181815"/><rect x="15" y="10" width="1" height="1" fill="#12120f"/><rect x="16" y="10" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="10" width="1" height="1" fill="#cdb894"/><rect x="18" y="10" width="1" height="1" fill="#12120f"/><rect x="3" y="11" width="1" height="1" fill="#12120f"/><rect x="4" y="11" width="1" height="1" fill="#fff8e8"/><rect x="5" y="11" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="11" width="1" height="1" fill="#12120f"/><rect x="7" y="11" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="11" width="1" height="1" fill="#12120f"/><rect x="16" y="11" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="11" width="1" height="1" fill="#cdb894"/><rect x="18" y="11" width="1" height="1" fill="#12120f"/><rect x="3" y="12" width="1" height="1" fill="#12120f"/><rect x="4" y="12" width="1" height="1" fill="#fff8e8"/><rect x="5" y="12" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="12" width="1" height="1" fill="#12120f"/><rect x="7" y="12" width="8" height="1" fill="#181815"/><rect x="15" y="12" width="1" height="1" fill="#12120f"/><rect x="16" y="12" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="12" width="1" height="1" fill="#cdb894"/><rect x="18" y="12" width="1" height="1" fill="#12120f"/><rect x="3" y="13" width="1" height="1" fill="#12120f"/><rect x="4" y="13" width="1" height="1" fill="#fff8e8"/><rect x="5" y="13" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="13" width="1" height="1" fill="#12120f"/><rect x="7" y="13" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="13" width="1" height="1" fill="#12120f"/><rect x="16" y="13" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="13" width="1" height="1" fill="#cdb894"/><rect x="18" y="13" width="1" height="1" fill="#12120f"/><rect x="3" y="14" width="1" height="1" fill="#12120f"/><rect x="4" y="14" width="1" height="1" fill="#fff8e8"/><rect x="5" y="14" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="14" width="1" height="1" fill="#12120f"/><rect x="7" y="14" width="8" height="1" fill="#181815"/><rect x="15" y="14" width="1" height="1" fill="#12120f"/><rect x="16" y="14" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="14" width="1" height="1" fill="#cdb894"/><rect x="18" y="14" width="1" height="1" fill="#12120f"/><rect x="3" y="15" width="1" height="1" fill="#12120f"/><rect x="4" y="15" width="1" height="1" fill="#fff8e8"/><rect x="5" y="15" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="15" width="1" height="1" fill="#12120f"/><rect x="7" y="15" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="15" width="1" height="1" fill="#12120f"/><rect x="16" y="15" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="15" width="1" height="1" fill="#cdb894"/><rect x="18" y="15" width="1" height="1" fill="#12120f"/><rect x="2" y="16" width="1" height="1" fill="#12120f"/><rect x="3" y="16" width="2" height="1" fill="#fff8e8"/><rect x="5" y="16" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="16" width="10" height="1" fill="#12120f"/><rect x="16" y="16" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="16" width="2" height="1" fill="#cdb894"/><rect x="19" y="16" width="1" height="1" fill="#12120f"/><rect x="2" y="17" width="1" height="1" fill="#12120f"/><rect x="3" y="17" width="2" height="1" fill="#cdb894"/><rect x="5" y="17" width="8" height="1" fill="#f2e2c4"/><rect x="13" y="17" width="1" height="1" fill="#ffb000"/><rect x="14" y="17" width="1" height="1" fill="#a08a60"/><rect x="15" y="17" width="1" height="1" fill="#f2e2c4"/><rect x="16" y="17" width="1" height="1" fill="#cdb894"/><rect x="17" y="17" width="2" height="1" fill="#a08a60"/><rect x="19" y="17" width="1" height="1" fill="#12120f"/><rect x="2" y="18" width="1" height="1" fill="#12120f"/><rect x="3" y="18" width="14" height="1" fill="#cdb894"/><rect x="17" y="18" width="2" height="1" fill="#a08a60"/><rect x="19" y="18" width="1" height="1" fill="#12120f"/><rect x="3" y="19" width="16" height="1" fill="#12120f"/><rect x="4" y="20" width="3" height="1" fill="#12120f"/><rect x="15" y="20" width="3" height="1" fill="#12120f"/><rect x="4" y="21" width="3" height="1" fill="#12120f"/><rect x="15" y="21" width="3" height="1" fill="#12120f"/></g><g class="cg-sf cg-sf-stretch"><rect x="4" y="4" width="14" height="1" fill="#12120f"/><rect x="3" y="5" width="1" height="1" fill="#12120f"/><rect x="4" y="5" width="13" height="1" fill="#fff8e8"/><rect x="17" y="5" width="1" height="1" fill="#f2e2c4"/><rect x="18" y="5" width="1" height="1" fill="#12120f"/><rect x="3" y="6" width="1" height="1" fill="#12120f"/><rect x="4" y="6" width="1" height="1" fill="#fff8e8"/><rect x="5" y="6" width="12" height="1" fill="#f2e2c4"/><rect x="17" y="6" width="1" height="1" fill="#cdb894"/><rect x="18" y="6" width="1" height="1" fill="#12120f"/><rect x="3" y="7" width="1" height="1" fill="#12120f"/><rect x="4" y="7" width="1" height="1" fill="#fff8e8"/><rect x="5" y="7" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="7" width="10" height="1" fill="#12120f"/><rect x="16" y="7" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="7" width="1" height="1" fill="#cdb894"/><rect x="18" y="7" width="1" height="1" fill="#12120f"/><rect x="3" y="8" width="1" height="1" fill="#12120f"/><rect x="4" y="8" width="1" height="1" fill="#fff8e8"/><rect x="5" y="8" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="8" width="1" height="1" fill="#12120f"/><rect x="7" y="8" width="8" height="1" fill="#181815"/><rect x="15" y="8" width="1" height="1" fill="#12120f"/><rect x="16" y="8" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="8" width="1" height="1" fill="#cdb894"/><rect x="18" y="8" width="1" height="1" fill="#12120f"/><rect x="3" y="9" width="1" height="1" fill="#12120f"/><rect x="4" y="9" width="1" height="1" fill="#fff8e8"/><rect x="5" y="9" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="9" width="1" height="1" fill="#12120f"/><rect x="7" y="9" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="9" width="1" height="1" fill="#12120f"/><rect x="16" y="9" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="9" width="1" height="1" fill="#cdb894"/><rect x="18" y="9" width="1" height="1" fill="#12120f"/><rect x="3" y="10" width="1" height="1" fill="#12120f"/><rect x="4" y="10" width="1" height="1" fill="#fff8e8"/><rect x="5" y="10" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="10" width="1" height="1" fill="#12120f"/><rect x="7" y="10" width="8" height="1" fill="#181815"/><rect x="15" y="10" width="1" height="1" fill="#12120f"/><rect x="16" y="10" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="10" width="1" height="1" fill="#cdb894"/><rect x="18" y="10" width="1" height="1" fill="#12120f"/><rect x="3" y="11" width="1" height="1" fill="#12120f"/><rect x="4" y="11" width="1" height="1" fill="#fff8e8"/><rect x="5" y="11" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="11" width="1" height="1" fill="#12120f"/><rect x="7" y="11" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="11" width="1" height="1" fill="#12120f"/><rect x="16" y="11" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="11" width="1" height="1" fill="#cdb894"/><rect x="18" y="11" width="1" height="1" fill="#12120f"/><rect x="3" y="12" width="1" height="1" fill="#12120f"/><rect x="4" y="12" width="1" height="1" fill="#fff8e8"/><rect x="5" y="12" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="12" width="1" height="1" fill="#12120f"/><rect x="7" y="12" width="8" height="1" fill="#181815"/><rect x="15" y="12" width="1" height="1" fill="#12120f"/><rect x="16" y="12" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="12" width="1" height="1" fill="#cdb894"/><rect x="18" y="12" width="1" height="1" fill="#12120f"/><rect x="3" y="13" width="1" height="1" fill="#12120f"/><rect x="4" y="13" width="1" height="1" fill="#fff8e8"/><rect x="5" y="13" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="13" width="1" height="1" fill="#12120f"/><rect x="7" y="13" width="8" height="1" fill="#0d0d0c"/><rect x="15" y="13" width="1" height="1" fill="#12120f"/><rect x="16" y="13" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="13" width="1" height="1" fill="#cdb894"/><rect x="18" y="13" width="1" height="1" fill="#12120f"/><rect x="3" y="14" width="1" height="1" fill="#12120f"/><rect x="4" y="14" width="1" height="1" fill="#fff8e8"/><rect x="5" y="14" width="1" height="1" fill="#f2e2c4"/><rect x="6" y="14" width="10" height="1" fill="#12120f"/><rect x="16" y="14" width="1" height="1" fill="#f2e2c4"/><rect x="17" y="14" width="1" height="1" fill="#cdb894"/><rect x="18" y="14" width="1" height="1" fill="#12120f"/><rect x="3" y="15" width="1" height="1" fill="#12120f"/><rect x="4" y="15" width="1" height="1" fill="#fff8e8"/><rect x="5" y="15" width="12" height="1" fill="#f2e2c4"/><rect x="17" y="15" width="1" height="1" fill="#cdb894"/><rect x="18" y="15" width="1" height="1" fill="#12120f"/><rect x="3" y="16" width="1" height="1" fill="#12120f"/><rect x="4" y="16" width="1" height="1" fill="#fff8e8"/><rect x="5" y="16" width="12" height="1" fill="#f2e2c4"/><rect x="17" y="16" width="1" height="1" fill="#cdb894"/><rect x="18" y="16" width="1" height="1" fill="#12120f"/><rect x="3" y="17" width="1" height="1" fill="#12120f"/><rect x="4" y="17" width="1" height="1" fill="#cdb894"/><rect x="5" y="17" width="8" height="1" fill="#f2e2c4"/><rect x="13" y="17" width="1" height="1" fill="#ffb000"/><rect x="14" y="17" width="1" height="1" fill="#a08a60"/><rect x="15" y="17" width="1" height="1" fill="#f2e2c4"/><rect x="16" y="17" width="1" height="1" fill="#cdb894"/><rect x="17" y="17" width="1" height="1" fill="#a08a60"/><rect x="18" y="17" width="1" height="1" fill="#12120f"/><rect x="3" y="18" width="1" height="1" fill="#12120f"/><rect x="4" y="18" width="13" height="1" fill="#cdb894"/><rect x="17" y="18" width="1" height="1" fill="#a08a60"/><rect x="18" y="18" width="1" height="1" fill="#12120f"/><rect x="4" y="19" width="14" height="1" fill="#12120f"/><rect x="6" y="20" width="2" height="1" fill="#12120f"/><rect x="14" y="20" width="2" height="1" fill="#12120f"/><rect x="6" y="21" width="2" height="1" fill="#12120f"/><rect x="14" y="21" width="2" height="1" fill="#12120f"/></g>
<g class="cg-syncA"><g class="cg-ant"><g class="cg-ant2"><rect x="16" y="3" width="1" height="2" fill="#55554a"/><rect x="17" y="3" width="1" height="2" fill="#2c2c26"/><g class="cg-ball"><g class="cg-ball2"><rect x="15" y="1" width="1" height="2" fill="#12120f"/><rect x="16" y="1" width="2" height="2" fill="#ff3333"/><rect x="16" y="1" width="1" height="1" fill="#ff7a66"/><rect x="18" y="1" width="1" height="2" fill="#12120f"/></g></g></g></g></g>
<rect class="cg-ledr" x="14" y="17" width="1" height="1" fill="#ff4747"/>
<rect class="cg-ledg" x="14" y="17" width="1" height="1" fill="#86ff6e"/>
<g class="cg-syncS"><g class="cg-scr" clip-path="url(#cg-clip)">
<g class="cg-screenwrap"><g class="cg-czap">
<rect x="7" y="9" width="8" height="6" fill="currentColor" opacity=".13"/>
<g class="cg-band"><rect x="7" y="7.4" width="8" height="1.3" fill="#fff" opacity=".055"/></g>
<g class="cg-face"><g class="cg-eyx"><g class="cg-eyy"><g class="cg-ef cg-ef-open"><rect x="8" y="10" width="1" height="0.5" fill="currentColor"/><rect x="13" y="10" width="1" height="0.5" fill="currentColor"/><rect x="8" y="10.5" width="1" height="0.5" fill="currentColor"/><rect x="13" y="10.5" width="1" height="0.5" fill="currentColor"/><rect x="8" y="11" width="1" height="0.5" fill="currentColor"/><rect x="13" y="11" width="1" height="0.5" fill="currentColor"/></g><g class="cg-ef cg-ef-half"><rect x="8" y="10.5" width="1" height="0.5" fill="currentColor"/><rect x="13" y="10.5" width="1" height="0.5" fill="currentColor"/><rect x="8" y="11" width="1" height="0.5" fill="currentColor"/><rect x="13" y="11" width="1" height="0.5" fill="currentColor"/></g><g class="cg-ef cg-ef-shut"><rect x="7.5" y="11" width="1.5" height="0.5" fill="currentColor"/><rect x="13" y="11" width="1.5" height="0.5" fill="currentColor"/></g><g class="cg-ef cg-ef-wide"><rect x="7.5" y="9.5" width="2" height="0.5" fill="currentColor"/><rect x="12.5" y="9.5" width="2" height="0.5" fill="currentColor"/><rect x="7.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="10" width="0.5" height="0.5" fill="#f2fff0"/><rect x="8.5" y="10" width="1" height="0.5" fill="currentColor"/><rect x="12.5" y="10" width="1" height="0.5" fill="currentColor"/><rect x="13.5" y="10" width="0.5" height="0.5" fill="#f2fff0"/><rect x="14" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10.5" width="2" height="0.5" fill="currentColor"/><rect x="12.5" y="10.5" width="2" height="0.5" fill="currentColor"/><rect x="7.5" y="11" width="2" height="0.5" fill="currentColor"/><rect x="12.5" y="11" width="2" height="0.5" fill="currentColor"/></g><g class="cg-ef cg-ef-happy"><rect x="8" y="10" width="1" height="0.5" fill="currentColor"/><rect x="13" y="10" width="1" height="0.5" fill="currentColor"/><rect x="7.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="14" y="10.5" width="0.5" height="0.5" fill="currentColor"/></g><g class="cg-ef cg-ef-wink"><rect x="8" y="10" width="1" height="0.5" fill="currentColor"/><rect x="8" y="10.5" width="1" height="0.5" fill="currentColor"/><rect x="8" y="11" width="1" height="0.5" fill="currentColor"/><rect x="13" y="11" width="1.5" height="0.5" fill="currentColor"/></g></g></g><g class="cg-mox"><g class="cg-mf cg-mf-smile"><rect x="8" y="13" width="1" height="0.5" fill="currentColor"/><rect x="13" y="13" width="1" height="0.5" fill="currentColor"/><rect x="8" y="13.5" width="1" height="0.5" fill="currentColor"/><rect x="13" y="13.5" width="1" height="0.5" fill="currentColor"/><rect x="9" y="14" width="4" height="0.5" fill="currentColor"/><rect x="9" y="14.5" width="4" height="0.5" fill="currentColor"/></g><g class="cg-mf cg-mf-grin"><rect x="7.5" y="12.5" width="1" height="0.5" fill="currentColor"/><rect x="13.5" y="12.5" width="1" height="0.5" fill="currentColor"/><rect x="8" y="13" width="1" height="0.5" fill="currentColor"/><rect x="13" y="13" width="1" height="0.5" fill="currentColor"/><rect x="8.5" y="13.5" width="5" height="0.5" fill="currentColor"/><rect x="9" y="14" width="4" height="0.5" fill="currentColor"/><rect x="9.5" y="14.5" width="3" height="0.5" fill="currentColor"/></g><g class="cg-mf cg-mf-o"><rect x="10.5" y="13" width="1" height="0.5" fill="currentColor"/><rect x="10" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="14" width="1" height="0.5" fill="currentColor"/></g><g class="cg-mf cg-mf-flat"><rect x="9.5" y="13.5" width="3" height="0.5" fill="currentColor"/></g><g class="cg-mf cg-mf-wavy"><rect x="10" y="13" width="1" height="0.5" fill="currentColor"/><rect x="12" y="13" width="1" height="0.5" fill="currentColor"/><rect x="9" y="13.5" width="1" height="0.5" fill="currentColor"/><rect x="11" y="13.5" width="1" height="0.5" fill="currentColor"/></g><g class="cg-mf cg-mf-sleep"><rect x="10" y="13.5" width="2" height="0.5" fill="currentColor"/></g></g></g>
<g class="cg-live"><g class="cg-livetxt"><rect x="7.5" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9.5" y="9.5" width="1.5" height="0.5" fill="currentColor"/><rect x="11.5" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="13.5" y="9.5" width="1.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="13.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="13.5" y="10.5" width="1.5" height="0.5" fill="currentColor"/><rect x="7.5" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="13.5" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="11.5" width="1.5" height="0.5" fill="currentColor"/><rect x="9.5" y="11.5" width="1.5" height="0.5" fill="currentColor"/><rect x="12" y="11.5" width="0.5" height="0.5" fill="currentColor"/><rect x="13.5" y="11.5" width="1.5" height="0.5" fill="currentColor"/></g><g class="cg-dot"><rect x="10.5" y="13" width="0.5" height="0.5" fill="currentColor"/><rect x="11" y="13" width="0.5" height="0.5" fill="#f2fff0"/><rect x="10.5" y="13.5" width="1" height="0.5" fill="currentColor"/></g><g class="cg-ring1"><rect x="10" y="12.5" width="2" height="0.5" fill="currentColor"/><rect x="10" y="13" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="13" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="14" width="2" height="0.5" fill="currentColor"/></g><g class="cg-ring2"><rect x="9" y="12" width="4" height="0.5" fill="currentColor"/><rect x="9" y="12.5" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="12.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="13" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="13" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="14" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="14" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="14.5" width="4" height="0.5" fill="currentColor"/></g></g>
<g class="cg-pictos"><g class="cg-pictroll"><rect x="8.5" y="9" width="1" height="0.5" fill="currentColor"/><rect x="12" y="9" width="1" height="0.5" fill="currentColor"/><rect x="8" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="9.5" width="1" height="0.5" fill="#f2fff0"/><rect x="9.5" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="9.5" width="2" height="0.5" fill="currentColor"/><rect x="8" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="10" width="0.5" height="0.5" fill="#f2fff0"/><rect x="9" y="10" width="1" height="0.5" fill="currentColor"/><rect x="11" y="10" width="2.5" height="0.5" fill="currentColor"/><rect x="8" y="10.5" width="5.5" height="0.5" fill="currentColor"/><rect x="8.5" y="11" width="4.5" height="0.5" fill="currentColor"/><rect x="9" y="11.5" width="3.5" height="0.5" fill="currentColor"/><rect x="9.5" y="12" width="2.5" height="0.5" fill="currentColor"/><rect x="10.5" y="12.5" width="1" height="0.5" fill="currentColor"/><rect x="11" y="14.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10.5" y="15" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="15.5" width="2" height="0.5" fill="currentColor"/><rect x="9.5" y="16" width="3.5" height="0.5" fill="currentColor"/><rect x="11" y="16.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10.5" y="17" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="17.5" width="1" height="0.5" fill="currentColor"/><rect x="9.5" y="18" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="20" width="1" height="0.5" fill="currentColor"/><rect x="10" y="20.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="20.5" width="1" height="0.5" fill="#f2fff0"/><rect x="11.5" y="20.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="21" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="21" width="1" height="0.5" fill="#f2fff0"/><rect x="11.5" y="21" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="21.5" width="2" height="0.5" fill="currentColor"/><rect x="9.5" y="22" width="3" height="0.5" fill="currentColor"/><rect x="9" y="22.5" width="1" height="0.5" fill="currentColor"/><rect x="10.5" y="22.5" width="1" height="0.5" fill="currentColor"/><rect x="12" y="22.5" width="1" height="0.5" fill="currentColor"/><rect x="10.5" y="23" width="1" height="0.5" fill="currentColor"/><rect x="10" y="23.5" width="0.5" height="0.5" fill="#f2fff0"/><rect x="11.5" y="23.5" width="0.5" height="0.5" fill="#f2fff0"/><rect x="8.5" y="25.5" width="1" height="0.5" fill="currentColor"/><rect x="12" y="25.5" width="1" height="0.5" fill="currentColor"/><rect x="8" y="26" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="26" width="1" height="0.5" fill="#f2fff0"/><rect x="9.5" y="26" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="26" width="2" height="0.5" fill="currentColor"/><rect x="8" y="26.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="26.5" width="0.5" height="0.5" fill="#f2fff0"/><rect x="9" y="26.5" width="1" height="0.5" fill="currentColor"/><rect x="11" y="26.5" width="2.5" height="0.5" fill="currentColor"/><rect x="8" y="27" width="5.5" height="0.5" fill="currentColor"/><rect x="8.5" y="27.5" width="4.5" height="0.5" fill="currentColor"/><rect x="9" y="28" width="3.5" height="0.5" fill="currentColor"/><rect x="9.5" y="28.5" width="2.5" height="0.5" fill="currentColor"/><rect x="10.5" y="29" width="1" height="0.5" fill="currentColor"/><rect x="11" y="31" width="1.5" height="0.5" fill="currentColor"/><rect x="10.5" y="31.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="32" width="2" height="0.5" fill="currentColor"/><rect x="9.5" y="32.5" width="3.5" height="0.5" fill="currentColor"/><rect x="11" y="33" width="1.5" height="0.5" fill="currentColor"/><rect x="10.5" y="33.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="34" width="1" height="0.5" fill="currentColor"/><rect x="9.5" y="34.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="36.5" width="1" height="0.5" fill="currentColor"/><rect x="10" y="37" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="37" width="1" height="0.5" fill="#f2fff0"/><rect x="11.5" y="37" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="37.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10.5" y="37.5" width="1" height="0.5" fill="#f2fff0"/><rect x="11.5" y="37.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="38" width="2" height="0.5" fill="currentColor"/><rect x="9.5" y="38.5" width="3" height="0.5" fill="currentColor"/><rect x="9" y="39" width="1" height="0.5" fill="currentColor"/><rect x="10.5" y="39" width="1" height="0.5" fill="currentColor"/><rect x="12" y="39" width="1" height="0.5" fill="currentColor"/><rect x="10.5" y="39.5" width="1" height="0.5" fill="currentColor"/><rect x="10" y="40" width="0.5" height="0.5" fill="#f2fff0"/><rect x="11.5" y="40" width="0.5" height="0.5" fill="#f2fff0"/></g></g>
<g class="cg-read"><g class="cg-gl cg-gl-open"><rect x="7.5" y="9" width="3" height="0.5" fill="currentColor"/><rect x="11.5" y="9" width="3" height="0.5" fill="currentColor"/><rect x="7.5" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="9.5" width="2" height="0.5" fill="currentColor"/><rect x="14" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="10" width="1" height="0.5" fill="#f2fff0"/><rect x="10" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="12.5" y="10" width="1" height="0.5" fill="#f2fff0"/><rect x="14" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10.5" width="3" height="0.5" fill="currentColor"/><rect x="11.5" y="10.5" width="3" height="0.5" fill="currentColor"/></g><g class="cg-gl cg-gl-blink"><rect x="7.5" y="9" width="3" height="0.5" fill="currentColor"/><rect x="11.5" y="9" width="3" height="0.5" fill="currentColor"/><rect x="7.5" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="9.5" width="2" height="0.5" fill="currentColor"/><rect x="14" y="9.5" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="14" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="10.5" width="3" height="0.5" fill="currentColor"/><rect x="11.5" y="10.5" width="3" height="0.5" fill="currentColor"/></g><g clip-path="url(#cg-clip-lines)"><g class="cg-lineroll"><rect x="7.5" y="12.2" width="6" height="0.5" fill="currentColor"/><rect x="7.5" y="13.2" width="4.5" height="0.5" fill="currentColor"/><rect x="7.5" y="14.2" width="5.5" height="0.5" fill="#93a393"/><rect x="7.5" y="15.2" width="3.5" height="0.5" fill="currentColor"/><rect x="7.5" y="17.2" width="5" height="0.5" fill="currentColor"/><rect x="7.5" y="18.2" width="6" height="0.5" fill="#93a393"/><rect x="7.5" y="19.2" width="4" height="0.5" fill="currentColor"/><rect x="7.5" y="20.2" width="2.5" height="0.5" fill="currentColor"/><rect x="7.5" y="22.2" width="5.5" height="0.5" fill="currentColor"/><rect x="7.5" y="23.2" width="4.5" height="0.5" fill="#93a393"/><rect x="7.5" y="24.2" width="6" height="0.5" fill="currentColor"/><rect x="7.5" y="25.2" width="4.5" height="0.5" fill="currentColor"/><rect x="7.5" y="26.2" width="5.5" height="0.5" fill="#93a393"/><rect x="7.5" y="27.2" width="3.5" height="0.5" fill="currentColor"/><rect x="7.5" y="29.2" width="5" height="0.5" fill="currentColor"/><rect x="7.5" y="30.2" width="6" height="0.5" fill="#93a393"/><rect x="7.5" y="31.2" width="4" height="0.5" fill="currentColor"/><rect x="7.5" y="32.2" width="2.5" height="0.5" fill="currentColor"/><rect x="7.5" y="34.2" width="5.5" height="0.5" fill="currentColor"/><rect x="7.5" y="35.2" width="4.5" height="0.5" fill="#93a393"/></g></g></g>
<g class="cg-gitlog"><g class="cg-gitroll"><rect x="8" y="9" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="9.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="9.5" width="3" height="0.5" fill="#93a393"/><rect x="8" y="10" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="11" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="11" width="2" height="0.5" fill="#93a393"/><rect x="8" y="11.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="12" width="2" height="0.5" fill="currentColor"/><rect x="8" y="12.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9.5" y="12.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="13" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="13" width="1.5" height="0.5" fill="currentColor"/><rect x="11.5" y="13" width="2" height="0.5" fill="#93a393"/><rect x="8" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9.5" y="13.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="14" width="2" height="0.5" fill="currentColor"/><rect x="8" y="14.5" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="15" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="15" width="0.5" height="0.5" fill="#f2fff0"/><rect x="8.5" y="15" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="15" width="3.5" height="0.5" fill="#93a393"/><rect x="8" y="15.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="16" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="16.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="16.5" width="2.5" height="0.5" fill="#93a393"/><rect x="8" y="17" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="17.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="18" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="18.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="18.5" width="3" height="0.5" fill="#93a393"/><rect x="8" y="19" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="19.5" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="20" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="20" width="2" height="0.5" fill="#93a393"/><rect x="8" y="20.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="21" width="2" height="0.5" fill="currentColor"/><rect x="8" y="21.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9.5" y="21.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="22" width="0.5" height="0.5" fill="currentColor"/><rect x="9" y="22" width="1.5" height="0.5" fill="currentColor"/><rect x="11.5" y="22" width="2" height="0.5" fill="#93a393"/><rect x="8" y="22.5" width="0.5" height="0.5" fill="currentColor"/><rect x="9.5" y="22.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="23" width="2" height="0.5" fill="currentColor"/><rect x="8" y="23.5" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="24" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="24" width="0.5" height="0.5" fill="#f2fff0"/><rect x="8.5" y="24" width="0.5" height="0.5" fill="currentColor"/><rect x="10" y="24" width="3.5" height="0.5" fill="#93a393"/><rect x="8" y="24.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="25" width="0.5" height="0.5" fill="currentColor"/><rect x="7.5" y="25.5" width="1.5" height="0.5" fill="currentColor"/><rect x="10" y="25.5" width="2.5" height="0.5" fill="#93a393"/><rect x="8" y="26" width="0.5" height="0.5" fill="currentColor"/><rect x="8" y="26.5" width="0.5" height="0.5" fill="currentColor"/></g></g>
<g class="cg-heartl"><g class="cg-heartecho"><rect x="8.5" y="10" width="1" height="0.5" fill="currentColor"/><rect x="12" y="10" width="1" height="0.5" fill="currentColor"/><rect x="8" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="10.5" width="1" height="0.5" fill="#f2fff0"/><rect x="9.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="10.5" width="2" height="0.5" fill="currentColor"/><rect x="8" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="11" width="0.5" height="0.5" fill="#f2fff0"/><rect x="9" y="11" width="1" height="0.5" fill="currentColor"/><rect x="11" y="11" width="2.5" height="0.5" fill="currentColor"/><rect x="8" y="11.5" width="5.5" height="0.5" fill="currentColor"/><rect x="8.5" y="12" width="4.5" height="0.5" fill="currentColor"/><rect x="9" y="12.5" width="3.5" height="0.5" fill="currentColor"/><rect x="9.5" y="13" width="2.5" height="0.5" fill="currentColor"/><rect x="10.5" y="13.5" width="1" height="0.5" fill="currentColor"/></g><g class="cg-heartp"><rect x="8.5" y="10" width="1" height="0.5" fill="currentColor"/><rect x="12" y="10" width="1" height="0.5" fill="currentColor"/><rect x="8" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="10.5" width="1" height="0.5" fill="#f2fff0"/><rect x="9.5" y="10.5" width="0.5" height="0.5" fill="currentColor"/><rect x="11.5" y="10.5" width="2" height="0.5" fill="currentColor"/><rect x="8" y="11" width="0.5" height="0.5" fill="currentColor"/><rect x="8.5" y="11" width="0.5" height="0.5" fill="#f2fff0"/><rect x="9" y="11" width="1" height="0.5" fill="currentColor"/><rect x="11" y="11" width="2.5" height="0.5" fill="currentColor"/><rect x="8" y="11.5" width="5.5" height="0.5" fill="currentColor"/><rect x="8.5" y="12" width="4.5" height="0.5" fill="currentColor"/><rect x="9" y="12.5" width="3.5" height="0.5" fill="currentColor"/><rect x="9.5" y="13" width="2.5" height="0.5" fill="currentColor"/><rect x="10.5" y="13.5" width="1" height="0.5" fill="currentColor"/></g></g>
</g></g>
<rect class="cg-bdot" x="10.55" y="11.55" width=".9" height=".8" fill="#eaffdf"/>
<g class="cg-blwrap"><rect class="cg-bline" x="7.15" y="11.62" width="7.7" height=".7" fill="#d9ffcc"/></g>
<g class="cg-bloom"><rect x="7" y="9" width="8" height="6" fill="#7dff5a"/></g>
<rect class="cg-flash" x="7" y="9" width="8" height="6" fill="#ffffff"/>
<g class="cg-zlwrap"><rect class="cg-zline" x="7" y="11.6" width="8" height=".75" fill="#ffffff"/></g>
<rect class="cg-odot" x="10.6" y="11.6" width=".85" height=".72" fill="#ffffff"/>
<rect x="7" y="9.6" width="8" height=".28" fill="#000" opacity=".17"/><rect x="7" y="10.6" width="8" height=".28" fill="#000" opacity=".17"/><rect x="7" y="11.6" width="8" height=".28" fill="#000" opacity=".17"/><rect x="7" y="12.6" width="8" height=".28" fill="#000" opacity=".17"/><rect x="7" y="13.6" width="8" height=".28" fill="#000" opacity=".17"/><rect x="7" y="14.6" width="8" height=".28" fill="#000" opacity=".17"/>
<g class="cg-glint"><rect x="8" y="9.7" width="1.3" height=".45" fill="#fff"/><rect x="9.6" y="10.6" width=".8" height=".4" fill="#fff"/><rect x="8.4" y="12.9" width=".6" height=".35" fill="#fff"/></g>
</g></g>
</svg>
    </div></div></div></div>
  </div>`;

    return {
        init,
        destroy,
        get isActive() { return isActive; }
    };
})();

window.CathodeGuide = CathodeGuide;
