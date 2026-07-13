/**
 * Application Configuration
 *
 * This file is replaced at deploy time with environment-specific values.
 * For local development, use the defaults below.
 *
 * In Docker, this file is generated from config.template.js using envsubst.
 */
window.APP_CONFIG = {
    // API URL - where the backend API lives
    // Local dev: http://localhost:3000
    // Production: https://api.tomandrieu.com
    API_URL: 'http://localhost:3000',

    // Frontend URL - where the frontend is served from
    // Local dev: http://localhost:8000
    // Production: https://tomandrieu.com
    FRONTEND_URL: 'http://localhost:8000',

    // Admin secret path (used by admin.js to build admin API URL)
    // Must match ADMIN_SECRET_PATH in backend
    ADMIN_SECRET_PATH: '_mx9k7',

    // Deploy environment. Stamped to 'production' at deploy time
    // (config.template.js <- ${ENVIRONMENT}). Left as 'development' for local
    // dev and preview sandboxes. This ONLY tightens local/preview behavior —
    // production is unchanged. Off-production we skip requests that can't
    // succeed there anyway (no backend, blocked third parties), so the console
    // stays clean while running the static site standalone.
    ENVIRONMENT: 'development'
};

// Derived runtime flags. Production = the deploy stamped ENVIRONMENT=production,
// OR the page is actually served from the production domain (safety net so prod
// never silently loses analytics / the articles API if the env var is missing).
(function () {
    var host = (typeof location !== 'undefined' && location.hostname) || '';
    var env = (window.APP_CONFIG.ENVIRONMENT || '').toLowerCase();
    var isProd = env === 'production' || /(^|\.)tomandrieu\.com$/i.test(host);
    window.APP_CONFIG.IS_PRODUCTION = isProd;
    window.APP_CONFIG.FEATURES = {
        // The blog/articles backend only exists in production; calling it from a
        // static local/preview host just yields a refused connection.
        articlesApi: isProd,
        // Analytics is additionally host-gated in analytics.js (it loads before
        // this file), this flag mirrors the intent for any later consumer.
        analytics: isProd
    };
})();
