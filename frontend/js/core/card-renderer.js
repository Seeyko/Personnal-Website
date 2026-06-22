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

    // Project screenshots live under /assets and ship responsive WebP variants
    // (-480/-800/-1200). Emit a <picture> so modern browsers fetch a small WebP
    // sized to the card, with the original PNG/JPG as universal fallback.
    // `active:false` defers the fetch (data-src/data-srcset) until the carousel
    // slide is first shown — see Carousel.hydrateSlide.
    const IMG_SIZES = '(max-width: 768px) 92vw, 520px';

    function buildPicture(src, alt, { active = true, extraImgClass = 'project-image' } = {}) {
        const m = /^(\/assets\/.+)\.(png|jpe?g)$/i.exec(src);
        const dims = 'width="1600" height="900" decoding="async" loading="lazy"';
        if (!m) {
            // External / unknown asset: plain lazy img, no WebP sources.
            const srcAttr = active ? `src="${src}"` : `data-src="${src}"`;
            return `<img ${srcAttr} alt="${alt}" class="${extraImgClass}" ${dims}>`;
        }
        const base = m[1];
        const srcset = `${base}-480.webp 480w, ${base}-800.webp 800w, ${base}-1200.webp 1200w`;
        const sourceAttr = active ? `srcset="${srcset}"` : `data-srcset="${srcset}"`;
        const imgSrc = active ? `src="${src}"` : `data-src="${src}"`;
        return `<picture>` +
            `<source type="image/webp" ${sourceAttr} sizes="${IMG_SIZES}">` +
            `<img ${imgSrc} alt="${alt}" class="${extraImgClass}" ${dims}>` +
            `</picture>`;
    }

    function createMediaContent(project, carouselId) {
        if (project.images?.length > 1) {
            return `
                <div class="project-carousel" id="${carouselId}">
                    <div class="carousel-slides">
                        ${project.images.map((img, i) => `
                            <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                                ${buildPicture(img, `${project.title} - ${i + 1}`, { active: i === 0 })}
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
            return buildPicture(project.images[0], project.title, { active: true });
        }
        if (project.video) {
            return `<video class="project-video" autoplay muted loop playsinline preload="none"><source src="${project.video}" type="video/mp4"></video>`;
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
        const image = article.coverImage ? `<div class="blog-card-image"><img src="${article.coverImage}" alt="${article.title}" width="200" height="150" decoding="async" loading="lazy"></div>` : '';
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
