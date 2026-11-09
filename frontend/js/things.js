/**
 * Things — the gear Tom actually uses.
 *
 * Data: /data/{lang}/things.json ({ intro, updated, categories[], items[] }).
 * An item: { id, name, brand, category, note, url?, image?, anim?, animFrames?, model?, since?, favorite?, retired?, mono? }.
 * anim: horizontal sprite strip of animFrames 4:3 frames (frame 0 = image), played on card hover.
 * mono overrides the auto monogram (two first letters).
 * Retired items (no longer used) are listed last, desaturated.
 * No image → a monogram tile, tinted by its category.
 *
 * Layout: a loose pile of floating stickers (size, tilt, offset from the id).
 * Motion: hero letters rise in, the filter pill slides, things enter staggered
 * and re-flow with FLIP on filter; on click the rest of the pile is pushed
 * away and the picked thing flies into the detail. All of it is off
 * under prefers-reduced-motion.
 */
(() => {
    // Motion follows Emil Kowalski's standards (emilkowalski/skills):
    // strong ease-out to enter/exit, strong ease-in-out to move on screen,
    // never ease-in, short stagger capped, transforms + opacity only.
    const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';     // ease-out: enter / exit
    const MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';    // ease-in-out: on-screen moves
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const $ = sel => document.querySelector(sel);
    const els = {
        total: $('#things-total'),
        intro: $('#things-intro'),
        title: $('#things-title'),
        filters: $('#things-filters'),
        grid: $('#things-grid'),
        updated: $('#things-updated'),
        sheet: $('#things-sheet'),
    };

    let data = null;
    let active = 'all';
    let openedFrom = null;

    const lang = () => window.LanguageManager?.currentLang || 'fr';
    function tr(key, fallback) {
        const v = window.LanguageManager?.t?.(`things.${key}`);
        return v && v !== `things.${key}` ? v : fallback;
    }
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function monogram(name) {
        const words = String(name).replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
        return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
    }
    const hueFor = id => {
        const i = data.categories.findIndex(c => c.id === id);
        return [168, 28, 212, 340, 44, 268, 120][i % 7] ?? 168;
    };
    const catLabel = id => data.categories.find(c => c.id === id)?.label || id;

    function visual(item) {
        return item.image
            ? `<span class="thing-sticker${item.anim ? ' has-anim' : ''}" style="--st-img: url('${esc(item.image)}')"><img src="${esc(item.image)}" alt="" loading="lazy" decoding="async">${item.anim
                ? `<span class="thing-anim" aria-hidden="true" style="--anim: url('${esc(item.anim)}'); --frames: ${Number(item.animFrames) || 10}"></span>` : ''}</span>`
            : `<span class="thing-mono" aria-hidden="true">${esc(item.mono || monogram(item.name))}</span>`;
    }

    // Shrinking gaps (50, 40, 32…ms), capped near 250ms: reads as a wave, not a queue.
    const stagger = i => Math.round(250 * (1 - Math.pow(0.8, i)));

    // ─── Rendering ───────────────────────────────────────────────

    // A loose pile, not a grid: every thing gets its own size, tilt, offset
    // and float phase, derived from its id so the pile is the same on each visit.
    function scatterVars(id) {
        let h = 2166136261;
        for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
        const r = n => ((h >>> n) & 255) / 255;
        return `--s:${(0.78 + r(0) * 0.5).toFixed(2)};--tilt:${((r(8) - 0.5) * 14).toFixed(1)}deg;`
            + `--dy:${((r(16) - 0.5) * 4.5).toFixed(2)}rem;--dx:${((r(20) - 0.5) * 2.5).toFixed(2)}rem;`
            + `--ph:${(-r(24) * 7).toFixed(2)}s`;
    }

    function renderFilters() {
        const counts = Object.fromEntries(data.categories.map(c => [c.id, 0]));
        data.items.forEach(i => { if (i.category in counts) counts[i.category]++; });
        const tabs = [{ id: 'all', label: tr('all', 'Tout'), n: data.items.length },
            ...data.categories.map(c => ({ id: c.id, label: c.label, hint: c.hint, n: counts[c.id] }))];

        els.filters.setAttribute('aria-label', tr('categories', 'Catégories'));
        els.filters.querySelectorAll('.things-filter').forEach(b => b.remove());
        els.filters.insertAdjacentHTML('beforeend', tabs.map(t => `
            <button class="things-filter${t.n ? '' : ' is-empty'}" role="tab" type="button"
                    data-filter="${t.id}" aria-selected="${t.id === active}" ${t.hint ? `title="${esc(t.hint)}"` : ''}>
                <span class="things-filter-label">${esc(t.label)}</span>
                <span class="things-filter-count">${t.n}</span>
            </button>`).join(''));
        moveIndicator(false);
    }

    function renderGrid() {
        // Retired things close the list: still part of the story, no longer in use.
        const items = [...data.items.filter(i => !i.retired), ...data.items.filter(i => i.retired)];
        els.grid.innerHTML = items.map((item, i) => `
            <article class="thing${item.favorite ? ' is-favorite' : ''}${item.retired ? ' is-retired' : ''}" data-id="${esc(item.id)}"
                     data-category="${esc(item.category)}" style="--hue:${hueFor(item.category)};--i:${i};${scatterVars(item.id)}">
                <button class="thing-hit" type="button" aria-haspopup="dialog">
                    <span class="thing-visual">${visual(item)}</span>
                    <span class="thing-body">
                        <span class="thing-brand">${esc(item.brand || '')}</span>
                        <span class="thing-name">${esc(item.name)}</span>
                        ${item.note ? `<span class="thing-note">${esc(item.note)}</span>` : ''}
                    </span>
                    <span class="thing-tags">
                        <span class="thing-cat">${esc(catLabel(item.category))}</span>
                        ${item.favorite ? `<span class="thing-fav">★ ${esc(tr('favorite', 'Favori'))}</span>` : ''}
                        ${item.retired ? `<span class="thing-retired">${esc(tr('retired', 'Plus utilisé'))}</span>` : ''}
                    </span>
                </button>
            </article>`).join('') + `
            <div class="things-empty" hidden>
                <span class="things-empty-tag">[${esc(tr('emptyTag', 'EN BUILD'))}]</span>
                <span class="things-empty-text">${esc(tr('empty', 'Cette étagère se remplit bientôt.'))}</span>
                <span class="things-empty-hint"></span>
            </div>`;
        applyFilter(false);
        revealOnScroll();
    }

    function renderHeader() {
        els.intro.textContent = data.intro || '';
        if (data.updated) {
            const d = new Date(`${data.updated}-01T12:00:00`);
            const when = isNaN(d) ? data.updated
                : d.toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
            els.updated.textContent = `${tr('updated', 'Mis à jour')} · ${when}`;
        }
        splitTitle();
    }

    function setTotal(n, animate) {
        const word = n > 1 ? tr('items', 'objets') : tr('item', 'objet');
        if (!animate || reduced()) { els.total.textContent = `${n} ${word}`; return; }
        const t0 = performance.now(), dur = 700;
        const step = now => {
            const p = Math.min(1, (now - t0) / dur);
            els.total.textContent = `${Math.round(n * (1 - Math.pow(1 - p, 3)))} ${word}`;
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // Title letters rise in one after the other.
    function splitTitle() {
        const text = els.title.textContent.trim();
        els.title.setAttribute('aria-label', text);
        els.title.innerHTML = [...text].map((ch, i) =>
            `<span class="things-char" aria-hidden="true" style="--c:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    }

    // ─── Filtering (FLIP) ────────────────────────────────────────

    function applyFilter(animate = true) {
        const cards = [...els.grid.querySelectorAll('.thing')];
        const motion = animate && !reduced();
        const before = new Map();
        if (motion) cards.forEach(c => { if (!c.hidden) before.set(c, c.getBoundingClientRect()); });

        let shown = 0;
        cards.forEach(c => {
            const on = active === 'all' || c.dataset.category === active;
            c.hidden = !on;
            if (on) shown++;
        });

        const empty = els.grid.querySelector('.things-empty');
        empty.hidden = shown > 0;
        if (!shown) empty.querySelector('.things-empty-hint').textContent =
            data.categories.find(c => c.id === active)?.hint || '';

        setTotal(shown, animate);
        if (!motion) return;

        let enterIndex = 0;
        cards.forEach(c => {
            if (c.hidden) return;
            const from = before.get(c);
            c.classList.add('is-in');
            if (from) {
                const to = c.getBoundingClientRect();
                const dx = from.left - to.left, dy = from.top - to.top;
                if (dx || dy) c.animate(
                    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                    { duration: 420, easing: MOVE });
            } else {
                c.animate(
                    [{ opacity: 0, transform: 'translateY(8px) scale(.96)' }, { opacity: 1, transform: 'none' }],
                    { duration: 320, easing: EASE, delay: stagger(enterIndex++), fill: 'backwards' });
            }
        });
        if (!shown) empty.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
            { duration: 300, easing: EASE });
    }

    function moveIndicator(animate = true) {
        const btn = els.filters.querySelector(`[data-filter="${active}"]`);
        const ind = els.filters.querySelector('.things-filter-indicator');
        if (!btn || !ind) return;
        ind.style.transition = animate && !reduced() ? '' : 'none';
        ind.style.width = `${btn.offsetWidth}px`;
        ind.style.height = `${btn.offsetHeight}px`;
        ind.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
        if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
        // Keep the active pill in view on narrow screens.
        const box = els.filters;
        if (box.scrollWidth > box.clientWidth) {
            const target = btn.offsetLeft - (box.clientWidth - btn.offsetWidth) / 2;
            box.scrollTo({ left: target, behavior: animate && !reduced() ? 'smooth' : 'auto' });
        }
    }

    function setFilter(id, push = true) {
        if (id === active || !data) return;
        if (id !== 'all' && !data.categories.some(c => c.id === id)) id = 'all';
        active = id;
        els.filters.querySelectorAll('.things-filter').forEach(b =>
            b.setAttribute('aria-selected', String(b.dataset.filter === id)));
        moveIndicator();
        applyFilter();
        if (push) {
            const url = new URL(location);
            id === 'all' ? url.searchParams.delete('c') : url.searchParams.set('c', id);
            history.replaceState({}, '', url);
        }
    }

    // ─── Entrance + pointer ──────────────────────────────────────

    function revealOnScroll() {
        const cards = els.grid.querySelectorAll('.thing:not(.is-in)');
        if (reduced() || !('IntersectionObserver' in window)) {
            cards.forEach(c => c.classList.add('is-in'));
            return;
        }
        let batch = 0, batchTimer = null;
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                e.target.style.setProperty('--d', `${stagger(batch++)}ms`);
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            });
            clearTimeout(batchTimer);
            batchTimer = setTimeout(() => { batch = 0; }, 120);
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        cards.forEach(c => io.observe(c));
    }

    // ─── Detail sheet ────────────────────────────────────────────

    // 3D model in the sheet (model-viewer is loaded on first use only)
    const MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    function modelViewer(item) {
        if (!document.querySelector('script[data-model-viewer]')) {
            const s = document.createElement('script');
            s.type = 'module';
            s.src = MODEL_VIEWER;
            s.dataset.modelViewer = '';
            document.head.appendChild(s);
        }
        return `<model-viewer class="things-model" src="${esc(item.model)}" alt="${esc(item.name)}"
            ${item.image ? `poster="${esc(item.image)}"` : ''} camera-controls touch-action="pan-y"
            ${reduced() ? '' : 'auto-rotate'} rotation-per-second="18deg" camera-target="0m 0.63m 0m"
            shadow-intensity="1" exposure="1.05" interaction-prompt="none"></model-viewer>`;
    }

    function openSheet(card) {
        const item = data.items.find(i => i.id === card.dataset.id);
        if (!item) return;
        const sheet = els.sheet;
        sheet.style.setProperty('--hue', hueFor(item.category));
        $('#things-sheet-visual').innerHTML = item.model ? modelViewer(item) : visual(item);
        $('#things-sheet-meta').textContent = [item.brand, catLabel(item.category), item.since,
            item.retired && tr('retired', 'Plus utilisé')]
            .filter(Boolean).join(' · ');
        $('#things-sheet-name').textContent = item.name;
        $('#things-sheet-note').textContent = item.note || '';
        const link = $('#things-sheet-link');
        link.hidden = !item.url;
        if (item.url) {
            link.href = item.url;
            link.innerHTML = `${esc(tr('visit', 'Voir le site'))} <span aria-hidden="true">↗</span>`;
        }
        sheet.querySelector('.things-sheet-close').setAttribute('aria-label', tr('close', 'Fermer'));

        openedFrom = card;
        scatter(card);
        sheet.showModal();
        document.documentElement.classList.add('things-sheet-open');

        if (reduced()) return;
        // Lead: the picked thing flies from the pile into the detail (shared element).
        const fly = flight(card);
        if (fly) sheet.querySelector('.things-sheet-visual').animate(
            [{ transform: fly }, { transform: 'none' }], { duration: 480, easing: MOVE });
        // Support: the text arrives while the lead is still landing, small moves only.
        sheet.querySelectorAll('.things-sheet-body > *').forEach((el, i) =>
            el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
                { duration: 300, delay: 180 + stagger(i) / 2, easing: EASE, fill: 'backwards' }));
    }

    // Transform that puts the detail visual on top of the card's sticker.
    function flight(card) {
        const art = card?.querySelector('.thing-sticker, .thing-mono');
        const big = els.sheet.querySelector('.things-sheet-visual');
        if (!art) return null;
        const from = art.getBoundingClientRect(), to = big.getBoundingClientRect();
        if (!from.width || !to.width) return null;
        const s = Math.min(from.width / to.width, from.height / to.height);
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        const tilt = getComputedStyle(card).getPropertyValue('--tilt').trim() || '0deg';
        return `translate(${dx}px, ${dy}px) scale(${s}) rotate(${tilt})`;
    }

    // The rest of the pile moves out of the way, pushed away from the picked
    // thing (closer ones further), and comes back on close.
    function scatter(card) {
        const c = card.getBoundingClientRect();
        const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
        const vh = innerHeight;
        els.grid.classList.add('is-scattered');
        card.classList.add('is-picked');
        els.grid.querySelectorAll('.thing:not([hidden])').forEach(t => {
            if (t === card) return;
            const r = t.getBoundingClientRect();
            if (r.bottom < -vh || r.top > 2 * vh) return;
            let dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
            const d = Math.hypot(dx, dy) || 1;
            const push = 140 + 380 * Math.exp(-d / 420);
            dx = dx / d * push; dy = dy / d * push * 0.8;
            // set on the element itself (no parent CSS var → no style recalc of the pile)
            t.style.translate = `${dx.toFixed(0)}px ${dy.toFixed(0)}px`;
            t.style.rotate = `${((dx > 0 ? 1 : -1) * Math.min(14, push / 28)).toFixed(1)}deg`;
            // outward from the click: near things leave first, far ones a beat later
            t.style.transitionDelay = `${Math.min(120, d / 8).toFixed(0)}ms`;
        });
    }

    function gather() {
        els.grid.classList.remove('is-scattered');
        els.grid.querySelectorAll('.thing').forEach(t => {
            t.classList.remove('is-picked');
            t.style.translate = t.style.rotate = t.style.transitionDelay = '';
        });
    }

    function closeSheet() {
        const sheet = els.sheet;
        if (!sheet.open) return;
        const done = () => {
            sheet.close();
            gather();
            document.documentElement.classList.remove('things-sheet-open');
            openedFrom?.querySelector('.thing-hit')?.focus({ preventScroll: true });
        };
        if (reduced()) return done();
        // Reverse of the open: the thing flies back to its spot while the pile
        // closes in around it, all at once; the text just fades.
        sheet.classList.add('is-closing');
        const fly = flight(openedFrom);
        gather();
        openedFrom?.classList.add('is-picked');
        sheet.querySelector('.things-sheet-body').animate([{ opacity: 1 }, { opacity: 0 }],
            { duration: 150, easing: EASE, fill: 'forwards' });
        const visual = sheet.querySelector('.things-sheet-visual');
        const anim = fly
            ? visual.animate([{ transform: 'none' }, { transform: fly }], { duration: 380, easing: MOVE, fill: 'forwards' })
            : visual.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE, fill: 'forwards' });
        anim.finished.then(() => {
            openedFrom?.classList.remove('is-picked');
            sheet.classList.remove('is-closing');
            done();
            sheet.getAnimations({ subtree: true }).forEach(a => a.cancel());
        });
    }

    // ─── Boot ────────────────────────────────────────────────────

    async function load() {
        const res = await fetch(`/data/${lang()}/things.json`);
        if (!res.ok) throw new Error(`things.json: ${res.status}`);
        data = await res.json();
        // Only things with a photo are shown; the others wait in the JSON for one.
        data.items = data.items.filter(i => i.image);
        const wanted = new URLSearchParams(location.search).get('c');
        active = wanted && data.categories.some(c => c.id === wanted) ? wanted : 'all';
        renderHeader();
        renderFilters();
        renderGrid();
    }

    function bind() {
        els.filters.addEventListener('click', e => {
            const b = e.target.closest('.things-filter');
            if (b) setFilter(b.dataset.filter);
        });
        els.filters.addEventListener('keydown', e => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            const tabs = [...els.filters.querySelectorAll('.things-filter')];
            const i = tabs.findIndex(t => t.dataset.filter === active);
            const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
            next.focus();
            setFilter(next.dataset.filter);
        });
        els.grid.addEventListener('click', e => {
            const card = e.target.closest('.thing');
            if (card) openSheet(card);
        });
        els.sheet.addEventListener('click', e => {
            if (e.target === els.sheet || e.target.closest('[data-close]')) closeSheet();
        });
        els.sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });
        window.addEventListener('resize', () => moveIndicator(false));
        window.addEventListener('languageChanged', async () => {
            await load();
            revealOnScroll();
        });
    }

    async function init() {
        if (window.LanguageManager && !LanguageManager.isLoaded) await LanguageManager.init();
        bind();
        try {
            await load();
        } catch (err) {
            console.error('[things]', err);
        }
        // Fonts change pill widths: re-measure once they're in.
        document.fonts?.ready.then(() => moveIndicator(false));
        document.body.classList.add('things-ready');
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
