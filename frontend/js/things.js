/**
 * Things — the objects, apps and tools Tom actually uses.
 *
 * Data: /data/{lang}/things.json ({ intro, updated, categories[], items[] }).
 * An item: { id, name, brand, category, note, url?, image?, since?, favorite? }.
 * No image → a monogram tile, tinted by its category.
 *
 * Motion: hero letters rise in, the filter pill slides, cards enter staggered
 * and re-flow with FLIP on filter, a spotlight follows the pointer, and the
 * detail sheet grows out of the card it was opened from. All of it is off
 * under prefers-reduced-motion.
 */
(() => {
    const EASE = 'cubic-bezier(.2, .8, .2, 1)';
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
            ? `<img src="${esc(item.image)}" alt="" loading="lazy" decoding="async">`
            : `<span class="thing-mono" aria-hidden="true">${esc(monogram(item.name))}</span>`;
    }

    // ─── Rendering ───────────────────────────────────────────────

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
        els.grid.innerHTML = data.items.map((item, i) => `
            <article class="thing${item.favorite ? ' is-favorite' : ''}" data-id="${esc(item.id)}"
                     data-category="${esc(item.category)}" style="--hue:${hueFor(item.category)};--i:${i}">
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
                    { duration: 520, easing: EASE });
            } else {
                c.animate(
                    [{ opacity: 0, transform: 'translateY(14px) scale(.96)' }, { opacity: 1, transform: 'none' }],
                    { duration: 460, easing: EASE, delay: 40 * enterIndex++, fill: 'backwards' });
            }
        });
        if (!shown) empty.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
            { duration: 420, easing: EASE });
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
                e.target.style.setProperty('--d', `${Math.min(batch++, 10) * 55}ms`);
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            });
            clearTimeout(batchTimer);
            batchTimer = setTimeout(() => { batch = 0; }, 120);
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        cards.forEach(c => io.observe(c));
    }

    function bindPointer() {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        els.grid.addEventListener('pointermove', e => {
            const card = e.target.closest('.thing');
            if (!card) return;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
            card.style.setProperty('--mx', `${x * 100}%`);
            card.style.setProperty('--my', `${y * 100}%`);
            if (!reduced()) {
                card.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
                card.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
            }
        });
        els.grid.addEventListener('pointerout', e => {
            const card = e.target.closest('.thing');
            if (card && !card.contains(e.relatedTarget)) {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            }
        });
    }

    // ─── Detail sheet ────────────────────────────────────────────

    function openSheet(card) {
        const item = data.items.find(i => i.id === card.dataset.id);
        if (!item) return;
        const sheet = els.sheet;
        sheet.style.setProperty('--hue', hueFor(item.category));
        $('#things-sheet-visual').innerHTML = visual(item);
        $('#things-sheet-meta').textContent = [item.brand, catLabel(item.category), item.since]
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
        sheet.showModal();
        document.documentElement.classList.add('things-sheet-open');

        if (reduced()) return;
        const panel = sheet.querySelector('.things-sheet-card');
        const from = card.getBoundingClientRect(), to = panel.getBoundingClientRect();
        const sx = from.width / to.width, sy = from.height / to.height;
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        panel.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.4 },
            { transform: 'none', opacity: 1 }
        ], { duration: 520, easing: EASE });
        sheet.querySelectorAll('.things-sheet-body > *').forEach((el, i) =>
            el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
                { duration: 380, delay: 160 + i * 50, easing: EASE, fill: 'backwards' }));
    }

    function closeSheet() {
        const sheet = els.sheet;
        if (!sheet.open) return;
        const done = () => {
            sheet.close();
            document.documentElement.classList.remove('things-sheet-open');
            openedFrom?.querySelector('.thing-hit')?.focus({ preventScroll: true });
        };
        if (reduced()) return done();
        const panel = sheet.querySelector('.things-sheet-card');
        sheet.classList.add('is-closing');
        panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px) scale(.97)' }],
            { duration: 220, easing: 'ease-in' }).finished.then(() => {
            sheet.classList.remove('is-closing');
            done();
        });
    }

    // ─── Boot ────────────────────────────────────────────────────

    async function load() {
        const res = await fetch(`/data/${lang()}/things.json`);
        if (!res.ok) throw new Error(`things.json: ${res.status}`);
        data = await res.json();
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
        bindPointer();
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
