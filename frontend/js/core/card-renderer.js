/**
 * Card Renderer - Configurable rendering for project and blog cards
 */

const CardRenderer = (() => {
    const defaultConfig = {
        project: {
            wrapperClass: 'project-card fade-in-up',
            showIndex: false, indexPrefix: '', indexPadding: 2,
            showType: false, typePrefix: '', typeSuffix: '',
            titlePrefix: '', tagWrapper: '{tag}',
            showUrl: false, urlIcon: '&#8594;',
            headerTemplate: null, footerTemplate: null,
            extraClasses: '', cornerDecorations: false, onRender: null
        },
        blog: {
            wrapperClass: 'blog-card fade-in-up',
            showIndex: false, indexPrefix: 'BLOG-', indexPadding: 2,
            titlePrefix: '', dateFormat: null, showNewBadge: false,
            headerTemplate: null, cornerDecorations: false, onRender: null
        }
    };

    function createMediaContent(project, carouselId) {
        if (project.images?.length > 1) {
            return `
                <div class="project-carousel" id="${carouselId}">
                    <div class="carousel-slides">
                        ${project.images.map((img, i) => `
                            <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                                <img src="${img}" alt="${project.title} - ${i + 1}" class="project-image" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                    <button class="carousel-btn prev" aria-label="Previous">&#9668;</button>
                    <button class="carousel-btn next" aria-label="Next">&#9658;</button>
                    <div class="carousel-dots">${project.images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>
                </div>
            `;
        }
        if (project.images?.length === 1) {
            return `<img src="${project.images[0]}" alt="${project.title}" class="project-image" loading="lazy">`;
        }
        if (project.video) {
            return `<video class="project-video" autoplay muted loop playsinline><source src="${project.video}" type="video/mp4"></video>`;
        }
        return '';
    }

    function formatIndex(index, padding = 2) {
        return String(index + 1).padStart(padding, '0');
    }

    function renderProjectCard(project, index, config = {}) {
        const cfg = { ...defaultConfig.project, ...config };
        const hasUrl = Boolean(project.url);
        const card = document.createElement(hasUrl ? 'a' : 'div');
        card.className = cfg.wrapperClass + (cfg.extraClasses ? ' ' + cfg.extraClasses : '');
        if (hasUrl) {
            card.href = project.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
        } else {
            card.classList.add('no-url');
        }
        if (!project.images?.length && !project.video) {
            card.classList.add('no-image');
            // Surface the project type as a small badge so the card reads
            // intentional, not broken (used by the .no-image::before badge)
            if (project.type) card.dataset.cardType = project.type;
        }

        if (cfg.animationDelay) card.style.animationDelay = `${index * 0.1}s`;
        if (cfg.tooltip) card.setAttribute('data-tooltip', cfg.tooltip.replace('{title}', project.title));

        const idx = formatIndex(index, cfg.indexPadding);
        const media = createMediaContent(project, `carousel-${project.id}`);
        const tags = project.tags.map(tag => `<span class="tag">${cfg.tagWrapper.replace('{tag}', tag)}</span>`).join('');

        let header = cfg.headerTemplate ? cfg.headerTemplate(project, idx)
            : (cfg.showIndex || cfg.showType) ? `<div class="project-card-header">${cfg.showIndex ? `<span class="project-index">${cfg.indexPrefix}${idx}</span>` : ''}${cfg.showType ? `<span class="project-type">${cfg.typePrefix}${project.type}${cfg.typeSuffix}</span>` : ''}</div>` : '';

        let url = (cfg.showUrl && hasUrl) ? `<div class="project-link"><span class="link-icon">${cfg.urlIcon}</span><span class="link-url">${cfg.urlText || project.url}</span></div>` : '';
        let footer = cfg.footerTemplate ? cfg.footerTemplate(project, idx) : '';
        let corners = cfg.cornerDecorations ? '<div class="card-corner tl"></div><div class="card-corner tr"></div><div class="card-corner bl"></div><div class="card-corner br"></div>' : '';

        card.innerHTML = `
            ${header}
            <div class="project-media-container">${cfg.showIndex && cfg.indexInMedia ? `<span class="project-index">${cfg.indexPrefix}${idx}</span>` : ''}${media}</div>
            <div class="project-info">
                ${cfg.showType && cfg.typeInInfo ? `<span class="project-type">${project.type}</span>` : ''}
                <h3>${cfg.titlePrefix}${project.title}</h3>
                <p>${project.description}</p>
                <div class="tags">${tags}</div>
                ${url}
            </div>
            ${footer}${corners}
        `;

        if (project.category) {
            const camel = project.category.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            const label = window.LanguageManager?.t(`work.categories.${camel}`);
            if (label) {
                const badge = document.createElement('span');
                badge.className = 'project-category';
                badge.setAttribute('data-category', project.category);
                badge.textContent = label;
                card.querySelector('.project-info')?.prepend(badge);
            }
        }

        cfg.onRender?.(card, project, index);
        return card;
    }

    function renderBlogCard(article, index, config = {}) {
        const cfg = { ...defaultConfig.blog, ...config };
        const card = document.createElement('a');
        card.className = cfg.wrapperClass;
        if (!article.coverImage) card.classList.add('no-image');
        card.href = `/blog/${article.slug}/`;

        if (cfg.animationDelay) card.style.animationDelay = `${index * 0.1}s`;
        if (cfg.tooltip) card.setAttribute('data-tooltip', cfg.tooltip.replace('{title}', article.title));

        const idx = formatIndex(index, cfg.indexPadding);
        const date = cfg.dateFormat ? cfg.dateFormat(article.publishedAt) : ContentLoader.formatDate(article.publishedAt);
        const image = article.coverImage ? `<div class="blog-card-image"><img src="${article.coverImage}" alt="${article.title}" loading="lazy"></div>` : '';
        const header = cfg.headerTemplate ? cfg.headerTemplate(article, idx) : '';
        const indexBadge = cfg.showIndex && !cfg.headerTemplate ? `<span class="blog-index">${cfg.indexPrefix}${idx}</span>` : '';
        const corners = cfg.cornerDecorations ? '<div class="card-corner tl"></div><div class="card-corner tr"></div><div class="card-corner bl"></div><div class="card-corner br"></div>' : '';
        const newBadge = cfg.showNewBadge ? '<span class="blog-new-badge">NEW!</span>' : '';

        card.innerHTML = `
            ${header}${image}
            <div class="blog-card-content">
                ${indexBadge}
                <h3 class="blog-card-title">${cfg.titlePrefix}${article.title}</h3>
                <p class="blog-card-excerpt">${article.excerpt}</p>
                <div class="blog-card-meta">
                    <span class="blog-date">${cfg.dateWrapper ? cfg.dateWrapper.replace('{date}', date) : date}</span>
                    <span class="blog-reading-time">${cfg.readingTimePrefix || ''}${article.readingTime} ${window.LanguageManager?.t('blog.minRead') || 'min read'}</span>
                    ${newBadge}
                </div>
            </div>
            ${corners}
        `;

        cfg.onRender?.(card, article, index);
        return card;
    }

    function renderProjects(projects, config = {}, gridSelector = '#projects-grid') {
        const grid = document.querySelector(gridSelector);
        if (!grid) return;

        const loading = grid.querySelector('.projects-grid-loading');
        if (loading) loading.style.display = 'none';

        grid.innerHTML = '';
        projects.forEach((p, i) => grid.appendChild(renderProjectCard(p, i, config)));
        console.log(`%c[OK] Rendered ${projects.length} projects`, 'color: #33ff00;');
    }

    function renderBlogCards(articles, config = {}, gridSelector = '#blog-grid') {
        const grid = document.querySelector(gridSelector);
        if (!grid) return;

        const loading = grid.querySelector('.blog-grid-loading');
        if (loading) loading.style.display = 'none';

        grid.innerHTML = '';
        if (!articles?.length) {
            grid.innerHTML = '<p class="no-articles">No articles yet. Check back soon!</p>';
            return;
        }
        articles.forEach((a, i) => grid.appendChild(renderBlogCard(a, i, config)));
        console.log(`%c[OK] Rendered ${articles.length} blog cards`, 'color: #33ff00;');
    }

    return {
        createMediaContent,
        renderProjectCard,
        renderBlogCard,
        renderProjects,
        renderBlogCards
    };
})();

window.CardRenderer = CardRenderer;
