/**
 * Language Manager - i18n for the portfolio
 * Detection: URL param > server-rendered page > localStorage > browser > default
 *
 * The production blog is rendered by the Go SSR (backend/handlers/ssr.go),
 * which picks the articles' language itself: ?lang, then the `lang` cookie,
 * then Accept-Language. Both sides agree on one choice: every language settled
 * here is also written to that cookie, the browser fallback ranks languages
 * the way the SSR reads Accept-Language, and on a server-rendered page the UI
 * takes the language the server rendered in. So the blog's articles are always
 * in the language of the UI around them.
 */

const LanguageManager = (() => {
    const SUPPORTED_LANGS = ['en', 'fr'];
    const DEFAULT_LANG = 'fr';
    const STORAGE_KEY = 'portfolio_lang';
    const COOKIE_NAME = 'lang'; // read by the Go SSR (detectLang)

    // A Go-rendered page declares window.__SSR_DATA__ and states the language
    // of its content in <html lang> (read now, before init() rewrites it).
    const SERVER_LANG = (() => {
        if (window.__SSR_DATA__ === undefined) return null;
        const lang = document.documentElement.lang;
        return SUPPORTED_LANGS.includes(lang) ? lang : null;
    })();

    // Known from the start (detection is synchronous), so anything rendered
    // before init() resolves already reads the right language. init() only
    // changes it if that locale fails to load.
    let currentLang = detectLanguage();
    let translations = {};
    let themeTranslations = {};
    let isLoaded = false;
    let initPromise = null;
    let resolveReady;
    // Settles with the language init() actually applied.
    const ready = new Promise(resolve => { resolveReady = resolve; });

    function detectLanguage() {
        const urlLang = new URLSearchParams(window.location.search).get('lang');
        if (urlLang && SUPPORTED_LANGS.includes(urlLang)) return urlLang;

        // The articles on this page are already in this language.
        if (SERVER_LANG) return SERVER_LANG;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
        } catch {}

        // First supported language in the browser's ranked list, as the SSR
        // reads Accept-Language ("en-US, fr" → en; "de, en" → en; "de" → default).
        const ranked = navigator.languages?.length ? navigator.languages : [navigator.language];
        const browser = ranked
            .map(tag => String(tag || '').split('-')[0].toLowerCase())
            .find(lang => SUPPORTED_LANGS.includes(lang));
        return browser || DEFAULT_LANG;
    }

    // Where the language is kept: localStorage for this script, the cookie for
    // the SSR, so the next /blog request is rendered in the same language.
    function remember(lang) {
        try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
        try {
            const secure = window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax${secure}`;
        } catch {}
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

    // Idempotent: the theme (via ContentLoader) and blog.js both call it on
    // load; they now share one detection + fetch instead of racing two.
    function init() {
        if (!initPromise) {
            initPromise = applyDetectedLanguage().catch(err => {
                initPromise = null;
                throw err;
            });
        }
        return initPromise;
    }

    async function applyDetectedLanguage() {
        currentLang = detectLanguage();
        try {
            await loadTranslations(currentLang);
        } catch {
            if (currentLang !== DEFAULT_LANG) {
                currentLang = DEFAULT_LANG;
                await loadTranslations(DEFAULT_LANG);
            }
        }

        remember(currentLang);
        const url = new URL(window.location);
        url.searchParams.set('lang', currentLang);
        window.history.replaceState({}, '', url);
        document.documentElement.lang = currentLang;
        isLoaded = true;
        resolveReady(currentLang);
        return currentLang;
    }

    async function setLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) return;

        currentLang = lang;
        await loadTranslations(lang);

        const themeId = window.ThemeManager?.getCurrentThemeId?.();
        if (themeId) await loadThemeTranslations(themeId, lang);

        remember(lang);
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
        get ready() { return ready; },
        SUPPORTED_LANGS,
        DEFAULT_LANG
    };
})();

window.LanguageManager = LanguageManager;
