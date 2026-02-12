/**
 * Blog Page - Handles listing and article views
 */

let currentPage = 1;
const ITEMS_PER_PAGE = 6;

function getViewFromURL() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const match = path.match(/^\/blog\/([^\/]+)\/?$/);

    if (match?.[1]) return { view: 'article', slug: match[1] };
    if (params.get('slug')) return { view: 'article', slug: params.get('slug') };
    return { view: 'listing', page: parseInt(params.get('page')) || 1 };
}

async function fetchArticle(slug) {
    const apiBase = Utils.getApiBaseUrl();
    const lang = window.LanguageManager?.currentLang || 'fr';

    // Récupérer le token stocké pour cet article
    const token = localStorage.getItem(`article_token_${slug}`);

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${apiBase}/api/articles/${slug}?lang=${lang}`, {
            headers: headers
        });

        if (!response.ok) return response.status === 404 ? null : null;

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

async function fetchArticles(page = 1, limit = ITEMS_PER_PAGE) {
    const apiBase = Utils.getApiBaseUrl();
    const lang = window.LanguageManager?.currentLang || 'fr';
    try {
        const response = await fetch(`${apiBase}/api/articles?page=${page}&limit=${limit}&lang=${lang}`);
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
        return { articles: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
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
    if (!container || pagination.totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    const { page, totalPages, hasNext, hasPrev } = pagination;

    container.innerHTML = `
        <div class="pagination-controls">
            ${hasPrev ? `<a href="/blog/?page=${page - 1}" class="pagination-btn prev" data-page="${page - 1}">&larr; Prev</a>` : '<span class="pagination-btn prev disabled">&larr; Prev</span>'}
            <div class="pagination-numbers">
                ${Array.from({ length: totalPages }, (_, i) => i + 1)
                    .map(n => n === page ? `<span class="pagination-num active">${n}</span>` : `<a href="/blog/?page=${n}" class="pagination-num" data-page="${n}">${n}</a>`)
                    .join('')}
            </div>
            ${hasNext ? `<a href="/blog/?page=${page + 1}" class="pagination-btn next" data-page="${page + 1}">Next &rarr;</a>` : '<span class="pagination-btn next disabled">Next &rarr;</span>'}
        </div>
    `;

    container.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateToPage(parseInt(link.dataset.page));
        });
    });
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
    document.title = `${article.title} - Tom Andrieu`;

    document.getElementById('article-title').textContent = article.title;
    document.getElementById('article-date').textContent = ContentLoader.formatDate(article.publishedAt);
    document.getElementById('article-reading-time').textContent = `${article.readingTime} min read`;

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

function showPasswordPrompt(article) {
    const content = document.getElementById('article-content');
    content.innerHTML = `
        <div class="password-prompt">
            <div class="password-prompt-icon">🔒</div>
            <h3>This article is private</h3>
            <p>Enter the password to access this content.</p>
            <form id="password-form" class="password-form">
                <input 
                    type="password" 
                    id="password-input" 
                    placeholder="Password" 
                    class="password-input"
                    autocomplete="off"
                    required
                />
                <button type="submit" class="password-submit">Unlock</button>
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
                error.textContent = 'Invalid password. Please try again.';
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
        container.innerHTML = `
            <div class="not-found">
                <h2>Article Not Found</h2>
                <p>Sorry, the article you're looking for doesn't exist.</p>
                <a href="/blog/" class="back-link">&larr; Back to Blog</a>
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
    const { view, slug, page } = getViewFromURL();
    await waitForThemeRenderer();

    if (view === 'article' && slug) {
        const article = await fetchArticle(slug);
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
    const { view, slug, page } = getViewFromURL();

    if (view === 'article' && slug) {
        const article = await fetchArticle(slug);
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
