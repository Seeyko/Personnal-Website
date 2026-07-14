/**
 * Application Configuration
 *
 * This template is processed by envsubst during Docker build.
 * Environment variables are injected at build/deploy time.
 */
window.APP_CONFIG = {
    // API URL - where the backend API lives
    API_URL: '${API_URL}',

    // Frontend URL - where the frontend is served from
    FRONTEND_URL: '${FRONTEND_URL}',

    // Admin secret path (used by admin.js to build admin API URL)
    ADMIN_SECRET_PATH: '${ADMIN_SECRET_PATH}',

    // Deploy environment. Set ENVIRONMENT=production in the deploy env to enable
    // analytics + the articles API. If it is left empty the domain check below
    // still enables them on the production host, so this can never break prod.
    ENVIRONMENT: '${ENVIRONMENT}'
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
        articlesApi: isProd,
        analytics: isProd
    };
})();
