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

            // The blog (blog.html + its SSR twin) and admin pages load a lean script
            // set without these homepage modules, so only run what the page loaded.
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

            if (document.querySelector('#blog-grid')) {
                const articles = await ContentLoader.loadArticles(1, 3);
                if (articles.articles?.length) {
                    CardRenderer.renderBlogCards(articles.articles, config.blogCards || config.cards || {}, '#blog-grid');
                    window.ScrollEffects?.animateBlogCards();
                }
            }

            if (config.cursor && window.CursorTracker) new CursorTracker(config.cursor);

            if (config.headerScroll) {
                typeof config.headerScroll === 'string'
                    ? HeaderScroll.usePreset(config.headerScroll)
                    : HeaderScroll.init(config.headerScroll);
            }

            if (config.konami && window.KonamiCode) KonamiCode.init(config.konami);
            // Theme effects decorate the homepage (fps HUD, retro assistant, terminal
            // enderman...); the blog and admin pages stay CSS-only for every theme.
            const onHome = !!document.querySelector('#work-grid');
            if (config.initEffects && onHome) config.initEffects();
            if (window.LanguageSwitcher) LanguageSwitcher.init();

            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
            isInitialized = true;

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
