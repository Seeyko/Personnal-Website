/**
 * Admin Dashboard
 * Derives admin API path from window.location.pathname.
 * The page is served at /{SECRET_PATH}, so API is at /api/{SECRET_PATH}/...
 */

const AdminApp = (() => {
    // Derive the admin secret path from the current page URL
    // e.g. if page is at /_mx9k7 or /_mx9k7/, adminPath = "_mx9k7"
    const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '').split('/')[0];
    const apiBase = Utils.getApiBaseUrl();
    const adminApiBase = `${apiBase}/api/${pathSegment}`;

    let selectedSlug = null;
    let articles = [];

    function getApiKey() {
        return sessionStorage.getItem('admin_api_key');
    }

    function setApiKey(key) {
        sessionStorage.setItem('admin_api_key', key);
    }

    function clearApiKey() {
        sessionStorage.removeItem('admin_api_key');
    }

    function authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiKey()}`
        };
    }

    async function apiRequest(path, options = {}) {
        const url = `${adminApiBase}${path}`;
        const opts = {
            ...options,
            headers: {
                ...authHeaders(),
                ...(options.headers || {})
            }
        };
        const response = await fetch(url, opts);
        if (response.status === 401) {
            clearApiKey();
            showLogin();
            throw new Error('Unauthorized');
        }
        return response;
    }

    // --- UI State ---

    function showLogin() {
        document.getElementById('admin-login').style.display = '';
        document.getElementById('admin-dashboard').style.display = 'none';
    }

    function showDashboard() {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = '';
    }

    // --- Login ---

    async function login(apiKey) {
        setApiKey(apiKey);
        try {
            const resp = await apiRequest('/articles');
            if (!resp.ok) {
                clearApiKey();
                return false;
            }
            showDashboard();
            await loadArticles();
            return true;
        } catch {
            clearApiKey();
            return false;
        }
    }

    // --- Articles ---

    async function loadArticles() {
        const lang = document.getElementById('lang-filter').value;
        try {
            const resp = await apiRequest(`/articles?lang=${lang}`);
            const data = await resp.json();
            articles = data.articles || [];
            renderArticlesTable(articles);
        } catch {
            // Error handled by apiRequest (auto-logout on 401)
        }
    }

    function renderArticlesTable(arts) {
        const tbody = document.getElementById('articles-tbody');

        if (!arts.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">No articles found.</td></tr>';
            return;
        }

        tbody.innerHTML = arts.map(a => `
            <tr>
                <td class="admin-td-title">${escapeHtml(a.title)}</td>
                <td><span class="admin-badge admin-badge-lang">${a.lang.toUpperCase()}</span></td>
                <td><span class="admin-badge admin-badge-${a.visibility}">${a.visibility}</span></td>
                <td>${a.totalViews || 0}</td>
                <td>${a.linkCount || 0}</td>
                <td class="admin-td-actions">
                    <button class="admin-btn admin-btn-sm" onclick="AdminApp.selectArticle('${escapeAttr(a.slug)}', '${escapeAttr(a.title)}')">Links</button>
                    <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="AdminApp.loadStats('${escapeAttr(a.slug)}', '${escapeAttr(a.title)}')">Stats</button>
                </td>
            </tr>
        `).join('');
    }

    // --- Share Links ---

    async function selectArticle(slug, title) {
        selectedSlug = slug;
        document.getElementById('selected-article-title').textContent = title;
        document.getElementById('share-link-panel').style.display = '';
        document.getElementById('stats-panel').style.display = 'none';
        await loadShareLinks(slug);
    }

    async function loadShareLinks(slug) {
        const container = document.getElementById('share-links-list');
        container.innerHTML = '<p class="admin-loading">Loading links...</p>';

        try {
            const resp = await apiRequest(`/articles/${slug}/share-links`);
            const data = await resp.json();
            const links = data.links || [];
            renderShareLinks(links);
        } catch {
            container.innerHTML = '<p class="admin-error">Failed to load links.</p>';
        }
    }

    function renderShareLinks(links) {
        const container = document.getElementById('share-links-list');

        if (!links.length) {
            container.innerHTML = '<p class="admin-empty">No share links yet. Create one above.</p>';
            return;
        }

        container.innerHTML = links.map(link => {
            const isActive = !link.revoked && (!link.expiresAt || new Date(link.expiresAt) > new Date()) && (link.maxUses === null || link.useCount < link.maxUses);
            const statusClass = link.revoked ? 'revoked' : (isActive ? 'active' : 'expired');
            const statusText = link.revoked ? 'Revoked' : (isActive ? 'Active' : 'Expired/Maxed');

            return `
                <div class="admin-link-card">
                    <div class="admin-link-info">
                        <div class="admin-link-label">${escapeHtml(link.label || 'Unnamed')}</div>
                        <div class="admin-link-meta">
                            <span class="admin-badge admin-badge-${statusClass}">${statusText}</span>
                            <span>Uses: ${link.useCount}${link.maxUses !== null ? '/' + link.maxUses : ''}</span>
                            ${link.expiresAt ? `<span>Expires: ${new Date(link.expiresAt).toLocaleDateString()}</span>` : ''}
                            <span>Created: ${new Date(link.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="admin-link-actions">
                        ${isActive ? `
                            <button class="admin-btn admin-btn-sm" onclick="AdminApp.copyShareLink('${escapeAttr(link.url)}')">Copy URL</button>
                            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="AdminApp.revokeShareLink(${link.id})">Revoke</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function createShareLink() {
        if (!selectedSlug) return;

        const label = document.getElementById('link-label').value.trim();
        const maxUsesVal = document.getElementById('link-max-uses').value;
        const expiresIn = document.getElementById('link-expiry').value;

        const body = { label };
        if (maxUsesVal) body.maxUses = parseInt(maxUsesVal, 10);
        if (expiresIn) body.expiresIn = expiresIn;

        try {
            const resp = await apiRequest(`/articles/${selectedSlug}/share-links`, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (resp.ok) {
                // Clear form
                document.getElementById('link-label').value = '';
                document.getElementById('link-max-uses').value = '';
                document.getElementById('link-expiry').value = '';
                // Refresh list
                await loadShareLinks(selectedSlug);
            }
        } catch {
            // Handled by apiRequest
        }
    }

    async function copyShareLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            // Brief visual feedback - find the button that was clicked
            const btn = event.target;
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = original; }, 1500);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    async function revokeShareLink(id) {
        if (!confirm('Revoke this share link? This cannot be undone.')) return;

        try {
            await apiRequest(`/share-links/${id}`, { method: 'DELETE' });
            if (selectedSlug) await loadShareLinks(selectedSlug);
        } catch {
            // Handled by apiRequest
        }
    }

    // --- Stats ---

    async function loadStats(slug, title) {
        document.getElementById('stats-article-title').textContent = title;
        document.getElementById('stats-panel').style.display = '';
        document.getElementById('share-link-panel').style.display = 'none';

        try {
            const resp = await apiRequest(`/articles/${slug}/stats`);
            const stats = await resp.json();
            renderStats(stats);
        } catch {
            document.getElementById('stat-total-views').textContent = '-';
            document.getElementById('stat-unique-visitors').textContent = '-';
        }
    }

    function renderStats(stats) {
        document.getElementById('stat-total-views').textContent = stats.totalViews || 0;
        document.getElementById('stat-unique-visitors').textContent = stats.uniqueVisitors || 0;

        // Views by method pie chart (CSS-based)
        renderMethodChart(stats.viewsByMethod || {});

        // Views per link
        renderLinkViews(stats.viewsByLink || []);

        // Daily views bar chart
        renderDailyChart(stats.dailyViews || []);
    }

    function renderMethodChart(methods) {
        const container = document.getElementById('method-chart');
        const total = Object.values(methods).reduce((a, b) => a + b, 0);

        if (!total) {
            container.innerHTML = '<p class="admin-empty">No data yet.</p>';
            return;
        }

        const colors = { public: '#10b981', password: '#f59e0b', share_link: '#6366f1' };
        const entries = Object.entries(methods);

        container.innerHTML = `
            <div class="admin-pie-bars">
                ${entries.map(([method, count]) => {
                    const pct = ((count / total) * 100).toFixed(1);
                    return `
                        <div class="admin-pie-row">
                            <span class="admin-pie-label">${method}</span>
                            <div class="admin-pie-bar-track">
                                <div class="admin-pie-bar-fill" style="width: ${pct}%; background: ${colors[method] || '#888'}"></div>
                            </div>
                            <span class="admin-pie-value">${count} (${pct}%)</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderLinkViews(linkViews) {
        const container = document.getElementById('link-views-list');

        if (!linkViews.length) {
            container.innerHTML = '<p class="admin-empty">No link views yet.</p>';
            return;
        }

        container.innerHTML = linkViews.map(lv => `
            <div class="admin-link-view-row">
                <span class="admin-link-view-label">${escapeHtml(lv.label || 'Link #' + lv.linkId)}</span>
                <span class="admin-link-view-count">${lv.views} views (${lv.unique} unique)</span>
            </div>
        `).join('');
    }

    function renderDailyChart(daily) {
        const container = document.getElementById('daily-chart');

        if (!daily.length) {
            container.innerHTML = '<p class="admin-empty">No daily data yet.</p>';
            return;
        }

        const max = Math.max(...daily.map(d => d.views), 1);

        container.innerHTML = `
            <div class="admin-bar-rows">
                ${daily.map(d => {
                    const pct = ((d.views / max) * 100).toFixed(1);
                    return `
                        <div class="admin-bar-row">
                            <span class="admin-bar-date">${d.date.slice(5)}</span>
                            <div class="admin-bar-track">
                                <div class="admin-bar-fill" style="width: ${pct}%"></div>
                            </div>
                            <span class="admin-bar-value">${d.views}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // --- Helpers ---

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // --- Init ---

    function init() {
        // Wire up login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('api-key-input');
            const error = document.getElementById('login-error');
            const key = input.value.trim();

            if (!key) return;

            const success = await login(key);
            if (!success) {
                error.textContent = 'Invalid API key. Please try again.';
                error.style.display = 'block';
                input.value = '';
                input.focus();
            }
        });

        // Wire up language filter
        document.getElementById('lang-filter').addEventListener('change', () => loadArticles());

        // Wire up create link button
        document.getElementById('create-link-btn').addEventListener('click', () => createShareLink());

        // Wire up close buttons
        document.getElementById('close-link-panel').addEventListener('click', () => {
            document.getElementById('share-link-panel').style.display = 'none';
            selectedSlug = null;
        });
        document.getElementById('close-stats-panel').addEventListener('click', () => {
            document.getElementById('stats-panel').style.display = 'none';
        });

        // Sync lang-filter with LanguageManager (survives page reload)
        const currentLang = window.LanguageManager?.currentLang || 'fr';
        document.getElementById('lang-filter').value = currentLang;

        // Check if already authenticated
        if (getApiKey()) {
            login(getApiKey());
        } else {
            showLogin();
        }

        // Remove loading state
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
        document.getElementById('loading-screen')?.classList.add('hidden');
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API (for inline onclick handlers)
    return {
        selectArticle,
        loadStats,
        copyShareLink,
        revokeShareLink
    };
})();
