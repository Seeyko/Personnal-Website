/**
 * Theme Initialization - Standard pattern for all themes
 */

const ThemeInit = (() => {
    let isInitialized = false;

    // A theme switch reloads the page and theme-manager.js puts the visitor
    // back where they were (sessionStorage, read and cleared on
    // DOMContentLoaded — this file loads before it, so the key is still here).
    // That saved spot is more recent than any #hash left in the URL, so it wins.
    const restoringScroll = (() => {
        try { return sessionStorage.getItem('portfolio_scroll') !== null; } catch { return false; }
    })();

    async function init(config = {}) {
        const name = config.name || 'Theme';
        console.log(`%c[${name.toUpperCase()}] Initializing...`, 'color: #ffb000;');

        try {
            await ContentLoader.loadAndPopulate();

            const projects = await ContentLoader.loadProjects();

            if (document.querySelector('#work-grid')) {
                CardRenderer.renderProjects(projects, config.cards || {}, '#work-grid');
            }

            // Back-compat: if a legacy single grid is present, render all there.
            const legacyGrid = document.querySelector('#projects-grid:not(.projects-grid-hidden)');
            if (legacyGrid) {
                CardRenderer.renderProjects(projects, config.cards || {}, '#projects-grid');
            }

            const footerInfo = document.querySelector('#work-footer-info');
            if (footerInfo) {
                const total = projects.length;
                const lang = window.LanguageManager?.currentLang || 'fr';
                const word = lang === 'fr' ? 'projets' : 'projects';
                footerInfo.textContent = `total ${total} ${word} | drwxr-xr-x`;
            }

            // Optional page modules: each page loads only the scripts it uses
            // (the blog has no carousel, scroll reveals, custom cursor or
            // Konami), so only touch the ones that are actually present.
            window.Carousel?.initAll();

            if (window.ScrollEffects) {
                ScrollEffects.initAll();
                ScrollEffects.initResizeHandler();
                ScrollEffects.initSmoothScroll();
            }

            // Initialize Git Timeline
            if (window.GitTimeline) {
                await GitTimeline.init();
            }

            // Latest-articles preview: only on a page that has the grid for it.
            // (blog.js renders and animates the blog's own list.)
            if (document.querySelector('#blog-grid')) {
                const articles = await ContentLoader.loadArticles(1, 3);
                if (articles.articles?.length) {
                    CardRenderer.renderBlogCards(articles.articles, config.blogCards || config.cards || {}, '#blog-grid');
                    window.ScrollEffects?.animateBlogCards();
                }
            }

            if (config.cursor && window.CursorTracker) new CursorTracker(config.cursor);

            if (config.headerScroll && window.HeaderScroll) {
                typeof config.headerScroll === 'string'
                    ? HeaderScroll.usePreset(config.headerScroll)
                    : HeaderScroll.init(config.headerScroll);
            }

            if (config.konami && window.KonamiCode) KonamiCode.init(config.konami);
            if (config.initEffects) config.initEffects();
            if (window.LanguageSwitcher) LanguageSwitcher.init();

            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
            isInitialized = true;

            // Arriving with a #hash (/#contact from the blog nav): put that
            // section in place now that the page has its real height.
            scrollToHashTarget();

            // Content is on screen now — dismiss the boot loader as a single,
            // coordinated reveal (loader fades out while #main-content fades in).
            // This is the moment that kills the old double-loader flash.
            window.ThemeManager?.hideLoading?.();

            config.onReady?.();
            console.log(`%c[${name.toUpperCase()}] Ready`, 'color: #33ff00;');
        } catch (err) {
            console.error(`%c[${name.toUpperCase()}] Failed:`, 'color: #ff3333;', err);
            // Don't leave the visitor staring at the spinner if rendering blew up.
            window.ThemeManager?.hideLoading?.();
            throw err;
        }
    }

    // ─── Section landing: #hash arrival and in-page links ───
    // Every way of reaching a section (arriving on /#contact from the blog,
    // the nav and footer links, the fps rail, Clippy) puts its top just below
    // the fixed header, or at its scroll-margin-top when that is larger (e.g.
    // #contact's 120px). scrollIntoView() alone left it at 0, under the header,
    // and clipped scroll-margin-top to the overflow:hidden footer around
    // #contact. Late layout (images, fonts, the header's own transition: the
    // blueprint one gains a border once scrolled) is absorbed by holding the
    // spot for a moment after landing, until the visitor scrolls.
    const STOP_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

    function prefersReducedMotion() {
        return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }

    function hashTarget() {
        let id = '';
        try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return null; }
        const el = id ? document.getElementById(id) : null;
        return el && el.getClientRects().length ? el : null;
    }

    function headerOffset() {
        const header = document.querySelector('header.header');
        if (!header) return 0;
        const position = getComputedStyle(header).position;
        if (position !== 'fixed' && position !== 'sticky') return 0;
        return Math.max(0, header.getBoundingClientRect().bottom);
    }

    function targetScrollY(el) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        const y = el.getBoundingClientRect().top + window.scrollY - Math.max(margin, headerOffset());
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        // floor: a fractional offset never tucks the section under the header
        return Math.floor(Math.max(0, Math.min(y, maxY)));
    }

    // Snap to el's spot and keep it there for `ms`, until the visitor scrolls.
    function hold(el, ms) {
        // html has scroll-behavior: smooth; pause it so each correction snaps.
        const html = document.documentElement;
        const prevBehavior = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        let done = false;
        const stop = () => {
            if (done) return;
            done = true;
            html.style.scrollBehavior = prevBehavior;
            STOP_EVENTS.forEach(type => window.removeEventListener(type, stop));
        };
        STOP_EVENTS.forEach(type => window.addEventListener(type, stop, { passive: true }));

        const deadline = performance.now() + ms;
        (function pin() {
            if (done) return;
            const y = targetScrollY(el);
            if (Math.abs(window.scrollY - y) >= 1) window.scrollTo(0, y);
            performance.now() < deadline ? requestAnimationFrame(pin) : stop();
        })();
    }

    // Glide to the section (snap under reduced motion), then hold it briefly.
    function scrollToSection(el) {
        if (!el?.getClientRects().length) return;
        if (prefersReducedMotion()) return hold(el, 600);

        const y = targetScrollY(el);
        window.scrollTo({ top: y, behavior: 'smooth' });
        let interrupted = false;
        const interrupt = () => { interrupted = true; };
        STOP_EVENTS.forEach(type => window.addEventListener(type, interrupt, { passive: true }));
        const deadline = performance.now() + 3000;
        requestAnimationFrame(function arrive() {
            const tracking = !interrupted && performance.now() < deadline;
            if (tracking && Math.abs(window.scrollY - y) > 2) return requestAnimationFrame(arrive);
            STOP_EVENTS.forEach(type => window.removeEventListener(type, interrupt));
            if (tracking) hold(el, 600);
        });
    }

    // On a fresh load the browser jumps to the fragment as soon as the element
    // is parsed, before the projects, timeline and footer have rendered and
    // grown the page, so /#contact used to land a few sections off. Once the
    // content is in, land it; the boot loader still covers the page at this
    // point, so the jump is instant and never seen. If the page is already
    // showing, glide there like a nav click (unless reduced motion is asked).
    function scrollToHashTarget() {
        if (restoringScroll) return;
        // Reload / back-forward: the browser restores the visitor's own spot.
        const nav = performance.getEntriesByType?.('navigation')?.[0];
        if (nav && nav.type !== 'navigate') return;
        const el = hashTarget();
        if (!el) return;

        const loader = document.getElementById('loading-screen');
        const covered = loader && !loader.classList.contains('hidden');
        covered || prefersReducedMotion() ? hold(el, 2500) : scrollToSection(el);
    }

    // Themes hand blog.js their card renderer from the top of their script,
    // which ThemeManager loads after the theme CSS. Announce it so blog.js can
    // render the moment it lands instead of polling for it.
    function exportBlogRenderer(renderer) {
        window.ThemeBlogCardRenderer = renderer;
        window.dispatchEvent(new Event('blogRendererReady'));
    }

    function whenReady(fn) {
        document.readyState === 'loading'
            ? document.addEventListener('DOMContentLoaded', fn)
            : fn();
    }

    return {
        init,
        exportBlogRenderer,
        whenReady,
        scrollToSection,
        get isInitialized() { return isInitialized; }
    };
})();

window.ThemeInit = ThemeInit;
