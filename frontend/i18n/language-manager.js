/**
 * Language Manager - i18n for the portfolio
 * Detection: URL param > localStorage > browser > default
 */

const LanguageManager = (() => {
    const SUPPORTED_LANGS = ['en', 'fr'];
    const DEFAULT_LANG = 'fr';
    const STORAGE_KEY = 'portfolio_lang';

    let currentLang = DEFAULT_LANG;
    let translations = {};
    let themeTranslations = {};
    let isLoaded = false;

    function detectLanguage() {
        const urlLang = new URLSearchParams(window.location.search).get('lang');
        if (urlLang && SUPPORTED_LANGS.includes(urlLang)) return urlLang;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
        } catch {}

        const browser = navigator.language?.split('-')[0];
        if (browser && SUPPORTED_LANGS.includes(browser)) return browser;

        return DEFAULT_LANG;
    }

    async function loadTranslations(lang) {
        try {
            const res = await fetch(`/i18n/locales/${lang}.json`);
            if (!res.ok) throw new Error();
            translations = await res.json();
            console.log(`%c[i18n] Loaded: ${lang}`, 'color: #33ff00;');
        } catch {
            translations = {};
            throw new Error(`Failed to load ${lang}`);
        }
    }

    async function loadThemeTranslations(themeId, lang) {
        try {
            const res = await fetch(`/i18n/themes/${themeId}/${lang}.json`);
            themeTranslations = res.ok ? await res.json() : {};
        } catch {
            themeTranslations = {};
        }
    }

    function t(key, params = {}) {
        let value = Utils.getNestedValue(themeTranslations, key) || Utils.getNestedValue(translations, key);
        if (value === undefined) return key;
        if (Array.isArray(value)) return value;

        if (params && typeof value === 'string') {
            Object.keys(params).forEach(p => {
                value = value.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
            });
        }
        return value;
    }

    function populateTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const value = t(key);
            if (value && typeof value === 'string' && value !== key) {
                el.innerHTML = value
                    .replace(/<highlight>/g, '<span class="highlight">')
                    .replace(/<\/highlight>/g, '</span>');
            }
        });
    }

    async function init() {
        currentLang = detectLanguage();
        try {
            await loadTranslations(currentLang);
        } catch {
            if (currentLang !== DEFAULT_LANG) {
                currentLang = DEFAULT_LANG;
                await loadTranslations(DEFAULT_LANG);
            }
        }

        try { localStorage.setItem(STORAGE_KEY, currentLang); } catch {}
        const url = new URL(window.location);
        url.searchParams.set('lang', currentLang);
        window.history.replaceState({}, '', url);
        document.documentElement.lang = currentLang;
        isLoaded = true;
        return currentLang;
    }

    async function setLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) return;

        currentLang = lang;
        await loadTranslations(lang);

        const themeId = window.ThemeManager?.getCurrentThemeId?.();
        if (themeId) await loadThemeTranslations(themeId, lang);

        try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
        // Set cookie for SSR language detection
        try { document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`; } catch {}
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
        document.documentElement.lang = lang;

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString(
            currentLang === 'fr' ? 'fr-FR' : 'en-US',
            { year: 'numeric', month: 'short', day: 'numeric' }
        );
    }

    return {
        init,
        setLanguage,
        loadThemeTranslations,
        t,
        populateTranslations,
        formatDate,
        getLanguageName: lang => ({ en: 'English', fr: 'Francais' }[lang] || lang),
        get currentLang() { return currentLang; },
        get isLoaded() { return isLoaded; },
        SUPPORTED_LANGS,
        DEFAULT_LANG
    };
})();

window.LanguageManager = LanguageManager;
