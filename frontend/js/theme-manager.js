/**
 * Theme Manager - Portfolio theme switching system
 */

const ThemeManager = (() => {
    const THEMES = {
        default: { id: 'default', name: 'Default', description: 'Clean & Minimal', css: '/themes/default/default.css', js: '/themes/default/default.js', icon: '✦' },
        terminal: { id: 'terminal', name: 'Terminal CLI', description: 'Cyber-Industrial Hacker Aesthetic', css: '/themes/terminal/terminal.css', js: '/themes/terminal/terminal.js', icon: '💻' },
        blueprint: { id: 'blueprint', name: 'Blueprint', description: 'Technical Drawing Aesthetic', css: '/themes/blueprint/blueprint.css', js: '/themes/blueprint/blueprint.js', icon: '📐' },
        retro90s: { id: 'retro90s', name: 'Retro 90s', description: 'GeoCities Nostalgia Vibes', css: '/themes/retro90s/retro90s.css', js: '/themes/retro90s/retro90s.js', icon: '🌈' }
    };

    const DEFAULT_THEME = 'default';
    const STORAGE_KEY = 'portfolio_theme';
    const SCROLL_KEY = 'portfolio_scroll';
    let currentThemeId = null;
    let loadingHidden = false;
    let loadingFallback = null;

    const getFromURL = () => new URLSearchParams(window.location.search).get('theme');
    const getSaved = () => { try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; } };
    const save = id => { try { localStorage.setItem(STORAGE_KEY, id); } catch {} };

    // Single source of truth for dismissing the boot loading screen. Idempotent:
    // it fires once, from whichever comes first — the theme reporting it has
    // finished rendering (ThemeInit.init), the error path, or the safety
    // fallback. Hiding it any earlier reveals the page while its in-content
    // spinners are still up, which reads as a second loader (the old bug).
    function hideLoading() {
        if (loadingFallback) { clearTimeout(loadingFallback); loadingFallback = null; }
        if (loadingHidden) return;
        loadingHidden = true;
        const el = document.getElementById('loading-screen');
        if (el) { el.classList.add('hidden'); setTimeout(() => el.remove(), 500); }
        document.body.classList.remove('loading');
    }

    async function loadCSS(theme) {
        const link = document.getElementById('theme-css');
        if (!link) throw new Error('Theme CSS link not found');
        if (link.href?.endsWith(theme.css)) return;
        return new Promise((res, rej) => { link.onload = res; link.onerror = rej; link.href = theme.css; });
    }

    function updateFavicon(themeId) {
        const favicon = document.getElementById('favicon');
        const href = `/assets/brand/favicon-${themeId}.svg`;
        // Only touch the href when it actually changes — reassigning the same
        // value still makes the browser re-request the icon.
        if (favicon && favicon.getAttribute('href') !== href) favicon.href = href;
    }

    async function loadJS(theme) {
        document.getElementById('theme-js')?.remove();
        const script = document.createElement('script');
        script.id = 'theme-js';
        script.src = theme.js + (window.location.hostname === 'localhost' ? `?v=${Date.now()}` : '');
        return new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.body.appendChild(script); });
    }

    async function apply(themeId) {
        const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
        document.body.dataset.theme = themeId;
        currentThemeId = themeId;
        updateFavicon(theme.id);

        try {
            await loadCSS(theme);
            if (window.LanguageManager?.isLoaded) await LanguageManager.loadThemeTranslations(themeId, LanguageManager.currentLang);
            await loadJS(theme);
            console.log(`%c[THEME] Loaded: ${theme.name}`, 'color: #33ff00;');
        } catch (e) {
            console.error('Failed to load theme:', e);
            // The theme JS never ran, so ThemeInit will never signal readiness —
            // dismiss the loader here so a failed theme doesn't hang on the spinner.
            hideLoading();
        }

        const url = new URL(window.location);
        url.searchParams.set('theme', themeId);
        window.history.replaceState({}, '', url);
        save(themeId);
        // NB: on the happy path the loader is dismissed by ThemeInit.init() once
        // content is actually on screen — not here, where only the theme *file*
        // has loaded. See hideLoading().
    }

    function switchTheme(id) {
        if (id === currentThemeId) return;
        // Switching theme reloads the page (each theme ships its own JS), so
        // remember where the visitor was and snap back there once it reloads.
        try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch {}
        const url = new URL(window.location);
        url.searchParams.set('theme', id);
        window.location.href = url.toString();
    }

    // Restore the scroll position saved by switchTheme. Content loads
    // asynchronously and grows the page, so we keep correcting the scroll each
    // frame until we can actually reach the saved spot (or time out / the user
    // takes over). Smooth scroll-behavior is paused so the snap is instant.
    function restoreScroll() {
        let raw = null;
        try { raw = sessionStorage.getItem(SCROLL_KEY); } catch { return; }
        if (raw == null) return;
        try { sessionStorage.removeItem(SCROLL_KEY); } catch {}

        const target = parseInt(raw, 10);
        if (!Number.isFinite(target) || target <= 0) return;

        const html = document.documentElement;
        const prevRestore = 'scrollRestoration' in history ? history.scrollRestoration : null;
        if (prevRestore !== null) history.scrollRestoration = 'manual';
        const prevBehavior = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';

        let done = false;
        const abort = () => finish();
        function finish() {
            if (done) return;
            done = true;
            html.style.scrollBehavior = prevBehavior;
            if (prevRestore !== null) history.scrollRestoration = prevRestore;
            window.removeEventListener('wheel', abort);
            window.removeEventListener('touchstart', abort);
            window.removeEventListener('keydown', abort);
        }
        window.addEventListener('wheel', abort, { passive: true });
        window.addEventListener('touchstart', abort, { passive: true });
        window.addEventListener('keydown', abort);

        const deadline = performance.now() + 3000;
        (function tick() {
            if (done) return;
            const maxY = Math.max(0, html.scrollHeight - window.innerHeight);
            window.scrollTo(0, Math.min(target, maxY));
            if (maxY < target && performance.now() < deadline) {
                requestAnimationFrame(tick);
            } else {
                finish();
            }
        })();
    }

    function createSwitcher() {
        if (document.getElementById('theme-switcher-container')) return;

        const container = document.createElement('div');
        container.id = 'theme-switcher-container';
        container.className = 'theme-switcher';
        container.innerHTML = `
            <button class="theme-switcher-toggle" aria-label="Switch theme">🎨</button>
            <div class="theme-switcher-menu">
                ${Object.values(THEMES).map(t => `
                    <button class="theme-option ${t.id === currentThemeId ? 'active' : ''}" data-theme="${t.id}" title="${t.description}">
                        <span class="theme-icon">${t.icon}</span>
                        <span class="theme-name">${t.name}</span>
                    </button>
                `).join('')}
            </div>
        `;

        const toggle = container.querySelector('.theme-switcher-toggle');
        const menu = container.querySelector('.theme-switcher-menu');

        toggle.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
        container.querySelectorAll('.theme-option').forEach(o => o.addEventListener('click', e => { e.stopPropagation(); switchTheme(o.dataset.theme); }));
        document.addEventListener('click', () => menu.classList.remove('open'));

        const target = document.querySelector('.header-right') || document.querySelector('.header');
        target ? target.appendChild(container) : document.body.appendChild(container);
    }

    function init() {
        restoreScroll();
        // Safety net only: if the theme never reports readiness (broken JS, a
        // theme that doesn't use ThemeInit), dismiss the loader anyway. Cleared
        // by hideLoading() the moment the real ready signal arrives.
        loadingFallback = setTimeout(() => { console.warn('[THEME] Loading fallback'); hideLoading(); }, 6000);
        const themeId = THEMES[getFromURL() || getSaved()] ? (getFromURL() || getSaved()) : DEFAULT_THEME;
        apply(themeId);
        createSwitcher();
    }

    return { init, switchTheme, hideLoading, getCurrentThemeId: () => currentThemeId || getSaved() };
})();

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', ThemeManager.init)
    : ThemeManager.init();

window.ThemeManager = ThemeManager;
