/**
 * Blog Page - Handles listing and article views
 */

let currentPage = 1;
const ITEMS_PER_PAGE = 10;

function getViewFromURL() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const match = path.match(/^\/blog\/([^\/]+)\/?$/);

    const shareToken = params.get('token') || null;

    if (match?.[1]) return { view: 'article', slug: match[1], shareToken };
    if (params.get('slug')) return { view: 'article', slug: params.get('slug'), shareToken };
    return { view: 'listing', page: parseInt(params.get('page')) || 1 };
}

async function fetchArticle(slug, shareToken) {
    const apiBase = Utils.getApiBaseUrl();
    const lang = window.LanguageManager?.currentLang || 'fr';

    // Récupérer le token stocké pour cet article (password JWT)
    const jwtToken = localStorage.getItem(`article_token_${slug}`);

    const headers = {
        'Content-Type': 'application/json'
    };

    if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    // Build URL with share token if present
    let url = `${apiBase}/api/articles/${slug}?lang=${lang}`;
    if (shareToken) {
        url += `&token=${encodeURIComponent(shareToken)}`;
    }

    try {
        const response = await fetch(url, { headers });

        if (response.status === 403) {
            const data = await response.json().catch(() => ({}));
            if (data.error === 'invalid_token') {
                return { slug, accessDenied: true, reason: 'invalid_token' };
            }
            return { slug, accessDenied: true, reason: 'access_denied' };
        }

        if (!response.ok) return null;

        const data = await response.json();

        // Si l'article nécessite un mot de passe
        if (data.requiresPassword) {
            return { ...data.article, requiresPassword: true };
        }

        if (data.article?.coverImage) {
            data.article.coverImage = `${apiBase}${data.article.coverImage}`;
        }

        return data.article;
    } catch {
        return null;
    }
}

async function fetchArticles(page = 1) {
    const apiBase = Utils.getApiBaseUrl();
    const lang = window.LanguageManager?.currentLang || 'fr';
    try {
        const response = await fetch(`${apiBase}/api/articles?page=${page}&lang=${lang}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (data.articles) {
            data.articles = data.articles.map(a => ({
                ...a,
                coverImage: a.coverImage ? `${apiBase}${a.coverImage}` : null
            }));
        }
        return data;
    } catch {
        return { articles: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
}

function renderArticleList(articles) {
    const container = document.getElementById('blog-list');
    if (!container) return;

    const loading = container.querySelector('.blog-list-loading');
    if (loading) loading.style.display = 'none';

    if (!articles?.length) {
        const noArticlesText = window.LanguageManager?.t('ui.noArticles') || 'No articles yet. Check back soon!';
        container.innerHTML = `<p class="no-articles">${noArticlesText}</p>`;
        return;
    }

    container.innerHTML = '';
    const renderer = window.ThemeBlogCardRenderer || ((a, i) => CardRenderer.renderBlogCard(a, i, {}));

    articles.forEach((article, index) => {
        const card = renderer(article, index);
        card.classList.add('blog-list-card');
        container.appendChild(card);
    });

    initListAnimations();
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const { page, hasNext } = pagination;

    // Show "Load More" button only if there are more articles
    if (hasNext) {
        container.innerHTML = `
            <div class="pagination-controls">
                <button class="pagination-btn load-more" data-page="${page + 1}">
                    ${window.LanguageManager?.t('ui.loadMore') || 'Load more'}
                </button>
            </div>
        `;

        container.querySelector('[data-page]').addEventListener('click', e => {
            e.preventDefault();
            navigateToPage(parseInt(e.target.dataset.page));
        });
    } else {
        container.innerHTML = '';
    }
}

async function navigateToPage(page) {
    currentPage = page;
    window.history.pushState({}, '', `/blog/?page=${page}`);
    const data = await fetchArticles(page);
    renderArticleList(data.articles);
    renderPagination(data.pagination);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderArticle(article) {
    document.getElementById('blog-listing').style.display = 'none';
    document.getElementById('article-view').style.display = 'block';

    // Handle access denied states
    if (article.accessDenied) {
        showAccessDenied(article);
        return;
    }

    document.title = `${article.title} - Tom Andrieu`;

    document.getElementById('article-title').textContent = article.title;
    document.getElementById('article-date').textContent = ContentLoader.formatDate(article.publishedAt);
    document.getElementById('article-reading-time').textContent = `${article.readingTime} ${window.LanguageManager?.t('blog.minRead') || 'min read'}`;

    // Si l'article nécessite un mot de passe
    if (article.requiresPassword) {
        showPasswordPrompt(article);
        return;
    }

    document.getElementById('article-content').innerHTML = article.content;

    const cover = document.getElementById('article-cover');
    if (article.coverImage) {
        cover.innerHTML = `<img src="${article.coverImage}" alt="${article.title}" class="article-cover-img">`;
        cover.style.display = 'block';
    } else {
        cover.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
}

function showAccessDenied(article) {
    document.title = 'Access Denied - Tom Andrieu';
    document.getElementById('article-title').textContent = '';
    document.getElementById('article-date').textContent = '';
    document.getElementById('article-reading-time').textContent = '';
    document.getElementById('article-cover').style.display = 'none';

    const content = document.getElementById('article-content');
    const isInvalidToken = article.reason === 'invalid_token';

    const icon = isInvalidToken ? '🔗' : '🔒';
    const title = isInvalidToken
        ? (window.LanguageManager?.t('blog.invalidToken') || 'Invalid or Expired Link')
        : (window.LanguageManager?.t('blog.accessDenied') || 'Private Article');
    const message = isInvalidToken
        ? (window.LanguageManager?.t('blog.invalidTokenMsg') || 'This share link is no longer valid. It may have expired or been revoked.')
        : (window.LanguageManager?.t('blog.accessDeniedMsg') || 'This article is not publicly available.');
    const backText = window.LanguageManager?.t('blog.backToBlog') || 'Back to Blog';

    content.innerHTML = `
        <div class="access-denied-prompt">
            <div class="access-denied-icon">${icon}</div>
            <h3>${title}</h3>
            <p>${message}</p>
            <a href="/blog/" class="access-denied-back">${backText}</a>
        </div>
    `;

    window.scrollTo({ top: 0, behavior: 'instant' });
}

function showPasswordPrompt(article) {
    const content = document.getElementById('article-content');
    const t = (key, fallback) => window.LanguageManager?.t(key) || fallback;
    content.innerHTML = `
        <div class="password-prompt">
            <div class="password-prompt-icon">🔒</div>
            <h3>${t('blog.privateTitle', 'This article is private')}</h3>
            <p>${t('blog.privateMsg', 'Enter the password to access this content.')}</p>
            <form id="password-form" class="password-form">
                <input 
                    type="password" 
                    id="password-input" 
                    placeholder="${t('blog.passwordPlaceholder', 'Password')}" 
                    class="password-input"
                    autocomplete="off"
                    required
                />
                <button type="submit" class="password-submit">${t('blog.unlock', 'Unlock')}</button>
            </form>
            <div id="password-error" class="password-error" style="display: none;"></div>
        </div>
    `;

    const form = document.getElementById('password-form');
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = input.value;

        try {
            const apiBase = Utils.getApiBaseUrl();
            const response = await fetch(`${apiBase}/api/articles/${article.slug}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                error.textContent = window.LanguageManager?.t('blog.invalidPassword') || 'Invalid password. Please try again.';
                error.style.display = 'block';
                input.value = '';
                input.focus();
                return;
            }

            const data = await response.json();

            // Stocker le token
            localStorage.setItem(`article_token_${article.slug}`, data.token);

            // Recharger l'article
            const unlockedArticle = await fetchArticle(article.slug);
            if (unlockedArticle && !unlockedArticle.requiresPassword) {
                renderArticle(unlockedArticle);
            }
        } catch (err) {
            error.textContent = 'An error occurred. Please try again.';
            error.style.display = 'block';
        }
    });

    input.focus();
}

function showNotFound() {
    const container = document.getElementById('blog-list');
    if (container) {
        const t = (key, fallback) => window.LanguageManager?.t(key) || fallback;
        container.innerHTML = `
            <div class="not-found">
                <h2>${t('blog.notFoundTitle', 'Article Not Found')}</h2>
                <p>${t('blog.notFoundMsg', "Sorry, the article you're looking for doesn't exist.")}</p>
                <a href="/blog/" class="back-link">&larr; ${t('blog.backToBlog', 'Back to Blog')}</a>
            </div>
        `;
    }
    document.getElementById('pagination').innerHTML = '';
}

function initListAnimations() {
    const cards = document.querySelectorAll('.blog-list-card');
    if (!cards.length) return;

    // Use GSAP if available
    if (typeof gsap !== 'undefined') {
        gsap.utils.toArray(cards).forEach((card, i) => {
            gsap.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.1, ease: 'power3.out' });
        });
        return;
    }

    // Native fallback: staggered CSS animations
    cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        // Stagger the animations
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, i * 100);
    });
}

function waitForThemeRenderer(timeout = 2000) {
    return new Promise(resolve => {
        if (window.ThemeBlogCardRenderer) return resolve(true);
        const start = Date.now();
        const check = setInterval(() => {
            if (window.ThemeBlogCardRenderer) { clearInterval(check); resolve(true); }
            else if (Date.now() - start > timeout) { clearInterval(check); resolve(false); }
        }, 50);
    });
}

async function initBlog() {
    const { view, slug, page, shareToken } = getViewFromURL();
    await waitForThemeRenderer();

    if (view === 'article' && slug) {
        const article = await fetchArticle(slug, shareToken);
        article ? renderArticle(article) : showNotFound();
    } else {
        currentPage = page || 1;
        const data = await fetchArticles(currentPage);
        renderArticleList(data.articles);
        renderPagination(data.pagination);
    }

    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
    document.getElementById('loading-screen')?.classList.add('hidden');
}

window.addEventListener('popstate', async () => {
    const { view, slug, page, shareToken } = getViewFromURL();

    if (view === 'article' && slug) {
        const article = await fetchArticle(slug, shareToken);
        article ? renderArticle(article) : showNotFound();
    } else {
        document.getElementById('blog-listing').style.display = 'block';
        document.getElementById('article-view').style.display = 'none';
        document.title = 'Blog - Tom Andrieu';
        const data = await fetchArticles(page || 1);
        renderArticleList(data.articles);
        renderPagination(data.pagination);
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlog);
} else {
    initBlog();
}
