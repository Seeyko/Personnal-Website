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
    ADMIN_SECRET_PATH: '***REMOVED***'
};
