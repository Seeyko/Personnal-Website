/**
 * Things — the gear Tom actually uses.
 *
 * Data: /data/{lang}/things.json ({ intro, updated, categories[], items[] }).
 * An item: { id, name, brand, category, note, url?, image?, anim?, animFrames?, model?, since?, favorite?, retired?, mono? }.
 * anim: horizontal sprite strip of animFrames 4:3 frames (frame 0 = image): played forward on hover,
 * back on leave, and looped (with a pause at each end) while the thing is open in the detail.
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

    // Clean grid, loose stickers: every thing gets its own size, tilt and float
    // phase inside its cell, derived from its id (same on every visit).
    function scatterVars(id) {
        let h = 2166136261;
        for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
        const r = n => ((h >>> n) & 255) / 255;
        return `--s:${(0.82 + r(0) * 0.18).toFixed(2)};--tilt:${((r(8) - 0.5) * 8).toFixed(1)}deg;`
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
        if (push) setParam('c', id === 'all' ? null : id);
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

    function fillSheet(card) {
        const item = data.items.find(i => i.id === card.dataset.id);
        if (!item) return null;
        const sheet = els.sheet;
        sheet.style.setProperty('--hue', hueFor(item.category));
        // a sprite animation (looped below) wins over the 3D viewer
        $('#things-sheet-visual').innerHTML = item.model && !item.anim ? modelViewer(item) : visual(item);
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
        setParam('o', item.id);   // the open thing lives in the URL: /things?o=mac-mini
        const sheetAnim = $('#things-sheet-visual .thing-anim');
        if (sheetAnim) loopAnim(sheetAnim);
        const list = navList(), i = list.indexOf(card);
        $('#things-sheet-count').textContent = `${i + 1} / ${list.length}`;
        sheet.querySelector('[data-step="-1"]').disabled = i <= 0;
        sheet.querySelector('[data-step="1"]').disabled = i >= list.length - 1;
        return item;
    }

    function openSheet(card) {
        if (!fillSheet(card)) return;
        const sheet = els.sheet;
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
            t.style.translate = t.style.rotate = '';
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

    // ─── Sprite animations (e.g. the standing desk rising) ───────
    // Frames are stepped one by one from JS so an interrupted hover just turns
    // around from the current frame (a CSS transition on background-position
    // could land between two frames and slide like a carousel).
    const FRAME_MS = 95;
    const anims = new WeakMap();

    function animTo(el, target, done) {
        const n = Number(getComputedStyle(el).getPropertyValue('--frames')) || 10;
        const st = anims.get(el) || { frame: 0, timer: null };
        anims.set(el, st);
        clearTimeout(st.timer);
        target = Math.max(0, Math.min(n - 1, target));
        const tick = () => {
            if (st.frame !== target) st.frame += st.frame < target ? 1 : -1;
            el.style.backgroundPosition = `${(st.frame / (n - 1)) * 100}% 50%`;
            if (st.frame !== target) st.timer = setTimeout(tick, FRAME_MS);
            else if (done) st.timer = setTimeout(done, 0);
        };
        if (reduced()) { st.frame = target; el.style.backgroundPosition = `${(target / (n - 1)) * 100}% 50%`; return; }
        tick();
    }

    // Up, pause, down, pause, again; stops as soon as the element leaves the DOM.
    function loopAnim(el) {
        const n = Number(getComputedStyle(el).getPropertyValue('--frames')) || 10;
        const up = () => el.isConnected && animTo(el, n - 1, () => { anims.get(el).timer = setTimeout(down, 1300); });
        const down = () => el.isConnected && animTo(el, 0, () => { anims.get(el).timer = setTimeout(up, 1300); });
        anims.get(el) && clearTimeout(anims.get(el).timer);
        setTimeout(up, 500);
    }

    function bindAnims() {
        const hover = window.matchMedia('(hover: hover)').matches;
        if (!hover) return;
        els.grid.addEventListener('pointerover', e => {
            const a = e.target.closest('.thing')?.querySelector('.thing-anim');
            if (a && !e.target.closest('.thing').contains(e.relatedTarget)) animTo(a, Infinity);
        });
        els.grid.addEventListener('pointerout', e => {
            const t = e.target.closest('.thing');
            const a = t?.querySelector('.thing-anim');
            if (a && !t.contains(e.relatedTarget)) animTo(a, 0);
        });
    }

    // ─── Browsing inside the detail ──────────────────────────────
    // Swipe (touch / mouse drag), wheel / trackpad or arrow keys move to the
    // previous / next thing. The card follows the finger, a flick is enough
    // (velocity, not only distance), past the ends it resists, and the pile
    // behind re-forms around the new thing.

    const navList = () => [...els.grid.querySelectorAll('.thing:not([hidden])')];
    let busy = false;

    function parts() {
        return [els.sheet.querySelector('.things-sheet-visual'), els.sheet.querySelector('.things-sheet-body')];
    }

    function step(dir, fromX = 0) {
        if (busy || !els.sheet.open || !openedFrom) return;
        const list = navList();
        const next = list[list.indexOf(openedFrom) + dir];
        const [vis, body] = parts();
        if (!next) return settle(fromX);
        if (reduced()) { fillSheet(next); repile(next); return; }
        busy = true;
        // out: the visual leads, the text follows a little behind (parallax)
        const outV = vis.animate([
            { transform: `translateX(${fromX}px) rotate(${fromX / 40}deg)`, opacity: 1 },
            { transform: `translateX(${-dir * 55}vw) rotate(${-dir * 12}deg)`, opacity: 0 }
        ], { duration: 240, easing: EASE, fill: 'forwards' });
        body.animate([{ transform: `translateX(${fromX * 0.4}px)`, opacity: 1 },
            { transform: `translateX(${-dir * 60}px)`, opacity: 0 }], { duration: 180, easing: EASE, fill: 'forwards' });
        outV.finished.then(() => {
            fillSheet(next);
            repile(next);
            vis.getAnimations().forEach(a => a.cancel());
            body.getAnimations().forEach(a => a.cancel());
            vis.animate([
                { transform: `translateX(${dir * 45}vw) rotate(${dir * 10}deg) scale(.92)`, opacity: 0 },
                { transform: 'none', opacity: 1 }
            ], { duration: 460, easing: EASE });
            body.querySelectorAll(':scope > *').forEach((el, i) =>
                el.animate([{ transform: `translateX(${dir * 40}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
                    { duration: 360, delay: 60 + stagger(i) / 3, easing: EASE, fill: 'backwards' }));
            setTimeout(() => { busy = false; }, 200);
        });
    }

    // Snap back after a drag that didn't go far or fast enough (or hit an end).
    function settle(fromX) {
        const [vis, body] = parts();
        if (!fromX) {
            vis.animate([{ transform: 'none' }, { transform: 'translateX(-14px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }],
                { duration: 320, easing: MOVE });
            return;
        }
        vis.animate([{ transform: `translateX(${fromX}px) rotate(${fromX / 40}deg)` }, { transform: 'none' }],
            { duration: 420, easing: EASE });
        body.animate([{ transform: `translateX(${fromX * 0.4}px)` }, { transform: 'none' }], { duration: 420, easing: EASE });
    }

    // The pile behind moves to the new thing: bring it on screen, push the rest away.
    function repile(card) {
        gather();
        const r = card.getBoundingClientRect();
        window.scrollBy({ top: r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' });
        openedFrom = card;
        scatter(card);
    }

    function bindBrowse() {
        const sheet = els.sheet;
        sheet.querySelectorAll('[data-step]').forEach(b =>
            b.addEventListener('click', e => { e.stopPropagation(); step(Number(b.dataset.step)); }));
        sheet.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
        });

        // wheel / trackpad: one step per gesture (inertia is swallowed)
        let acc = 0, quietTimer = null, locked = false;
        sheet.addEventListener('wheel', e => {
            e.preventDefault();
            clearTimeout(quietTimer);
            quietTimer = setTimeout(() => { locked = false; acc = 0; }, 160);
            if (locked) return;
            acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(acc) > 40) { locked = true; step(acc > 0 ? 1 : -1); acc = 0; }
        }, { passive: false });

        // drag / swipe: the visual follows the pointer
        let start = null;
        sheet.addEventListener('pointerdown', e => {
            if (busy || e.button > 0 || e.target.closest('a, button, model-viewer')) return;
            start = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, id: e.pointerId, drag: false };
        });
        sheet.addEventListener('pointermove', e => {
            if (!start || e.pointerId !== start.id) return;
            let dx = e.clientX - start.x;
            if (!start.drag) {
                if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - start.y)) return;
                start.drag = true;
                sheet.setPointerCapture(e.pointerId);
                sheet.classList.add('is-dragging');
            }
            const list = navList(), i = list.indexOf(openedFrom);
            const atEnd = (dx > 0 && i <= 0) || (dx < 0 && i >= list.length - 1);
            if (atEnd) dx = Math.sign(dx) * Math.pow(Math.abs(dx), 0.75);   // rubber band past the ends
            start.dx = dx;
            const [vis, body] = parts();
            vis.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
            vis.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 600));
            body.style.transform = `translateX(${dx * 0.4}px)`;
        });
        const end = e => {
            if (!start || e.pointerId !== start.id) return;
            const { dx, t, drag } = start;
            start = null;
            if (!drag) return;
            sheet.classList.remove('is-dragging');
            sheet.dataset.dragged = '1';   // swallow the click that follows the drag
            const [vis, body] = parts();
            vis.style.transform = vis.style.opacity = body.style.transform = '';
            const v = Math.abs(dx) / (performance.now() - t);
            if (e.type !== 'pointercancel' && (Math.abs(dx) > 90 || v > 0.4)) step(dx < 0 ? 1 : -1, dx);
            else settle(dx);
        };
        sheet.addEventListener('dragstart', e => e.preventDefault());   // native image drag would cancel the swipe
        sheet.addEventListener('pointerup', end);
        sheet.addEventListener('pointercancel', end);
    }

    function setParam(key, value) {
        const url = new URL(location);
        value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
        history.replaceState({}, '', url);
    }

    function closeSheet() {
        const sheet = els.sheet;
        if (!sheet.open) return;
        setParam('o', null);
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
            if (els.sheet.dataset.dragged) { delete els.sheet.dataset.dragged; return; }
            if (e.target === els.sheet || e.target.closest('[data-close]')) closeSheet();
        });
        bindBrowse();
        bindAnims();
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
        // Deep link: /things?o=<id> opens that thing straight away.
        const wanted = new URLSearchParams(location.search).get('o');
        const card = wanted && els.grid.querySelector(`.thing[data-id="${CSS.escape(wanted)}"]:not([hidden])`);
        if (card) {
            card.classList.add('is-in');
            card.scrollIntoView({ block: 'center', behavior: 'instant' });
            setTimeout(() => openSheet(card), 300);
        }
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
