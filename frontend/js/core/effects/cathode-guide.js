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
            playEnter(key, true);
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
        mounted = false;
    }

    function powerOff() {
        if (!root) return;
        clearTimers();
        offState = true;
        hideBubble();
        // Powered-down TVs don't sit on shelves they climbed onto: put her
        // back on the floor before the sag animation plays.
        if (alive) {
            jumpArc = null;
            if (perchEl) {
                perchEl.classList.remove('cg-perch-squish', 'cg-perch-release');
                perchEl = null;
            }
            py = 0;
            setLifeState('stand');
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
        MAX_PERCH_HOPS: 4,           // stepping-stone hops before coming down
        PERCH_SELECTOR: '.project-card, .git-commit-marker, .now-card, .about-card, .contact-card, .hero-cta',
        QUIP_CHANCE: 0.65,
        QUIP_VISIBLE_MS: 4600
    };

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
    let nextThinkAt = 0;
    let lastUserAct = 0;
    let climbCooldownUntil = 0;  // pause between climb sessions - she's alive, not manic
    let floorBase = 20;
    let floorProbeAt = -1;
    let bubbleOwner = null;      // 'section' | 'quip' - who opened the bubble
    let lastQuip = -1;
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
        root.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + (-(floorBase + py)).toFixed(1) + 'px,0)';
        root.style.setProperty('--cg-dir', dir < 0 ? '-1' : '1');
        // Bubble opens toward the roomy side of the screen.
        root.classList.toggle('cg-bub-right', px + spriteSize() / 2 > window.innerWidth / 2);
    }

    function setLifeState(s) {
        lifeState = s;
        if (!root) return;
        root.classList.toggle('cg-walking', s === 'walk');
        root.classList.toggle('cg-jumping', s === 'jump');
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

    function startJump(toX, toY, perch, now) {
        const dist = Math.hypot(toX - px, toY - py);
        jumpArc = {
            fromX: px, fromY: py, toX, toY, perch: perch || null,
            start: now, dur: Math.min(950, 420 + dist * 0.55),
            peak: 36 + Math.min(90, dist * 0.22)
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

    // Stepping stones: from one timeline commit to a close-enough neighbor.
    function nextMarkerFrom(el) {
        if (!el || !el.classList || !el.classList.contains('git-commit-marker')) return null;
        const from = el.getBoundingClientRect();
        let best = null, bestDx = Infinity;
        perchCandidates().forEach(cand => {
            if (!cand.classList.contains('git-commit-marker')) return;
            const r = cand.getBoundingClientRect();
            const dx = Math.abs(r.left - from.left);
            if (dx > 30 && dx < 420 && Math.abs(r.top - from.top) < 220 && dx < bestDx) {
                best = cand;
                bestDx = dx;
            }
        });
        return best;
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

    function quipsForTheme() {
        if (!window.LanguageManager || !LanguageManager.isLoaded) return null;
        const key = 'cathodeGuide.quips.' + currentTheme();
        const v = LanguageManager.t(key);
        return Array.isArray(v) && v.length ? v : null;
    }

    // A short perched one-liner, in the current theme's voice. Never talks
    // over a section bubble, and its auto-hide never closes someone else's.
    function maybeQuip() {
        if (!bubbleEl || bubbleShowing() || Math.random() > LIFE.QUIP_CHANCE) return;
        const arr = quipsForTheme();
        if (!arr) return;
        let idx;
        do { idx = Math.floor(Math.random() * arr.length); } while (arr.length > 1 && idx === lastQuip);
        lastQuip = idx;
        const def = SECTION_MAP[currentSectionKey];
        const bar = def && def.bar ? (def.bar[currentTheme()] || def.bar.terminal) : 'cathode';
        if (!fillBubble(bar, arr[idx])) return;
        bubbleOwner = 'quip';
        bubbleEl.classList.remove('cg-hide');
        bubbleEl.classList.add('cg-show');
        lifeSetTimeout(() => { if (bubbleOwner === 'quip') hideBubble(); }, LIFE.QUIP_VISIBLE_MS);
    }

    function landJump(now) {
        px = jumpArc.toX;
        py = jumpArc.toY;
        const perch = jumpArc.perch;
        jumpArc = null;
        if (root) {
            root.classList.add('cg-landing');
            lifeSetTimeout(() => { if (root) root.classList.remove('cg-landing'); }, 340);
        }
        if (perch && document.contains(perch)) {
            perchEl = perch;
            perchHops++;
            setLifeState('perch');
            squishPerch(perch);
            nextThinkAt = now + 3800 + Math.random() * 3200;
            lifeSetTimeout(maybeQuip, 520);
        } else {
            perchEl = null;
            py = 0;
            setLifeState('stand');
            nextThinkAt = now + 900 + Math.random() * 2000;
        }
    }

    function hopDown(now) {
        perchEl = null;
        const lo = LIFE.EDGE_PAD, hi = lifeMaxX();
        const tx = Math.min(hi, Math.max(lo, px + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 60)));
        startJump(tx, 0, null, now);
    }

    function think(now) {
        if (!alive || !root) return;
        if (offState) { nextThinkAt = now + 2500; return; }
        if (bubbleShowing() && bubbleOwner === 'section') { nextThinkAt = now + 1500; return; }

        if (lifeState === 'perch') {
            if (Math.random() < 0.25) {
                playSpin(); // a little victory spin right there on the perch
                nextThinkAt = now + 2500 + Math.random() * 2500;
                return;
            }
            const next = nextMarkerFrom(perchEl);
            if (next && perchHops < LIFE.MAX_PERCH_HOPS && Math.random() < 0.7) {
                const p = perchTop(next);
                startJump(p.x, p.y, next, now);
            } else {
                hopDown(now);
                climbCooldownUntil = now + 8000 + Math.random() * 9000;
            }
            return;
        }

        // The visitor has settled somewhere: time to climb on things.
        if (now - lastUserAct > LIFE.IDLE_BEFORE_CLIMB_MS && now > climbCooldownUntil) {
            const target = pickPerch();
            if (target) {
                perchHops = 0;
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

        if (lifeState === 'walk') {
            px += LIFE.WALK_SPEED * dt * dir;
            if ((dir > 0 && px >= walkTarget) || (dir < 0 && px <= walkTarget)) {
                px = walkTarget;
                setLifeState('stand');
                nextThinkAt = ts + 900 + Math.random() * 2600;
            } else if (ts > nextThinkAt && ts - lastUserAct > LIFE.IDLE_BEFORE_CLIMB_MS) {
                think(ts); // the visitor settled mid-stroll: allowed to climb now
            }
        } else if (lifeState === 'jump' && jumpArc) {
            const t = Math.min(1, (ts - jumpArc.start) / jumpArc.dur);
            const e = t * (2 - t); // ease-out on the horizontal
            px = jumpArc.fromX + (jumpArc.toX - jumpArc.fromX) * e;
            py = jumpArc.fromY + (jumpArc.toY - jumpArc.fromY) * t + jumpArc.peak * 4 * t * (1 - t);
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
        applyLifeTransform();
    }

    // The page just moved/acted under her: rects are stale, get off the
    // furniture. Also feeds the "visitor is busy" clock that gates climbing.
    function onUserActivity() {
        lastUserAct = performance.now();
        if (lifeState === 'perch') {
            hopDown(lastUserAct);
        } else if (lifeState === 'jump' && jumpArc && jumpArc.perch) {
            jumpArc.perch = null; // retarget mid-air: land on the floor instead
            jumpArc.toY = 0;
        }
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
        lifeRaf = requestAnimationFrame(lifeTick);
    }

    function stopLife() {
        if (!alive) return;
        alive = false;
        if (lifeRaf) cancelAnimationFrame(lifeRaf);
        lifeRaf = null;
        lifeTimers.forEach(id => clearTimeout(id));
        lifeTimers.clear();
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
            setLifeState('stand');
            root.classList.remove('cg-walking', 'cg-jumping', 'cg-landing', 'cg-spinning');
            applyLifeTransform();
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
