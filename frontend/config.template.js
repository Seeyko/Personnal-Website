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
    ADMIN_SECRET_PATH: '${ADMIN_SECRET_PATH}'
};
