/**
 * Cathode-Guide Module
 * Cathode (the site's CRT mascot) becomes a discreet on-page guide: a small
 * fixed widget that reacts to whichever section is in view, showing a
 * terminal-style speech bubble (typed out, i18n'd) the first time each
 * section is visited, then settling into that section's idle animation.
 *
 * Built on top of the vendor "guide-kit" (see /frontend/css/cathode-guide.css):
 * that stylesheet owns every animation/keyframe (cg-* classes, compiled from
 * beat tables - never hand-edit it). This module only creates the DOM,
 * watches scroll position via IntersectionObserver, and toggles state
 * classes + injects the bubble text, exactly per the kit's documented
 * class-based API (cg-enter / cg-enter-boot / cg-idle-* / cg-exit / cg-off).
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

    // Sections the guide reacts to, in document order. `barTitle` is the
    // little terminal-tab label shown in the bubble's title bar - kept
    // language-neutral (unix-y) on purpose, no i18n needed.
    const SECTION_DEFS = [
        { key: 'hero', selector: '.hero', barTitle: 'guide.sh' },
        { key: 'now', selector: '#now', barTitle: 'now --live' },
        { key: 'work', selector: '#work', barTitle: 'work.log' },
        { key: 'writing', selector: '#writing', barTitle: 'blog.md' },
        { key: 'timeline', selector: '#timeline', barTitle: 'git log' },
        { key: 'about', selector: '#about', barTitle: 'whoami' },
        { key: 'contact', selector: '#contact', barTitle: 'ping' }
    ];
    const SECTION_MAP = SECTION_DEFS.reduce((m, s) => { m[s.key] = s; return m; }, {});
    const MOBILE_ALLOWED = ['hero', 'contact'];

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

    // Greedy word-wrap into lines the kit can type out (<=26ch incl. prefix).
    // "$ " marks the first line, "> " continuation lines - matches the
    // terminal-prompt look used throughout the kit's own reference demo.
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
        return limited.map((l, i) => (i === 0 ? '$ ' : '> ') + l);
    }

    function renderBubbleContent(key) {
        if (!bodyEl || !barEl) return false;
        const def = SECTION_MAP[key];
        const i18nKey = 'cathodeGuide.' + key;
        const text = (window.LanguageManager && LanguageManager.isLoaded) ? LanguageManager.t(i18nKey) : null;
        if (!text || typeof text !== 'string' || text === i18nKey) return false;

        barEl.textContent = def ? def.barTitle : 'guide.sh';
        bodyEl.innerHTML = '';
        const maxLines = isMobile() ? 1 : 3;
        const lines = wrapLines(text, maxLines);
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

    function showBubble(key) {
        if (!bubbleEl) return;
        if (!renderBubbleContent(key)) return;
        bubbleEl.classList.remove('cg-hide');
        bubbleEl.classList.add('cg-show');
    }

    function hideBubble() {
        if (!bubbleEl) return;
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
    }

    function bindToggleButton() {
        toggleBtn = document.getElementById(TOGGLE_BTN_ID);
        if (!toggleBtn) return;
        toggleHandler = () => { if (!mounted || offState) reinvoke(); };
        toggleBtn.addEventListener('click', toggleHandler);
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
    }

    function destroy() {
        if (!isActive) return;
        isActive = false;

        clearTimers();
        if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = null; }
        unbindToggleButton();
        if (languageHandler) { window.removeEventListener('languageChanged', languageHandler); languageHandler = null; }
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
