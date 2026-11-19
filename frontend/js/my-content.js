/**
 * Mon contenu — everything Tom publishes outside the blog (X today, videos later).
 *
 * Data: /data/social/posts.json, the archive kept up to date by the X sync
 * (format documented in /data/social/README.md). One feed for every platform:
 * a post is { id, platform, kind, url, publishedAt, lang, text, inReplyTo?,
 * thread?, hasMedia?, hasLink?, title?, thumbnail?, metrics? }.
 *
 * The page shows the feed newest first, grouped by month, with filters on the
 * kind of post (and on the platform once there is more than one), and loads
 * PAGE_SIZE posts at a time.
 */
(() => {
    const DATA_URL = '/data/social/posts.json';
    const PAGE_SIZE = 30;

    const $ = sel => document.querySelector(sel);
    const els = {
        total: $('#mc-total'),
        filters: $('#mc-filters'),
        feed: $('#mc-feed'),
        more: $('#mc-more'),
        updated: $('#mc-updated'),
    };

    let data = null;
    let active = 'all';
    let shown = PAGE_SIZE;

    const lang = () => window.LanguageManager?.currentLang || 'fr';
    function tr(key, fallback) {
        const v = window.LanguageManager?.t?.(`myContent.${key}`);
        return v && v !== `myContent.${key}` ? v : fallback;
    }
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const PLATFORMS = {
        x: { label: 'X', profile: h => `https://x.com/${h}` },
        youtube: { label: 'YouTube', profile: h => `https://www.youtube.com/@${h}` },
        tiktok: { label: 'TikTok', profile: h => `https://www.tiktok.com/@${h}` },
    };

    // Filters: "all", one per kind present, then one per platform when there are several.
    function filterList() {
        const kinds = [
            ['post', tr('kinds.post', 'Posts')],
            ['thread', tr('kinds.thread', 'Threads')],
            ['quote', tr('kinds.quote', 'Citations')],
            ['reply', tr('kinds.reply', 'Réponses')],
            ['video', tr('kinds.video', 'Vidéos')],
        ];
        const list = [{ id: 'all', label: tr('all', 'Tout'), match: () => true }];
        for (const [kind, label] of kinds) {
            if (data.posts.some(p => p.kind === kind)) list.push({ id: kind, label, match: p => p.kind === kind });
        }
        const platforms = [...new Set(data.posts.map(p => p.platform))];
        if (platforms.length > 1) {
            for (const pf of platforms) {
                list.push({ id: `pf:${pf}`, label: PLATFORMS[pf]?.label || pf, match: p => p.platform === pf });
            }
        }
        return list;
    }

    function renderFilters() {
        const list = filterList();
        if (!list.some(f => f.id === active)) active = 'all';
        els.filters.innerHTML = list.map(f => {
            const n = data.posts.filter(f.match).length;
            const on = f.id === active;
            return `<button class="mc-filter" type="button" role="tab" data-filter="${esc(f.id)}"
                aria-selected="${on}" tabindex="${on ? 0 : -1}">${esc(f.label)}<span class="mc-filter-count">${n}</span></button>`;
        }).join('');
    }

    // Text → HTML: escape first, then turn URLs, @handles and line breaks into markup.
    function richText(text, platform) {
        let html = esc(text);
        html = html.replace(/\bhttps?:\/\/[^\s<]+/g, url => {
            const shown = url.replace(/^https?:\/\/(www\.)?/, '');
            return `<a href="${url}" target="_blank" rel="noopener nofollow ugc">${shown.length > 32 ? shown.slice(0, 31) + '…' : shown}</a>`;
        });
        const profile = PLATFORMS[platform]?.profile;
        if (profile) {
            html = html.replace(/(^|[^\w/@.])@([A-Za-z0-9_]{1,15})\b/g,
                (_, pre, h) => `${pre}<a href="${profile(h)}" target="_blank" rel="noopener nofollow">@${h}</a>`);
        }
        return html.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    }

    // Replies start with the @handles they answer: drop them from the body,
    // the "En réponse à" line already says it.
    function bodyText(p) {
        if (p.kind !== 'reply' || !p.inReplyTo?.length) return p.text;
        return p.text.replace(/^(\s*@[A-Za-z0-9_]+\s*)+/, '') || p.text;
    }

    const fmtNum = n => new Intl.NumberFormat(lang(), { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
    const fmtDate = iso => new Date(iso).toLocaleDateString(lang(), { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtMonth = iso => new Date(iso).toLocaleDateString(lang(), { month: 'long', year: 'numeric' });

    const ICONS = {
        views: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        likes: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
        replies: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
        reposts: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
        bookmarks: '<path d="M6 4h12v16l-6-4-6 4z"/>',
    };
    function metricsHTML(m) {
        if (!m) return '';
        return Object.keys(ICONS)
            .filter(k => k === 'views' || m[k] > 0)
            .map(k => `<span class="mc-metric" title="${esc(tr(`metrics.${k}`, k))}">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">${ICONS[k]}</svg>
                <span class="mc-sr">${esc(tr(`metrics.${k}`, k))} </span>${fmtNum(m[k])}</span>`)
            .join('');
    }

    function kindLabel(p) {
        if (p.thread) return `${tr('kinds.threadOne', 'Thread')} ${p.thread.index}/${p.thread.total}`;
        return tr(`kind.${p.kind}`, p.kind);
    }

    function card(p) {
        const pf = PLATFORMS[p.platform]?.label || p.platform;
        const replyTo = p.kind === 'reply' && p.inReplyTo?.length
            ? `<p class="mc-context">${esc(tr('replyTo', 'En réponse à'))} ${p.inReplyTo.map(h =>
                `<a href="${PLATFORMS[p.platform]?.profile(h) || '#'}" target="_blank" rel="noopener nofollow">@${esc(h)}</a>`).join(' ')}</p>`
            : '';
        const thread = p.thread?.title ? `<p class="mc-context">${esc(p.thread.title)}</p>` : '';
        const title = p.title ? `<h3 class="mc-post-title">${esc(p.title)}</h3>` : '';
        const thumb = p.thumbnail
            ? `<a class="mc-thumb" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.thumbnail)}" alt="" loading="lazy" decoding="async"></a>`
            : '';
        const flags = [p.hasMedia && tr('hasMedia', 'média'), p.hasLink && tr('hasLink', 'lien')].filter(Boolean);
        return `<li class="mc-post" data-kind="${esc(p.kind)}" data-platform="${esc(p.platform)}" lang="${esc(p.lang || '')}">
            <div class="mc-post-head">
                <span class="mc-badge" data-kind="${esc(p.kind)}">${esc(kindLabel(p))}</span>
                <span class="mc-platform">${esc(pf)}</span>
                <time class="mc-date" datetime="${esc(p.publishedAt)}">${esc(fmtDate(p.publishedAt))}</time>
            </div>
            ${replyTo}${thread}${title}${thumb}
            <div class="mc-text"><p>${richText(bodyText(p), p.platform)}</p></div>
            <div class="mc-post-foot">
                <span class="mc-metrics">${metricsHTML(p.metrics)}</span>
                ${flags.length ? `<span class="mc-flags">${esc(flags.join(' · '))}</span>` : ''}
                <a class="mc-open" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(tr('open', 'Voir sur'))} ${esc(pf)} <span aria-hidden="true">↗</span></a>
            </div>
        </li>`;
    }

    function renderFeed() {
        const match = filterList().find(f => f.id === active)?.match || (() => true);
        const list = data.posts.filter(match);
        let month = '';
        const html = [];
        list.slice(0, shown).forEach(p => {
            const m = fmtMonth(p.publishedAt);
            if (m !== month) {
                month = m;
                html.push(`<li class="mc-month" aria-hidden="false"><h2>${esc(m)}</h2></li>`);
            }
            html.push(card(p));
        });
        els.feed.innerHTML = html.join('') || `<li class="mc-empty">${esc(tr('empty', 'Rien ici pour l’instant.'))}</li>`;
        els.more.hidden = list.length <= shown;
        els.more.textContent = `${tr('more', 'Voir plus')} (${list.length - Math.min(shown, list.length)})`;
    }

    function renderMeta() {
        const n = data.posts.length;
        els.total.textContent = `${n} ${n > 1 ? tr('posts', 'publications') : tr('post', 'publication')}`;
        els.updated.textContent = data.updated
            ? `${tr('updated', 'Archive mise à jour le')} ${fmtDate(data.updated)}`
            : '';
    }

    function render() {
        renderMeta();
        renderFilters();
        renderFeed();
    }

    async function load() {
        const res = await fetch(DATA_URL, { cache: 'no-cache' });
        // No archive yet (first sync not merged): an empty feed, not an error.
        // nginx answers a missing file with index.html (200), hence the type check.
        const isJSON = (res.headers.get('content-type') || '').includes('json');
        if (res.status === 404 || (res.ok && !isJSON)) data = { posts: [] };
        else if (!res.ok) throw new Error(`HTTP ${res.status}`);
        else data = await res.json();
        data.posts = (data.posts || []).slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    }

    function setFilter(id) {
        active = id;
        shown = PAGE_SIZE;
        renderFilters();
        renderFeed();
        els.filters.querySelector(`[data-filter="${CSS.escape(id)}"]`)?.focus();
    }

    function bind() {
        els.filters.addEventListener('click', e => {
            const b = e.target.closest('.mc-filter');
            if (b) setFilter(b.dataset.filter);
        });
        els.filters.addEventListener('keydown', e => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            const tabs = [...els.filters.querySelectorAll('.mc-filter')];
            const i = tabs.findIndex(t => t.dataset.filter === active);
            setFilter(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].dataset.filter);
        });
        els.more.addEventListener('click', () => {
            shown += PAGE_SIZE;
            renderFeed();
        });
        window.addEventListener('languageChanged', () => { if (data) render(); });
    }

    async function init() {
        if (window.LanguageManager && !LanguageManager.isLoaded) await LanguageManager.init();
        bind();
        try {
            await load();
            render();
        } catch (err) {
            console.error('[my-content]', err);
            els.feed.innerHTML = `<li class="mc-empty">${esc(tr('error', 'Impossible de charger l’archive.'))}</li>`;
        }
        document.body.classList.add('mc-ready');
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
