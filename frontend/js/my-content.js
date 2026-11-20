/**
 * Posts (/posts) — everything Tom publishes on X (videos later), its own tab
 * in the main nav.
 *
 * Data: /data/social/posts.json, the archive kept up to date by the X sync
 * (format documented in /data/social/README.md). One feed for every platform:
 * a post is { id, platform, kind, url, publishedAt, lang, text, inReplyTo?,
 * thread?, hasMedia?, hasLink?, title?, thumbnail?, metrics? }.
 *
 * The page shows the feed newest first, grouped by month, with filters on the
 * kind of post (and on the platform once there is more than one), and loads
 * PAGE_SIZE posts at a time.
 *
 * X posts are rendered with react-xeet (assets/vendor/xeet, built from
 * tools/xeet-bundle): the real tweet card, with avatar, media and live counts,
 * fed by our backend (GET {API_URL}/api/xeet/{id}). Each post first shows the
 * card built from the archive; the xeet replaces it once it is on screen and
 * loaded, and the archive card stays when it can't (deleted tweet, X down,
 * local dev without the backend).
 */
(() => {
    const DATA_URL = '/data/social/posts.json';
    const PAGE_SIZE = 30;
    const XEET_JS = '/assets/vendor/xeet/xeet.js?v=1.0.2-3';
    const XEET_CSS = '/assets/vendor/xeet/xeet.css?v=1.0.2-3';
    const XEET_PUBLIC_API = 'https://react-xeet.vercel.app/api/xeet';
    // The backend only runs in production; ?xeet=1 turns it on locally (with the Go API on API_URL).
    const XEET_ON = Boolean(window.APP_CONFIG?.FEATURES?.xeet || new URLSearchParams(location.search).has('xeet'));

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
            ['thread', tr('kinds.thread', 'Threads')], // a thread = its first post, see buildFeed
            ['quote', tr('kinds.quote', 'Citations')],
            ['reply', tr('kinds.reply', 'Réponses')],
            ['video', tr('kinds.video', 'Vidéos')],
        ];
        const list = [{ id: 'all', label: tr('all', 'Tout'), match: () => true }];
        for (const [kind, label] of kinds) {
            const match = kind === 'thread' ? p => p.members.length > 1 : p => p.kind === kind;
            if (data.feed.some(match)) list.push({ id: kind, label, match });
        }
        const platforms = [...new Set(data.feed.map(p => p.platform))];
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
            const n = data.feed.filter(f.match).length;
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
        if (p.members.length > 1) return `${tr('kinds.threadOne', 'Thread')} · ${p.members.length}`;
        return tr(`kind.${p.kind}`, p.kind);
    }

    function card(p) {
        const pf = PLATFORMS[p.platform]?.label || p.platform;
        const replyTo = p.kind === 'reply' && p.inReplyTo?.length
            ? `<p class="mc-context">${esc(tr('replyTo', 'En réponse à'))} ${p.inReplyTo.map(h =>
                `<a href="${PLATFORMS[p.platform]?.profile(h) || '#'}" target="_blank" rel="noopener nofollow">@${esc(h)}</a>`).join(' ')}</p>`
            : '';
        const thread = p.thread?.title ? `<p class="mc-context">${esc(p.thread.title)}</p>` : '';
        // A thread reads like on X: every post under the first one, linked by a line.
        const more = p.members.slice(1).map(m => `<div class="mc-thread-item">
                <div class="mc-text"><p>${richText(m.text, m.platform)}</p></div>
            </div>`).join('');
        const title = p.title ? `<h3 class="mc-post-title">${esc(p.title)}</h3>` : '';
        const thumb = p.thumbnail
            ? `<a class="mc-thumb" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.thumbnail)}" alt="" loading="lazy" decoding="async"></a>`
            : '';
        const flags = [p.hasMedia && tr('hasMedia', 'média'), p.hasLink && tr('hasLink', 'lien')].filter(Boolean);
        const xeetIds = p.platform === 'x' ? p.members.map(xeetIdOf).filter(Boolean).join(',') : '';
        return `<li class="mc-post" data-kind="${esc(p.kind)}" data-platform="${esc(p.platform)}" lang="${esc(p.lang || '')}"${xeetIds ? ` data-xeet="${esc(xeetIds)}"` : ''}>
            <div class="mc-fallback">
            <div class="mc-post-head">
                <span class="mc-badge" data-kind="${esc(p.kind)}">${esc(kindLabel(p))}</span>
                <span class="mc-platform">${esc(pf)}</span>
                <time class="mc-date" datetime="${esc(p.publishedAt)}">${esc(fmtDate(p.publishedAt))}</time>
            </div>
            ${replyTo}${thread}${title}${thumb}
            <div class="mc-text${more ? ' mc-thread-item' : ''}"><p>${richText(bodyText(p), p.platform)}</p></div>
            ${more}
            <div class="mc-post-foot">
                <span class="mc-metrics">${metricsHTML(p.metrics)}</span>
                ${flags.length ? `<span class="mc-flags">${esc(flags.join(' · '))}</span>` : ''}
                <a class="mc-open" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(tr('open', 'Voir sur'))} ${esc(pf)} <span aria-hidden="true">↗</span></a>
            </div>
            </div>
        </li>`;
    }

    function renderFeed() {
        const match = filterList().find(f => f.id === active)?.match || (() => true);
        const list = data.feed.filter(match);
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
        unmountXeets();
        els.feed.innerHTML = html.join('') || `<li class="mc-empty">${esc(tr('empty', 'Rien ici pour l’instant.'))}</li>`;
        els.more.hidden = list.length <= shown;
        els.more.textContent = `${tr('more', 'Voir plus')} (${list.length - Math.min(shown, list.length)})`;
        observeXeets();
    }

    // ─── Xeets ───

    const xeetIdOf = p => (/^x:(\d+)$/.exec(p.id) || /\/status\/(\d+)/.exec(p.url || '') || [])[1] || '';

    let xeetLib = null;
    function loadXeetLib() {
        if (xeetLib) return xeetLib;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = XEET_CSS;
        document.head.appendChild(css);
        xeetLib = new Promise((resolve, reject) => {
            const js = document.createElement('script');
            js.src = XEET_JS;
            js.async = true;
            js.onload = () => (window.XeetEmbed ? resolve(window.XeetEmbed) : reject(new Error('XeetEmbed missing')));
            js.onerror = () => reject(new Error('xeet.js failed to load'));
            document.head.appendChild(js);
        });
        return xeetLib;
    }

    // Xeets come in X's light or dark skin: pick the one closest to the theme's cards.
    function xeetScheme() {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;width:0;height:0;background:var(--t-card)';
        els.feed.appendChild(probe);
        const m = getComputedStyle(probe).backgroundColor.match(/[\d.]+/g);
        probe.remove();
        if (!m) return 'light';
        const [r, g, b] = m.map(Number);
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? 'dark' : 'light';
    }

    const unmounts = new Set();
    let io = null;
    function unmountXeets() {
        io?.disconnect();
        unmounts.forEach(fn => fn());
        unmounts.clear();
    }

    function mountXeet(li, lib) {
        const ids = li.dataset.xeet.split(',');
        const box = document.createElement('div');
        box.className = `mc-xeet ${xeetScheme()}`;
        li.appendChild(box);
        const api = (window.APP_CONFIG?.API_URL || '').replace(/\/$/, '');
        let unmount = null;
        const drop = () => { unmount?.(); unmounts.delete(drop); box.remove(); li.classList.remove('has-xeet'); };
        unmount = lib.mountPost(box, ids, {
            // Our backend first; react-xeet's public endpoint if it can't answer.
            apiUrls: [`${api}/api/xeet`, XEET_PUBLIC_API],
            onLoad: () => li.classList.add('has-xeet'),
            onError: err => { reportXeetFailure(ids[0], err); drop(); },
        });
        unmounts.add(drop);
    }

    // Tell PostHog (already on the page) why a tweet didn't load, a few times
    // per visit: the only way to see what visitors' browsers get from the APIs.
    let reported = 0;
    function reportXeetFailure(id, err) {
        if (reported++ >= 3 || !window.posthog?.capture) return;
        try {
            window.posthog.capture('posts_xeet_failed', {
                tweet_id: id,
                message: String(err?.message || err),
                attempts: JSON.stringify(err?.attempts || []),
            });
        } catch { /* analytics must never break the page */ }
    }

    function observeXeets() {
        if (!XEET_ON) return;
        const items = [...els.feed.querySelectorAll('.mc-post[data-xeet]:not([data-xeet-seen])')];
        if (!items.length) return;
        io = io || new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                io.unobserve(e.target);
                loadXeetLib().then(lib => mountXeet(e.target, lib)).catch(err => console.warn('[posts] xeet', err.message));
            });
        }, { rootMargin: '800px 0px' });
        items.forEach(li => { li.dataset.xeetSeen = ''; io.observe(li); });
    }

    function rescheme() {
        const scheme = xeetScheme();
        els.feed.querySelectorAll('.mc-xeet').forEach(box => { box.className = `mc-xeet ${scheme}`; });
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
        buildFeed();
    }

    // One entry per thread (its first post, with every post of the thread in
    // `members`, in order), one per post otherwise.
    function buildFeed() {
        const threads = new Map();
        for (const p of data.posts) {
            if (p.thread?.id && p.thread.total > 1) {
                if (!threads.has(p.thread.id)) threads.set(p.thread.id, []);
                threads.get(p.thread.id).push(p);
            }
        }
        data.feed = [];
        for (const p of data.posts) {
            const group = p.thread?.id ? threads.get(p.thread.id) : null;
            if (!group) { data.feed.push({ ...p, members: [p] }); continue; }
            if (p.id !== p.thread.id) continue;
            data.feed.push({ ...p, members: group.slice().sort((a, b) => a.thread.index - b.thread.index) });
        }
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
        // Theme switch: re-skin the xeets once the new theme CSS is in.
        new MutationObserver(() => setTimeout(rescheme, 400))
            .observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }

    async function init() {
        if (window.LanguageManager && !LanguageManager.isLoaded) await LanguageManager.init();
        bind();
        try {
            await load();
            render();
        } catch (err) {
            console.error('[posts]', err);
            els.feed.innerHTML = `<li class="mc-empty">${esc(tr('error', 'Impossible de charger l’archive.'))}</li>`;
        }
        document.body.classList.add('mc-ready');
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
