/**
 * ═══════════════════════════════════════════════════════════════
 * FPS ARENA PORTFOLIO — Theme JavaScript
 * "de_portfolio" — CS Panorama tactical main-menu aesthetic.
 *
 * The HUD chrome (background scene, left rail, profile/rank card, friends
 * list, telemetry bar, crosshair, hit FX) is INJECTED into the DOM at
 * runtime — it wraps the real single-page site rather than replacing it.
 * The existing sections (#now/#work/#timeline/#about/#contact) stay the
 * source of truth; the top nav tabs (the real header nav, restyled) and the
 * left rail simply navigate to them.
 *
 * Everything is ultra-snappy: instant hovers, pixel-snap crosshair, no
 * smoothing. Sound is synthesized through the shared SFX bus (sound pack
 * registered below; mute persisted site-wide by sfx.js).
 * ═══════════════════════════════════════════════════════════════
 */

console.log('%c[de_portfolio] FPS menu online', 'color:#54a3ff;font-weight:bold;');

const RM_FPS = !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);

/* ───────────────────────── Synthesized SFX ─────────────────────────
   All audio runs through the shared SFX bus (js/core/effects/sfx.js): it
   owns the AudioContext, the persisted mute state and the window.sound()
   console toggle. This theme registers its sound pack below — a military
   radio / HUD palette (square-wave comms beeps, static crackle, kevlar
   thumps) — and keeps FpsSound as a thin facade for the cues wired locally
   to the crosshair and chrome (hit / hover / tab). */
const FpsSound = {
    ensure: () => window.SFX && SFX.ensure(),
    isOn: () => !window.SFX || SFX.isOn(),
    setOn: (v) => window.SFX ? SFX.setOn(v) : true,
    hit: () => window.SFX && SFX.play('fps:hit'),
    hover: () => window.SFX && SFX.play('fps:hover'),
    tab: () => window.SFX && SFX.play('fps:tab')
};

// NOTE: no 'ui:down' / 'ui:hover' handlers here on purpose — the local
// crosshair pointerdown (fps:hit) and bindSfx()'s per-element hover binding
// (fps:hover, covers the non-<a>/<button> .fps-buy tiles) already fire them;
// bus handlers would double every click and hover.
if (window.SFX) SFX.register('fps', {
    /* ── Theme cues (fired locally: crosshair shots, hovers, tab clicks) ── */
    'fps:hit': (a) => {
        a.tone(a.t, 0.05, 0.12, 'square', 1700, 2200);
        a.tone(a.t + 0.006, 0.05, 0.08, 'square', 2500, 2600);
    },
    'fps:hover': (a) => a.tone(a.t, 0.02, 0.04, 'square', 900, 900),
    'fps:tab': (a) => a.tone(a.t, 0.04, 0.08, 'square', 560, 720),

    /* ── Buy-menu tile reveals: price tick climbing per cascade step ── */
    'card:reveal': (a) => {
        const f = 700 * Math.pow(1.12, Math.min(a.opts.step || 0, 6));
        a.tone(a.t, 0.045, 0.06, 'square', f, f * 1.1);
    },

    /* ── Blip (cursor mascot): squad-radio micro-beeps ──
       blip:click / blip:blink stay silent by design — too frequent for radio. */
    'blip:joy': (a) => {
        [880, 1175, 1568].forEach((f, i) => a.tone(a.t + i * 0.05, 0.05, 0.05, 'square', f, f));
    },
    'blip:listen': (a) => {
        a.noise(a.t, 0.05, 0.035, 1800, 1800, 2);              // comms channel opens
        a.tone(a.t + 0.04, 0.1, 0.04, 'square', 620, 620);
    },
    'blip:wave': (a) => {
        a.tone(a.t, 0.05, 0.05, 'square', 980, 1240);
        a.tone(a.t + 0.08, 0.05, 0.05, 'square', 1240, 980);
    },
    'blip:wake': (a) => a.tone(a.t, 0.08, 0.05, 'square', 520, 1200),
    'blip:snooze': (a) => a.tone(a.t, 0.12, 0.04, 'square', 900, 420),
    'blip:twirl': (a) => {
        [660, 880, 1100, 1320].forEach((f, i) => a.tone(a.t + i * 0.045, 0.04, 0.045, 'square', f, f));
    },

    /* ── Cathode (guide mascot): radio checks, static, kevlar thumps ── */
    'cathode:boot': (a) => {
        a.noise(a.t, 0.12, 0.05, 900, 2600, 1.2);              // static burst
        a.tone(a.t + 0.14, 0.07, 0.07, 'square', 940, 940);    // "radio check,
        a.tone(a.t + 0.24, 0.09, 0.07, 'square', 1250, 1250);  //  copy?"
    },
    'cathode:enter': (a) => {
        a.tone(a.t, 0.03, 0.06, 'square', 1500, 1700);         // PTT click
        a.tone(a.t + 0.04, 0.06, 0.05, 'square', 760, 760);
    },
    'cathode:speak': (a) => {
        // Radio-chatter static ticks, a few per burst of typed characters.
        const ticks = Math.min(7, Math.max(2, Math.round((a.opts.chars || 20) / 9)));
        for (let i = 0; i < ticks; i++) {
            const jit = 0.85 + Math.random() * 0.3;
            a.noise(a.t + i * 0.06, 0.02, 0.035, 2200 * jit, 2200 * jit, 3);
        }
    },
    'cathode:jump': (a) => a.tone(a.t, a.opts.stone ? 0.05 : 0.08, 0.05, 'square', 600, a.opts.stone ? 1100 : 950),
    'cathode:land': (a) => {
        a.tone(a.t, 0.07, 0.09, 'triangle', 170, 65);          // kevlar thump
        a.noise(a.t, 0.035, 0.05, 450, 220, 1);
        if (a.opts.perch) a.noise(a.t + 0.04, 0.02, 0.04, 2100, 2100, 3); // gear click
    },
    'cathode:spin': (a) => {
        [900, 1150, 1400, 1150].forEach((f, i) => a.tone(a.t + i * 0.04, 0.03, 0.045, 'square', f, f)); // radio dial
    },
    'cathode:squish': (a) => a.tone(a.t, 0.09, 0.06, 'square', 700, 260),
    'cathode:bump': (a) => {
        a.tone(a.t, 0.06, 0.08, 'triangle', 200, 80);
        a.noise(a.t, 0.03, 0.04, 700, 350, 1);
    },
    'cathode:dizzy': (a) => {
        a.tone(a.t, 0.35, 0.03, 'square', 660, 480);           // detuned wobble
        a.tone(a.t + 0.04, 0.35, 0.03, 'square', 640, 500);
    },
    'cathode:crack': (a) => {
        a.noise(a.t, 0.14, 0.14, 3600, 800, 0.9);              // glass burst
        a.tone(a.t + 0.08, 0.08, 0.08, 'square', 1400, 1400);  // alarm blip x2
        a.tone(a.t + 0.2, 0.08, 0.07, 'square', 1400, 1400);
    },
    'cathode:repair': (a) => {
        for (let i = 0; i < 5; i++) a.noise(a.t + i * 0.1, 0.025, 0.05, 2400, 2400, 4); // defuse-kit ratchet
    },
    'cathode:fixed': (a) => {
        a.tone(a.t, 0.09, 0.07, 'square', 880, 880);           // bomb defused —
        a.tone(a.t + 0.14, 0.12, 0.07, 'square', 1175, 1175);  // two clean beeps
    },
    'cathode:meet': (a) => {
        // Friendly radio ping; pitch shifts with the scene's mood.
        const f = { hug: 760, talk: 900, dance: 1150 }[a.opts.scene] || 1000;
        a.tone(a.t, 0.05, 0.05, 'square', f, f);
        a.tone(a.t + 0.08, 0.07, 0.05, 'square', f * 1.25, f * 1.25);
    },
    'cathode:off': (a) => {
        a.tone(a.t, 0.03, 0.08, 'square', 1200, 500);          // comms off click
        a.noise(a.t + 0.03, 0.16, 0.04, 1200, 300, 0.8);       // static tail
    },
    'cathode:on': (a) => {
        a.noise(a.t, 0.05, 0.035, 800, 2000, 1);
        a.tone(a.t + 0.05, 0.06, 0.06, 'square', 700, 700);    // back online
        a.tone(a.t + 0.13, 0.07, 0.06, 'square', 1050, 1050);
    }
});

/* ───────────────────────── Buy-menu tiles ─────────────────────────
   Weapon-style icons + a fictional money-green price, cycled by slot. */
const FPS_WEAPONS = [
    '<svg viewBox="0 0 48 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 15h9l3-6h14l4 6h14"/><circle cx="12" cy="15" r="2.4"/><circle cx="34" cy="15" r="2.4"/></svg>',
    '<svg viewBox="0 0 48 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="10" y="4" width="28" height="12"/><path d="M24 4v12"/></svg>',
    '<svg viewBox="0 0 48 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 16l10-12 6 8 5-5 9 9"/></svg>',
    '<svg viewBox="0 0 48 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="24" cy="10" r="6"/><path d="M8 10h10M30 10h10"/></svg>',
    '<svg viewBox="0 0 48 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6h20l6 4-6 4H6z"/><path d="M32 10h10"/></svg>'
];
const FPS_PRICES = [4700, 3500, 5200, 2600, 3900, 4500, 2700, 5000];

function fpsWeaponIcon(n) { return `<span class="fps-buy-icon">${FPS_WEAPONS[(n - 1) % FPS_WEAPONS.length]}</span>`; }
function fpsPrice(n) { return FPS_PRICES[(n - 1) % FPS_PRICES.length]; }

const fpsThemeConfig = {
    name: 'FPS',

    cards: {
        // Buy-menu tile: reuses the shared card renderer (title/desc/tags come
        // from the real project data + i18n); we only theme the chrome.
        wrapperClass: 'project-card fps-buy fade-in-up',
        tagWrapper: '{tag}',
        headerTemplate: (project, idx) => {
            const n = parseInt(idx, 10);
            return `
                <div class="fps-buy-head">
                    <span class="fps-buy-num">${n}</span>
                    ${fpsWeaponIcon(n)}
                    <span class="fps-buy-price">$${fpsPrice(n)}</span>
                </div>
            `;
        },
        footerTemplate: (project, idx) => {
            const n = parseInt(idx, 10);
            return `
                <div class="fps-buy-foot">
                    <span class="fps-buy-slot">SLOT ${n}</span>
                    <span class="fps-buy-cta">BUY&nbsp;&#9656;</span>
                </div>
            `;
        }
    },

    blogCards: {
        wrapperClass: 'blog-card fps-buy fade-in-up',
        headerTemplate: (article, idx) => `<div class="fps-buy-head"><span class="fps-buy-num">${parseInt(idx, 10)}</span><span class="fps-buy-price">INTEL</span></div>`
    },

    initEffects: initFpsEffects,

    onReady: () => console.log('%c[de_portfolio] READY — GLHF', 'color:#8fce5b;')
};

/* ───────────────────────── Chrome injection ───────────────────────── */
function initFpsEffects() {
    // Flags that the HUD chrome (background scene, left rail, side panel,
    // telemetry bar, crosshair, ribbon) is present. CSS gates the native-cursor
    // hide and the #main-content padding that reserves space for that chrome on
    // this class — so pages that never reach here (the blog, which throws in
    // ThemeInit before initEffects because Carousel isn't loaded there) keep
    // their native cursor and stay centered instead of clearing absent chrome.
    document.body.classList.add('fps-hud');
    injectScene();
    injectHud();
    decorateTabs();
    injectPlayerBadge();
    injectMenuChrome();
    buildSidePanel();
    initCrosshairAndFx();
    initParallax();
    initTelemetry();
    initScrollSpy();
    bindSfx();
}

// Daylight parallax scene + scrim, fixed behind the scrolling content.
function injectScene() {
    if (document.getElementById('fps-scene')) return;
    const scene = document.createElement('div');
    scene.id = 'fps-scene';
    scene.setAttribute('aria-hidden', 'true');
    // Plain, bright sand backdrop (Dust-II daylight) — no scenery, just a flat
    // sunlit map for the dark HUD to float over. The scrim only grounds the
    // fixed chrome top/bottom; the solid fill lives in CSS on #fps-scene.
    scene.innerHTML = `<div class="fps-scrim"></div>`;
    document.body.insertBefore(scene, document.body.firstChild);
}

// Left icon rail (maps to the real sections) + top HUD accents + mute toggle.
function injectHud() {
    if (document.getElementById('fps-rail')) return;
    const SECTIONS = [
        { id: 'now', label: 'Now', icon: '<path d="M8 5v14l11-7z"/>', fill: true },
        { id: 'work', label: 'Buy', icon: '<rect x="3" y="7" width="18" height="13"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
        { id: 'timeline', label: 'Log', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>' },
        { id: 'about', label: 'Profile', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
        { id: 'contact', label: 'Invite', icon: '<path d="M12 3v9"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>', warn: true }
    ];
    const rail = document.createElement('nav');
    rail.id = 'fps-rail';
    rail.setAttribute('aria-label', 'FPS menu rail');
    rail.innerHTML = SECTIONS.map(s => `
        <button class="fps-rail-btn${s.warn ? ' fps-warn' : ''}" data-target="${s.id}" title="${s.label}" aria-label="${s.label}">
            <svg viewBox="0 0 24 24" ${s.fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2"'}>${s.icon}</svg>
        </button>
    `).join('') + `
        <span class="fps-rail-gap"></span>
        <button class="fps-rail-btn fps-mute" id="fps-mute" title="Sound" aria-label="Toggle sound">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="fps-sndwave" d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10"/></svg>
        </button>
    `;
    document.body.appendChild(rail);

    rail.addEventListener('click', (e) => {
        const btn = e.target.closest('.fps-rail-btn');
        if (!btn) return;
        FpsSound.ensure();
        if (btn.id === 'fps-mute') {
            FpsSound.setOn(); // icon syncs via the SFX.onChange hook below
            FpsSound.tab();
            return;
        }
        const target = document.getElementById(btn.dataset.target);
        if (target) { target.scrollIntoView({ behavior: RM_FPS ? 'auto' : 'smooth', block: 'start' }); FpsSound.tab(); }
    });
    // Icon follows the shared bus state — button click OR window.sound() in console.
    const muteBtn = document.getElementById('fps-mute');
    const syncMute = (on) => muteBtn.classList.toggle('fps-muted', !on);
    syncMute(FpsSound.isOn());
    if (window.SFX) SFX.onChange(syncMute);
}

// Turn the real header nav links into CS-style numbered tabs and wire SFX.
function decorateTabs() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    nav.querySelectorAll('.nav-link').forEach(link => {
        link.classList.add('fps-tab');
        link.addEventListener('click', () => { FpsSound.ensure(); FpsSound.tab(); });
    });
}

// Tactical player badge, folded into the top-right HUD next to the (reskinned)
// theme + language chips. Mirrors the mockup's top-right player mini-card so the
// zone reads as HUD chrome instead of a loud default palette emoji. Data-driven.
function injectPlayerBadge() {
    const host = document.getElementById('header-controls');
    if (!host || document.getElementById('fps-badge')) return;
    const content = (window.ContentLoader && ContentLoader.content) || {};
    const full = (content.meta && content.meta.name) || 'Tom Andrieu';
    const handle = full.trim().toUpperCase().replace(/\s+/g, '_');
    const initials = full.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'TA';
    const badge = document.createElement('div');
    badge.id = 'fps-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = `
        <span class="fps-badge-av">${initials}</span>
        <span class="fps-badge-who"><b>${handle}</b><small>&#9679; OPEN TO TALK</small></span>
        <span class="fps-badge-shield"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 3.5v6c0 5.2-3.6 8.6-8 10-4.4-1.4-8-4.8-8-10v-6z"/><path d="M8.5 12l2.4 2.4L16 9"/></svg></span>
    `;
    host.insertBefore(badge, host.firstChild);
}

// Injects the CS main-menu framing the mockup leans on but the wrapped site
// lacks: the boot-strip ribbon across the top, the NEWS + BUY-MENU panel-header
// bars (with a live clock and a fake budget / buy-time countdown) and the hero
// eyebrow. fps-only — this file never runs under another theme and a theme
// switch full-reloads the page, so nothing here leaks elsewhere.
function injectMenuChrome() {
    if (!document.getElementById('fps-ribbon')) {
        const rib = document.createElement('div');
        rib.id = 'fps-ribbon';
        rib.setAttribute('aria-hidden', 'true');
        rib.innerHTML = `<span><b>de_portfolio</b> &middot; aper&ccedil;u th&egrave;me FPS</span>
            <span class="fps-ribbon-sep">|</span>
            <span>bouge la souris &middot; clique &middot; change d'onglet</span>`;
        document.body.appendChild(rib);
    }

    const content = (window.ContentLoader && ContentLoader.content) || {};
    const tier = (content.meta && content.meta.title) || '';

    const hero = document.querySelector('.hero-content');
    if (hero && !hero.querySelector('.fps-eyebrow')) {
        const eyebrow = document.createElement('div');
        eyebrow.className = 'fps-eyebrow';
        eyebrow.textContent = tier
            ? tier.toUpperCase().replace(/\s*·\s*/g, ' // ')
            : 'PRODUCT BUILDER // AI TRANSFORMATION';
        hero.insertBefore(eyebrow, hero.firstChild);

        const newsH = document.createElement('div');
        newsH.className = 'fps-menu-h fps-news-h';
        newsH.setAttribute('aria-hidden', 'true');
        newsH.innerHTML = `<span><span class="fps-h-dot"></span>NEWS &middot; EN CE MOMENT</span>
            <span class="fps-clock" id="fps-clock">--:--:--</span>`;
        hero.insertBefore(newsH, hero.firstChild);
    }

    // Secondary ghost CTA next to the filled hero CTA, mirroring the mockup's
    // "Voir le travail" outline button. Text is i18n-driven (theme override).
    const heroCta = document.getElementById('hero-cta');
    if (heroCta && !document.getElementById('fps-cta-ghost')) {
        const label = (window.LanguageManager && LanguageManager.t('ui.seeWork')) || 'Voir le travail';
        const ghost = document.createElement('a');
        ghost.id = 'fps-cta-ghost';
        ghost.className = 'hero-cta fps-cta-ghost';
        ghost.href = '#work';
        ghost.innerHTML = `<span>${label}</span><span class="hero-cta-arrow">&#9656;</span>`;
        ghost.addEventListener('click', () => {
            const target = document.getElementById('work');
            if (target) { FpsSound.ensure(); FpsSound.tab(); }
        });
        heroCta.insertAdjacentElement('afterend', ghost);
    }

    const workGrid = document.getElementById('work-grid');
    if (workGrid && workGrid.parentNode && !document.getElementById('fps-buy-h')) {
        const buyH = document.createElement('div');
        buyH.id = 'fps-buy-h';
        buyH.className = 'fps-menu-h fps-buy-menu-h';
        buyH.setAttribute('aria-hidden', 'true');
        buyH.innerHTML = `<span><span class="fps-h-dot"></span>WORK &middot; BUY MENU</span>
            <span class="fps-buy-budget">$16&nbsp;000 &middot; BUY TIME <b id="fps-buytime">01:47</b></span>`;
        workGrid.parentNode.insertBefore(buyH, workGrid);
    }

    startMenuClocks();
}

// Drives the NEWS clock + the fake buy-time countdown. The clock is plain text
// (updates each second); the countdown only runs when motion is allowed.
function startMenuClocks() {
    const clock = document.getElementById('fps-clock');
    const buytime = document.getElementById('fps-buytime');
    const two = n => String(n).padStart(2, '0');
    let remain = 107; // 01:47, loops
    const tick = () => {
        if (clock) {
            const d = new Date();
            clock.textContent = `${d.getFullYear()}-${two(d.getMonth() + 1)} · ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
        }
        if (buytime && !RM_FPS) {
            remain = remain > 0 ? remain - 1 : 107;
            buytime.textContent = `${two(Math.floor(remain / 60))}:${two(remain % 60)}`;
        }
    };
    tick();
    // Under reduced motion, render a single static timestamp — no per-second
    // repaint (the buy-time countdown is already frozen inside tick()).
    if (!RM_FPS && (clock || buytime)) setInterval(tick, 1000);
}

// Profile/rank card + friends list, injected on the right. Data comes from the
// already-populated DOM (social links + email + proof stats) so it stays
// i18n-correct and never hardcodes content.
function buildSidePanel() {
    if (document.getElementById('fps-side')) return;
    const content = (window.ContentLoader && ContentLoader.content) || {};
    const name = (content.meta && content.meta.name) || 'TOM ANDRIEU';
    // Keep the rank tier to a single segment ("Product Builder · AI Transf." →
    // "Product Builder") so the profile card's tier line stays one tidy row
    // instead of wrapping to three under the fixed-width side panel.
    const rawTier = (content.meta && content.meta.title) || 'PRODUCT BUILDER';
    const tier = rawTier.split('·')[0].trim() || rawTier;

    // Rank stats from the hero social-proof block (data-driven).
    const proof = [...document.querySelectorAll('.social-proof .proof-stat')].slice(0, 3).map(s => ({
        n: (s.querySelector('.proof-number') || {}).textContent || '',
        l: (s.querySelector('.proof-label') || {}).textContent || ''
    }));
    const statsHtml = proof.length
        ? proof.map(p => `<div class="fps-stat"><b>${p.n}</b><small>${p.l}</small></div>`).join('')
        : '<div class="fps-stat"><b>8+</b><small>years</small></div><div class="fps-stat"><b>30K</b><small>users</small></div><div class="fps-stat"><b>4</b><small>products</small></div>';

    // Friends list from the real contact/social data.
    const contacts = [];
    const social = (content.contact && content.contact.social) || {};
    const gh = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>';
    const li = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16"/><path d="M7 10v6M7 7v.01M11 16v-4a2 2 0 0 1 4 0v4"/></svg>';
    const mail = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/></svg>';
    if (social.github) contacts.push({ href: social.github, ext: true, icon: gh, name: 'GitHub', sub: 'shipping', st: '' });
    if (social.linkedin) contacts.push({ href: social.linkedin, ext: true, icon: li, name: 'LinkedIn', sub: 'online', st: '' });
    const emailEl = document.getElementById('email-link');
    const emailHref = emailEl ? emailEl.getAttribute('href') : 'mailto:contact@tomandrieu.com';
    const emailAddr = (content.contact && content.contact.email) || 'contact@tomandrieu.com';
    contacts.push({ href: emailHref, ext: false, icon: mail, name: 'Email', sub: emailAddr.toLowerCase(), st: 'idle' });

    // The aside is aria-hidden (decorative HUD dressing that duplicates the real
    // #contact links), so its anchors must leave the tab order too — a focusable
    // node inside aria-hidden is a WCAG trap. tabindex="-1" keeps them clickable
    // by mouse without stealing keyboard focus.
    const contactsHtml = contacts.map(c => `
        <a class="fps-friend" href="${c.href}" tabindex="-1"${c.ext ? ' target="_blank" rel="noopener"' : ''}>
            <span class="fps-friend-av">${c.icon}</span>
            <span class="fps-friend-who"><b>${c.name}</b><small>${c.sub}</small></span>
            <span class="fps-friend-st ${c.st}"></span>
        </a>
    `).join('');

    const side = document.createElement('aside');
    side.id = 'fps-side';
    side.setAttribute('aria-hidden', 'true');
    side.innerHTML = `
        <section class="fps-panel fps-rankcard">
            <div class="fps-panel-h"><span>PROFILE</span><span>PRIME</span></div>
            <div class="fps-panel-b">
                <div class="fps-rank-top">
                    <div class="fps-medal">
                        <svg viewBox="0 0 44 44"><path d="M22 3l16 7v11c0 10-7 17-16 20C13 38 6 31 6 21V10z" fill="rgba(242,177,52,.12)" stroke="#f2b134" stroke-width="2"/><path d="M15 22l5 5 9-12" fill="none" stroke="#f2b134" stroke-width="2.6"/></svg>
                    </div>
                    <div><div class="fps-rank-name">${name}</div><div class="fps-rank-tier">RANK &middot; ${tier}</div></div>
                </div>
                <div class="fps-xp"><div class="fps-xp-bar"><i></i></div><div class="fps-xp-lbl"><span>LVL 8+ YRS</span><span>NEXT: SHIP</span></div></div>
                <div class="fps-stats">${statsHtml}</div>
            </div>
        </section>
        <section class="fps-panel fps-friends">
            <div class="fps-panel-h"><span>CONTACTS</span><span>${contacts.length} online</span></div>
            ${contactsHtml}
        </section>
    `;
    document.body.appendChild(side);
}

/* ─── Pixel-snap crosshair + hitmarker + damage numbers ─── */
let fpsMouseX = window.innerWidth / 2;
let fpsMouseY = window.innerHeight / 2;

function initCrosshairAndFx() {
    if (document.getElementById('fps-xhair')) return;
    const xhair = document.createElement('div');
    xhair.id = 'fps-xhair';
    xhair.setAttribute('aria-hidden', 'true');
    xhair.innerHTML =
        '<div class="fps-x-core">' +
        '<span class="fps-x-arm fps-x-t"></span><span class="fps-x-arm fps-x-r"></span>' +
        '<span class="fps-x-arm fps-x-b"></span><span class="fps-x-arm fps-x-l"></span>' +
        '<span class="fps-x-dot"></span>' +
        '<span class="fps-x-brk fps-x-tl"></span><span class="fps-x-brk fps-x-tr"></span>' +
        '<span class="fps-x-brk fps-x-bl"></span><span class="fps-x-brk fps-x-br"></span>' +
        '</div>';
    document.body.appendChild(xhair);

    const fxLayer = document.createElement('div');
    fxLayer.id = 'fps-fx';
    fxLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fxLayer);

    // Anything worth "aiming at" locks the reticle (brackets + accent snap).
    const LOCK_SELECTOR = 'a, button, [role="button"], .fps-buy, .fps-tab, .fps-rail-btn, .fps-friend, .hero-cta, .social-btn, .email-link, input, textarea, select';

    document.addEventListener('pointermove', (e) => {
        fpsMouseX = e.clientX; fpsMouseY = e.clientY;
        xhair.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
        xhair.classList.add('on');
        const onTarget = !!(e.target && e.target.closest && e.target.closest(LOCK_SELECTOR));
        xhair.classList.toggle('fps-lock', onTarget);
    }, { passive: true });
    document.addEventListener('pointerleave', () => xhair.classList.remove('on', 'fps-lock'));

    // Fire kick: retrigger the bloom on every shot (remove → reflow → add).
    function fireCrosshair() {
        if (RM_FPS) return;
        xhair.classList.remove('fps-fire');
        void xhair.offsetWidth;
        xhair.classList.add('fps-fire');
    }

    document.addEventListener('pointerdown', (e) => {
        FpsSound.ensure();
        FpsSound.hit();
        fireCrosshair();
        const h = document.createElement('div');
        h.className = 'fps-hit';
        h.style.left = e.clientX + 'px'; h.style.top = e.clientY + 'px';
        h.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><line x1="4" y1="4" x2="9" y2="9"/><line x1="20" y1="4" x2="15" y2="9"/><line x1="4" y1="20" x2="9" y2="15"/><line x1="20" y1="20" x2="15" y2="15"/></svg>';
        fxLayer.appendChild(h);
        setTimeout(() => h.remove(), 200);

        // Damage number when a real interactive tile / control is hit.
        const tile = e.target.closest('.fps-buy, .fps-tab, .fps-rail-btn, .fps-friend, .hero-cta, .email-link, .social-btn');
        if (tile) {
            const d = document.createElement('div');
            d.className = 'fps-dmg';
            const money = tile.classList.contains('hero-cta') || tile.classList.contains('fps-buy');
            d.textContent = money ? '+MVP' : '-' + (70 + Math.floor(Math.abs(fpsMouseX) % 60));
            if (money) d.classList.add('fps-dmg-gold');
            d.style.left = e.clientX + 'px'; d.style.top = (e.clientY - 14) + 'px';
            fxLayer.appendChild(d);
            setTimeout(() => d.remove(), 540);
        }
    }, { passive: true });
}

// Parallax on the background scene + Cathode (guarded off under reduced motion).
function initParallax() {
    if (RM_FPS) return;
    const layers = [...document.querySelectorAll('#fps-scene .fps-layer')];
    let ticking = false;
    document.addEventListener('pointermove', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const ox = (fpsMouseX / window.innerWidth - 0.5);
            const oy = (fpsMouseY / window.innerHeight - 0.5);
            layers.forEach(l => {
                const d = +l.dataset.depth || 10;
                l.style.transform = `translate(${(-ox * d).toFixed(1)}px,${(-oy * d * 0.6).toFixed(1)}px)`;
            });
            if (window.CathodeGuide && CathodeGuide.setParallax) CathodeGuide.setParallax(-ox * 24, -oy * 13);
            ticking = false;
        });
    }, { passive: true });
}

// Live telemetry numerals in the bottom bar.
function initTelemetry() {
    if (document.getElementById('fps-telemetry')) return;
    const bar = document.createElement('div');
    bar.id = 'fps-telemetry';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = `
        <span class="fps-m"><i>fps</i><b id="fps-t-fps">240</b></span>
        <span class="fps-m"><i>var</i><b id="fps-t-var">0.2</b>ms</span>
        <span class="fps-m"><i>ping</i><b id="fps-t-ping" class="fps-good">0</b>ms</span>
        <span class="fps-m"><i>loss</i><b class="fps-good">0%</b></span>
        <span class="fps-m"><i>choke</i><b class="fps-good">0%</b></span>
        <span class="fps-m"><i>tick</i><b>128.0</b></span>
        <span class="fps-m"><i>sv</i><b id="fps-t-sv">0.0</b></span>
        <span class="fps-m"><i>rate</i><b>786432</b></span>
        <span class="fps-m fps-map"><i>map</i><b>de_portfolio</b></span>
    `;
    document.body.appendChild(bar);
    if (RM_FPS) return;
    const fps = document.getElementById('fps-t-fps'),
        vari = document.getElementById('fps-t-var'),
        ping = document.getElementById('fps-t-ping'),
        sv = document.getElementById('fps-t-sv');
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    setInterval(() => {
        fps.textContent = 236 + Math.floor(rnd() * 9);
        vari.textContent = (0.1 + rnd() * 0.4).toFixed(1);
        ping.textContent = Math.floor(rnd() * 3);
        sv.textContent = (rnd() * 0.6).toFixed(1);
    }, 400);
}

// Scroll-spy: highlight the active tab + rail button for the section in view.
function initScrollSpy() {
    const ids = ['now', 'work', 'timeline', 'about', 'contact'];
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    const setActive = (id) => {
        document.querySelectorAll('#main-nav .fps-tab').forEach(t =>
            t.classList.toggle('fps-tab-active', (t.getAttribute('href') || '') === '#' + id));
        document.querySelectorAll('#fps-rail .fps-rail-btn').forEach(b =>
            b.classList.toggle('fps-rail-active', b.dataset.target === id));
    };
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    sections.forEach(s => io.observe(s));
}

// Hover cues on interactive chrome.
function bindSfx() {
    const bind = () => document.querySelectorAll('.fps-buy, .fps-tab, .fps-rail-btn, .fps-friend, .hero-cta')
        .forEach(el => {
            if (el.dataset.fpsHover) return;
            el.dataset.fpsHover = '1';
            el.addEventListener('pointerenter', () => { FpsSound.ensure(); FpsSound.hover(); });
        });
    bind();
    // Buy tiles render after data loads; re-bind when the grid mutates.
    const grid = document.getElementById('work-grid');
    if (grid && 'MutationObserver' in window) new MutationObserver(bind).observe(grid, { childList: true });
}

/* ─── Init ─── */
ThemeInit.exportBlogRenderer((article, index) =>
    CardRenderer.renderBlogCard(article, index, fpsThemeConfig.blogCards));

ThemeInit.whenReady(() => ThemeInit.init(fpsThemeConfig));
