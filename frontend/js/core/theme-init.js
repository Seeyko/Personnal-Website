/**
 * Theme Initialization - Standard pattern for all themes
 */

const ThemeInit = (() => {
    let isInitialized = false;

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

            Carousel.initAll();

            ScrollEffects.initAll();
            ScrollEffects.initResizeHandler();
            ScrollEffects.initSmoothScroll();

            // Git Timeline is lazy-loaded + initialized via an IntersectionObserver
            // in index.html (it nears the 3rd section), so it is NOT initialized here.

            // Only fetch blog articles on pages that actually render them.
            // The homepage has no #blog-grid, so we skip the request entirely
            // (avoids a failed call + console error when the backend is down).
            if (document.querySelector('#blog-grid')) {
                const articles = await ContentLoader.loadArticles(1, 3);
                if (articles.articles?.length) {
                    CardRenderer.renderBlogCards(articles.articles, config.blogCards || config.cards || {}, '#blog-grid');
                    ScrollEffects.animateBlogCards();
                }
            }

            if (config.cursor) new CursorTracker(config.cursor);

            if (config.headerScroll) {
                typeof config.headerScroll === 'string'
                    ? HeaderScroll.usePreset(config.headerScroll)
                    : HeaderScroll.init(config.headerScroll);
            }

            if (config.konami) KonamiCode.init(config.konami);
            if (config.initEffects) config.initEffects();
            if (window.LanguageSwitcher) LanguageSwitcher.init();

            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
            isInitialized = true;

            config.onReady?.();
            console.log(`%c[${name.toUpperCase()}] Ready`, 'color: #33ff00;');
        } catch (err) {
            console.error(`%c[${name.toUpperCase()}] Failed:`, 'color: #ff3333;', err);
            throw err;
        }
    }

    function exportBlogRenderer(renderer) {
        window.ThemeBlogCardRenderer = renderer;
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
        get isInitialized() { return isInitialized; }
    };
})();

window.ThemeInit = ThemeInit;
