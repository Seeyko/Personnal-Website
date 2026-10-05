/**
 * ═══════════════════════════════════════════════════════════════
 * FPS ARENA PORTFOLIO — Theme JavaScript
 * "de_portfolio" — Dust II at noon, seen through the CS2 HUD.
 *
 * The HUD chrome (Dust II backdrop, left rail, round scoreboard, radar,
 * profile/rank card, friends list, kill feed, health/ammo bar, crosshair,
 * hit FX) is INJECTED into the DOM at runtime — it wraps the real single-page site rather than replacing it.
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
    // Dry fire on an empty mag, then the reload: mag out, mag in, bolt.
    'fps:empty': (a) => a.noise(a.t, 0.02, 0.06, 3200, 3200, 5),
    'fps:reload': (a) => {
        a.noise(a.t, 0.05, 0.07, 1200, 700, 2);
        a.noise(a.t + 0.55, 0.04, 0.09, 1600, 900, 2);
        a.tone(a.t + 0.56, 0.03, 0.05, 'square', 420, 380);
        a.noise(a.t + 1.05, 0.03, 0.08, 2600, 1800, 3);
        a.noise(a.t + 1.12, 0.03, 0.08, 2000, 2600, 3);
    },

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

/* ───────────────────────── de_dust2 callouts ─────────────────────────
   Each real section is a spot on the map. The same callouts drive the radar
   (player dot walks T spawn → Long → A → CT → B as you scroll), the stencil
   tags painted next to the section titles and the rail tooltips. Listed in
   page order: the walk follows the sections as they come down the page. */
const FPS_CALLOUTS = {
    hero: 'T SPAWN',
    now: 'OUTSIDE LONG',
    work: 'LONG A',
    timeline: 'A SITE',
    about: 'CT SPAWN',
    contact: 'B SITE',
    footer: 'B SITE'
};
// Radar route (radar viewBox 0 0 200 200). ROUTE[i] is the walk from the
// i-th anchor (hero, now, work, timeline, about, contact) to the next one.
const FPS_ROUTE = [
    [[95, 178], [128, 172], [150, 169]],
    [[150, 169], [168, 152], [172, 112]],
    [[172, 112], [173, 66], [156, 38]],
    [[156, 38], [124, 36], [100, 40]],
    [[100, 40], [70, 38], [40, 44]],
    [[40, 44], [36, 58]]
];

/* ───────────────────────── Buy-menu tiles ─────────────────────────
   Filled weapon silhouettes (kill-feed style) + a fictional money-green
   price, cycled by slot. viewBox 0 0 64 22. */
const FPS_WEAPONS = [
    { name: 'AK-47', kind: 'RIFLE', d: 'M1 9 L13 7.6 L14.5 8 L35 8 L35 7.4 L47 7.4 L47 8.8 L44.5 8.8 L44.5 9.6 L56 9.6 L56 8 L57 8 L57 9.6 L62 9.6 L62 11 L44.5 11 L44.5 12.4 L34.5 12.4 L34 13.2 L31.5 13.2 L33.8 20 L28.6 21 L26.8 13.2 L23.2 13.2 L21.6 19.5 L17.4 19.5 L19 13.2 L14.5 13.2 L3.5 16.4 L1 15.6 Z' },
    { name: 'AWP', kind: 'SNIPER RIFLE', d: 'M1 10.5 L4 9 L15 9 L17 10 L19 9.4 L40 9.4 L40 9 L62 9 L62 10.2 L40 10.2 L40 11.6 L28 11.6 L27 13 L24 13 L23.5 17.5 L20 17.5 L20.8 13 L17 13 L13.5 15.5 L9 15.5 L8 12.5 L4 12.8 L1 14 Z M17.5 6 L19 5.4 L36 5.4 L38 4.8 L38 8.6 L36 8.2 L19 8.2 L17.5 7.8 Z M24 8.2 L26 8.2 L26 9.4 L24 9.4 Z M31 8.2 L33 8.2 L33 9.4 L31 9.4 Z' },
    { name: 'M4A4', kind: 'RIFLE', d: 'M1 9.5 L4 8.4 L13 8.4 L13 9.6 L15 9.6 L15 8 L20 7.6 L20 5.8 L31 5.8 L31 7.6 L33 7.6 L33 8 L46 8 L46 9 L58 9 L58 8 L59 8 L59 9 L62 9 L62 10.2 L46 10.2 L46 12.2 L31 12.2 L29.6 19.6 L25.6 19.6 L26.6 12.2 L23 12.2 L21.3 18.6 L17.8 18.6 L19 12.2 L15 12.2 L13 11 L4 13.2 L1 13.6 Z' },
    { name: 'DESERT EAGLE', kind: 'PISTOL', d: 'M18 6 L46 6 L46 7 L47 7 L47 11 L30 11 L29 12.6 L28.5 14 L25.6 14 L25 12.2 L24.2 12.2 L25.4 19.6 L18.6 20.2 L17 12.4 L18 11 Z' },
    { name: 'KNIFE', kind: 'MELEE', d: 'M6 11 L28 11 L28 9.5 L30 9.5 L30 11 L58 10.2 C61.2 10.6 61.6 12.1 59 13.2 L30 14.6 L30 16.5 L28 16.5 L28 15 L6 15 L4.6 13 Z' }
];
const FPS_PRICES = [2700, 4750, 3100, 700, 0];

function fpsWeapon(n) { return FPS_WEAPONS[(n - 1) % FPS_WEAPONS.length]; }
function fpsWeaponSvg(w) { return `<svg viewBox="0 0 64 22" fill="currentColor" aria-hidden="true"><path d="${w.d}"/></svg>`; }
function fpsPrice(n) { return FPS_PRICES[(n - 1) % FPS_PRICES.length]; }
function fpsMoney(v) { return v ? '$' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : 'FREE'; }
// Theme string from i18n/themes/fps (LanguageManager.t echoes the key back when it's missing).
function fpsT(key, fallback) {
    const v = window.LanguageManager && LanguageManager.t(key);
    return typeof v === 'string' && v !== key ? v : fallback;
}

const fpsThemeConfig = {
    name: 'FPS',

    cards: {
        // Buy-menu tile: reuses the shared card renderer (title/desc/tags come
        // from the real project data + i18n); we only theme the chrome.
        wrapperClass: 'project-card fps-buy fade-in-up',
        tagWrapper: '{tag}',
        headerTemplate: (project, idx) => {
            const n = parseInt(idx, 10);
            const w = fpsWeapon(n);
            return `
                <div class="fps-buy-head">
                    <span class="fps-buy-num">${n}</span>
                    <span class="fps-buy-gun">${w.name}</span>
                    <span class="fps-buy-price">${fpsMoney(fpsPrice(n))}</span>
                </div>
                <div class="fps-buy-icon">${fpsWeaponSvg(w)}</div>
            `;
        },
        footerTemplate: (project, idx) => `
                <div class="fps-buy-foot">
                    <span class="fps-buy-slot">${fpsWeapon(parseInt(idx, 10)).kind}</span>
                    <span class="fps-buy-cta">BUY&nbsp;&#9656;</span>
                </div>
            `
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
    // HUD bar, crosshair, ribbon) is present. CSS gates the native-cursor
    // hide and the #main-content padding that reserves space for that chrome on
    // this class. The blog gets the same HUD: what needs the home page's
    // sections degrades there (the rail jumps to /#section, the radar stays at
    // spawn, the scroll-spy and callouts find nothing to mark). The admin page
    // never runs this (ThemeInit skips theme effects there).
    document.body.classList.add('fps-hud');
    injectScene();
    injectHud();
    decorateTabs();
    injectPlayerBadge();
    injectScoreboard();
    injectMenuChrome();
    injectCallouts();
    relabelAbout();
    buildSidePanel();
    initCrosshairAndFx();
    initParallax();
    initTelemetry();
    initScrollSpy();
    initRadar();
    initKillfeed();
    initFooterHandoff();
    bindSfx();
    // The reveals were measured before the timeline rendered and before the
    // chrome above was injected: measure again so About's reveal (now below
    // the timeline) fires when it comes in view.
    if (window.ScrollTrigger) ScrollTrigger.refresh();
}

// Dust II at noon, fixed behind the scrolling content: a hazy sky, the
// distant town, the Long A walls (double doors, painted "A →"), and crates
// on the sand. Three .fps-layer planes drift with the pointer (initParallax).
// The page background is also the sky of the footer painting, so the
// architecture fades out when the footer arrives (initFooterHandoff).
function injectScene() {
    if (document.getElementById('fps-scene')) return;
    const scene = document.createElement('div');
    scene.id = 'fps-scene';
    scene.setAttribute('aria-hidden', 'true');
    const svg = (cls, depth, body) =>
        `<svg class="fps-layer ${cls}" data-depth="${depth}" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice">${body}</svg>`;

    // Far: the hazy town on the horizon (dome, tower, flat roofs).
    const far = `
        <g fill="#e9d6ad" opacity=".9">
            <path d="M0 640 V585 H70 V560 H150 V600 H210 V570 H300 V610 H360 V540 H392 V520 H404 V540 H436 V612 H520 V590 H600 V625 H680 V600 H760 V640 Z"/>
            <path d="M820 640 V598 H900 V575 H960 V560 A44 44 0 0 1 1048 560 V600 H1110 V580 H1200 V615 H1290 V570 H1340 V600 H1430 V585 H1520 V605 H1600 V640 Z"/>
        </g>
        <g fill="#dcc596" opacity=".9">
            <rect x="96" y="575" width="10" height="12"/><rect x="250" y="585" width="10" height="12"/>
            <rect x="372" y="552" width="8" height="12"/><rect x="1150" y="592" width="10" height="12"/>
            <rect x="1300" y="585" width="10" height="12"/><rect x="996" y="575" width="12" height="16"/>
        </g>
        <rect x="0" y="630" width="1600" height="30" fill="#ead9b4" opacity=".7"/>`;

    // Mid: the two walls framing Long A + the low back wall with its arch.
    const mid = `
        <path d="M430 760 V655 H700 V640 H900 V655 H1180 V760 Z" fill="#dcc394"/>
        <path d="M735 760 V700 A45 45 0 0 1 825 700 V760 Z" fill="#b99360"/>
        <path d="M430 655 H1180 V664 H430 Z" fill="#c8aa75"/>
        <!-- left building: lit face + shaded return + roof trim -->
        <path d="M0 230 H360 V1000 H0 Z" fill="#e1c792"/>
        <path d="M360 262 L452 300 V1000 H360 Z" fill="#b48d58"/>
        <path d="M0 218 H372 V236 H0 Z M372 218 L462 262 V276 L372 236 Z" fill="#c9a66e"/>
        <g fill="#d2b47f">
            <rect x="0" y="420" width="360" height="5"/><rect x="0" y="640" width="360" height="4"/>
            <rect x="34" y="300" width="56" height="9"/><rect x="250" y="300" width="56" height="9"/>
        </g>
        <rect x="42" y="318" width="40" height="52" fill="#5e4a33"/><rect x="258" y="318" width="40" height="52" fill="#5e4a33"/>
        <path d="M42 318 H82 V324 H42 Z M258 318 H298 V324 H258 Z" fill="#3e3022"/>
        <!-- Long doors: arched opening with the two wooden leaves -->
        <path d="M96 1000 V610 A84 84 0 0 1 264 610 V1000 Z" fill="#c5a26b"/>
        <path d="M112 1000 V616 A68 68 0 0 1 248 616 V1000 Z" fill="#3b2a1a"/>
        <path d="M118 1000 V622 A62 62 0 0 1 178 562 V1000 Z" fill="#6a4729"/>
        <path d="M182 1000 V562 A62 62 0 0 1 242 622 V1000 Z" fill="#634226"/>
        <g fill="#4a311c">
            <rect x="118" y="700" width="60" height="7"/><rect x="182" y="700" width="60" height="7"/>
            <rect x="118" y="840" width="60" height="7"/><rect x="182" y="840" width="60" height="7"/>
            <rect x="140" y="600" width="3" height="400"/><rect x="158" y="580" width="3" height="420"/>
            <rect x="200" y="580" width="3" height="420"/><rect x="220" y="600" width="3" height="400"/>
        </g>
        <g fill="#8a6a44"><circle cx="170" cy="780" r="4"/><circle cx="190" cy="780" r="4"/></g>
        <!-- right building -->
        <path d="M1240 300 H1600 V1000 H1240 Z" fill="#e3ca96"/>
        <path d="M1240 300 L1158 340 V1000 H1240 Z" fill="#b58f5a"/>
        <path d="M1228 288 H1600 V306 H1228 Z M1228 288 L1150 328 V342 L1228 306 Z" fill="#c9a66e"/>
        <g fill="#5e4a33">
            <rect x="1300" y="380" width="44" height="58"/><rect x="1440" y="380" width="44" height="58"/>
            <rect x="1520" y="560" width="44" height="58"/>
        </g>
        <path d="M1300 380 H1344 V387 H1300 Z M1440 380 H1484 V387 H1440 Z M1520 560 H1564 V567 H1520 Z" fill="#3e3022"/>
        <rect x="1262" y="520" width="200" height="10" fill="#7a5a36"/>
        <g fill="#7a5a36"><rect x="1280" y="530" width="6" height="22"/><rect x="1440" y="530" width="6" height="22"/></g>
        <rect x="1240" y="700" width="360" height="5" fill="#d2b47f"/>
        <!-- painted callout on the wall -->
        <g fill="#a33a22" opacity=".85" font-family="'Big Shoulders Stencil Display',Impact,sans-serif" font-weight="800">
            <text x="1300" y="660" font-size="110">A</text>
            <path d="M1385 620 H1470 V604 L1508 628 L1470 652 V636 H1385 Z"/>
        </g>`;

    // Near: sand floor, crate stacks, a barrel.
    const crate = (x, y, s, tone) => `
        <g transform="translate(${x} ${y}) scale(${s})">
            <rect width="100" height="100" fill="${tone}"/>
            <path d="M0 0 H100 V10 H0 Z M0 90 H100 V100 H0 Z M0 0 H10 V100 H0 Z M90 0 H100 V100 H90 Z" fill="#7a5630"/>
            <path d="M10 18 L18 10 L90 82 L82 90 Z" fill="#8c653a"/>
            <path d="M0 0 H100 V4 H0 Z" fill="#c8a06a"/>
        </g>`;
    const near = `
        <path d="M0 905 Q400 880 800 892 T1600 885 V1000 H0 Z" fill="#d9b67c"/>
        <path d="M0 940 Q420 925 820 935 T1600 930 V1000 H0 Z" fill="#cfa86c"/>
        ${crate(1330, 745, 1.6, '#a97f4b')}
        ${crate(1490, 745, 1.6, '#a07646')}
        ${crate(1405, 615, 1.3, '#ad8450')}
        ${crate(10, 800, 1.1, '#a57b48')}
        <g transform="translate(1260 860)">
            <rect width="62" height="80" rx="6" fill="#5f6b4a"/>
            <rect y="14" width="62" height="5" fill="#46503a"/><rect y="58" width="62" height="5" fill="#46503a"/>
            <rect width="62" height="5" fill="#77845d"/>
        </g>
        <path d="M0 990 H1600 V1000 H0 Z" fill="#b8925a"/>`;

    scene.innerHTML =
        svg('fps-l-far', 5, far) +
        svg('fps-l-mid', 12, mid) +
        svg('fps-l-near', 22, near) +
        `<div class="fps-sun"></div><div class="fps-dust"></div><div class="fps-scrim"></div>`;
    document.body.insertBefore(scene, document.body.firstChild);
}

// Left icon rail (maps to the real sections, in page/nav order) + mute toggle.
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
        <button class="fps-rail-btn${s.warn ? ' fps-warn' : ''}" data-target="${s.id}" data-callout="${FPS_CALLOUTS[s.id]}" title="${s.label}" aria-label="${s.label}">
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
        // Same landing as the #hash (below the header, reduced motion honoured).
        if (target) { ThemeInit.scrollToSection(target); FpsSound.tab(); }
        // Not on this page (the blog): the section lives on the home page.
        else window.location.href = `/#${btn.dataset.target}`;
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

// Player badge, folded into the top-right HUD next to the (reskinned) theme +
// language chips. Data-driven.
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
    `;
    host.insertBefore(badge, host.firstChild);
}

// Proof stats from the hero (data-driven), read before CSS hides them there.
function fpsProofStats() {
    return [...document.querySelectorAll('.social-proof .proof-stat')].slice(0, 3).map(s => ({
        n: ((s.querySelector('.proof-number') || {}).textContent || '').trim(),
        l: ((s.querySelector('.proof-label') || {}).textContent || '').trim()
    }));
}

// CS2 round scoreboard, centred in the header: CT score (years) · round timer
// · T score (live products). The timer counts the round down; at 0:00 the bomb
// is planted and a red C4 timer runs before the next round starts.
function injectScoreboard() {
    const header = document.querySelector('.header');
    if (!header || document.getElementById('fps-score')) return;
    const proof = fpsProofStats();
    const num = (i, fb) => parseInt((proof[i] && proof[i].n) || '', 10) || fb;
    const ct = num(0, 8), t = num(2, 4);
    const pips = (n) => '<i></i>'.repeat(n);
    const sb = document.createElement('div');
    sb.id = 'fps-score';
    sb.setAttribute('aria-hidden', 'true');
    sb.innerHTML = `
        <span class="fps-sc-pips fps-sc-ct">${pips(5)}</span>
        <span class="fps-sc-n fps-sc-ct">${ct}</span>
        <span class="fps-sc-clock">
            <b id="fps-round">1:55</b>
            <small id="fps-round-lbl">ROUND ${ct + t + 1}</small>
        </span>
        <span class="fps-sc-n fps-sc-t">${t}</span>
        <span class="fps-sc-pips fps-sc-t">${pips(5)}</span>
    `;
    header.appendChild(sb);
}

// Injects the CS main-menu framing the wrapped site lacks: the console strip
// across the top, the NEWS + BUY-MENU panel-header bars and the hero eyebrow.
// fps-only — this file never runs under another theme and a theme switch
// full-reloads the page, so nothing here leaks elsewhere.
function injectMenuChrome() {
    if (!document.getElementById('fps-ribbon')) {
        const rib = document.createElement('div');
        rib.id = 'fps-ribbon';
        rib.setAttribute('aria-hidden', 'true');
        rib.innerHTML = `<span><b>de_dust2</b> &middot; de_portfolio</span>
            <span class="fps-ribbon-sep">|</span>
            <span>${fpsT('fps.hint', 'bouge la souris · clique pour tirer · scrolle pour avancer sur la map')}</span>`;
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
        newsH.innerHTML = `<span><span class="fps-h-dot"></span>${fpsT('fps.news', 'NEWS · EN CE MOMENT')}</span>
            <span class="fps-clock" id="fps-clock">--:--:--</span>`;
        hero.insertBefore(newsH, hero.firstChild);
    }

    // Secondary ghost CTA next to the filled hero CTA. Text is i18n-driven.
    const heroCta = document.getElementById('hero-cta');
    if (heroCta && !document.getElementById('fps-cta-ghost')) {
        const label = fpsT('ui.seeWork', 'Voir le travail');
        const ghost = document.createElement('a');
        ghost.id = 'fps-cta-ghost';
        ghost.className = 'hero-cta fps-cta-ghost';
        ghost.href = '#work';
        ghost.innerHTML = `<span>${label}</span><span class="hero-cta-arrow">&#9656;</span>`;
        ghost.addEventListener('click', () => { FpsSound.ensure(); FpsSound.tab(); });
        heroCta.insertAdjacentElement('afterend', ghost);
    }

    const workGrid = document.getElementById('work-grid');
    if (workGrid && workGrid.parentNode && !document.getElementById('fps-buy-h')) {
        const buyH = document.createElement('div');
        buyH.id = 'fps-buy-h';
        buyH.className = 'fps-menu-h fps-buy-menu-h';
        buyH.setAttribute('aria-hidden', 'true');
        buyH.innerHTML = `<span><span class="fps-h-dot"></span>${fpsT('fps.buyMenu', 'BUY MENU · WORK')}</span>
            <span class="fps-buy-budget">BUDGET <b>$16&nbsp;000</b></span>`;
        workGrid.parentNode.insertBefore(buyH, workGrid);
    }

    startMenuClocks();
}

// Drives the NEWS clock + the round timer. The clock is plain text (updates
// each second); the round timer only runs when motion is allowed.
function startMenuClocks() {
    const clock = document.getElementById('fps-clock');
    const round = document.getElementById('fps-round');
    const roundLbl = document.getElementById('fps-round-lbl');
    const score = document.getElementById('fps-score');
    const roundText = roundLbl ? roundLbl.textContent : '';
    const two = n => String(n).padStart(2, '0');
    let remain = 115, bomb = false;
    const tick = () => {
        if (clock) {
            const d = new Date();
            clock.textContent = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} · ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
        }
        if (round && !RM_FPS) {
            if (remain > 0) remain--;
            else if (!bomb) { bomb = true; remain = 40; }
            else { bomb = false; remain = 115; }
            round.textContent = `${Math.floor(remain / 60)}:${two(remain % 60)}`;
            if (score) score.classList.toggle('fps-sc-bomb', bomb);
            if (roundLbl) roundLbl.textContent = bomb ? 'BOMB PLANTED' : roundText;
        }
    };
    tick();
    // Under reduced motion, render a single static timestamp — no per-second
    // repaint (the round timer is already frozen inside tick()).
    if (!RM_FPS && (clock || round)) setInterval(tick, 1000);
}

// Stencilled callout next to each section title, the way Dust II paints its
// directions on the walls ("LONG A →").
function injectCallouts() {
    Object.keys(FPS_CALLOUTS).forEach(id => {
        const label = document.querySelector(`#${id} .section-label`);
        if (!label || label.querySelector('.fps-callout')) return;
        const tag = document.createElement('span');
        tag.className = 'fps-callout';
        tag.setAttribute('aria-hidden', 'true');
        tag.innerHTML = `${FPS_CALLOUTS[id]}<svg viewBox="0 0 24 12" fill="currentColor"><path d="M0 4h15V0l9 6-9 6V8H0z"/></svg>`;
        label.appendChild(tag);
    });
}

// The about card's "/* … */" code comments are a terminal idiom: retitle
// them as CS2 player-card sub-headers, and drop the spec keys' trailing
// colons (HUD stat lists don't use them).
function relabelAbout() {
    const labels = [fpsT('fps.bio', 'BIO'), fpsT('fps.playstyle', 'PLAYSTYLE'), fpsT('fps.loadout', 'LOADOUT')];
    document.querySelectorAll('#about .code-comment').forEach((el, i) => { if (labels[i]) el.textContent = labels[i]; });
    document.querySelectorAll('#about .spec-key').forEach(el => { el.textContent = el.textContent.replace(/\s*:\s*$/, ''); });
}

// Radar + profile/rank card + friends list, injected on the right. Data comes
// from the already-populated DOM (social links + email + proof stats) so it
// stays i18n-correct and never hardcodes content.
function buildSidePanel() {
    if (document.getElementById('fps-side')) return;
    const content = (window.ContentLoader && ContentLoader.content) || {};
    const name = (content.meta && content.meta.name) || 'TOM ANDRIEU';
    // Keep the rank tier to a single segment ("Product Builder · AI Transf." →
    // "Product Builder") so it stays one tidy row in the fixed-width column.
    const rawTier = (content.meta && content.meta.title) || 'PRODUCT BUILDER';
    const tier = rawTier.split('·')[0].trim() || rawTier;

    // The blog has no hero to read them from: same figures, same labels.
    const proof = fpsProofStats();
    const stats = proof.length ? proof : [
        { n: '8+', l: fpsT('stats.yearsExperience', 'years') },
        { n: '30K+', l: fpsT('stats.usersReached', 'users') },
        { n: '4', l: fpsT('stats.liveProducts', 'products') }
    ];
    const statsHtml = stats.map(p => `<div class="fps-stat"><b>${p.n}</b><small>${p.l}</small></div>`).join('');

    // Friends list from the real contact/social data.
    const contacts = [];
    const social = (content.contact && content.contact.social) || {};
    const gh = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>';
    const li = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16"/><path d="M7 10v6M7 7v.01M11 16v-4a2 2 0 0 1 4 0v4"/></svg>';
    const mail = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/></svg>';
    if (social.github) contacts.push({ href: social.github, ext: true, icon: gh, name: 'GitHub', sub: 'Playing de_portfolio', st: 'ingame' });
    if (social.linkedin) contacts.push({ href: social.linkedin, ext: true, icon: li, name: 'LinkedIn', sub: 'Online', st: '' });
    const emailEl = document.getElementById('email-link');
    const emailHref = emailEl ? emailEl.getAttribute('href') : 'mailto:contact@tomandrieu.com';
    const emailAddr = (content.contact && content.contact.email) || 'contact@tomandrieu.com';
    contacts.push({ href: emailHref, ext: false, icon: mail, name: 'Email', sub: emailAddr.toLowerCase(), st: 'idle' });

    // The aside is aria-hidden (decorative HUD dressing that duplicates the real
    // #contact links), so its anchors must leave the tab order too — a focusable
    // node inside aria-hidden is a WCAG trap. tabindex="-1" keeps them clickable
    // by mouse without stealing keyboard focus.
    const contactsHtml = contacts.map(c => `
        <a class="fps-friend${c.st ? ' fps-fr-' + c.st : ''}" href="${c.href}" tabindex="-1"${c.ext ? ' target="_blank" rel="noopener"' : ''}>
            <span class="fps-friend-av">${c.icon}</span>
            <span class="fps-friend-who"><b>${c.name}</b><small>${c.sub}</small></span>
            <span class="fps-friend-st ${c.st}"></span>
        </a>
    `).join('');

    const side = document.createElement('aside');
    side.id = 'fps-side';
    side.setAttribute('aria-hidden', 'true');
    side.innerHTML = `
        <section class="fps-panel fps-radar">
            <div class="fps-panel-h"><span>RADAR &middot; DE_DUST2</span><span id="fps-radar-spot">${FPS_CALLOUTS.hero}</span></div>
            <div class="fps-radar-b">${fpsRadarSvg()}</div>
        </section>
        <section class="fps-panel fps-rankcard">
            <div class="fps-panel-h"><span>PROFILE</span><span>PREMIER</span></div>
            <div class="fps-panel-b">
                <div class="fps-rank-top">
                    <div class="fps-medal">
                        <svg viewBox="0 0 48 48"><path d="M24 3l17 7v12c0 11-7.5 18.5-17 22C14.5 40.5 7 33 7 22V10z" fill="rgba(232,163,61,.14)" stroke="#e8a33d" stroke-width="2"/><path d="M24 13l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L24 29.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#ffc965"/></svg>
                    </div>
                    <div><div class="fps-rank-name">${name}</div><div class="fps-rank-tier">${tier}</div></div>
                </div>
                <div class="fps-xp"><div class="fps-xp-bar"><i></i></div><div class="fps-xp-lbl"><span>LVL 8+ YRS</span><span>NEXT: SHIP</span></div></div>
                <div class="fps-stats">${statsHtml}</div>
            </div>
        </section>
        <section class="fps-panel fps-friends">
            <div class="fps-panel-h"><span>FRIENDS</span><span>${contacts.length} ONLINE</span></div>
            ${contactsHtml}
        </section>
    `;
    document.body.appendChild(side);
}

// Stylised de_dust2 overview (north up, T spawn bottom): floors, bombsite
// letters, spawns, two static teammates and the player arrow driven by scroll.
function fpsRadarSvg() {
    const floor = [
        [60, 160, 70, 32], [126, 158, 50, 22], [158, 128, 22, 40], [160, 40, 28, 94],
        [120, 16, 68, 40], [108, 56, 30, 18], [88, 60, 20, 104], [78, 22, 44, 36],
        [50, 30, 34, 16], [14, 16, 48, 52], [22, 66, 20, 72], [22, 128, 44, 18], [50, 140, 16, 26]
    ].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('');
    return `
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
            <g class="fps-rd-floor">${floor}</g>
            <text class="fps-rd-site" x="152" y="44">A</text>
            <text class="fps-rd-site" x="34" y="48">B</text>
            <text class="fps-rd-spawn" x="98" y="44">CT</text>
            <text class="fps-rd-spawn" x="90" y="185">T</text>
            <circle class="fps-rd-mate" cx="98" cy="120" r="3"/>
            <circle class="fps-rd-mate" cx="36" cy="100" r="3"/>
            <g id="fps-rd-me" transform="translate(95 178)">
                <path class="fps-rd-cone" d="M0 0 L-16 -30 A34 34 0 0 1 16 -30 Z"/>
                <circle class="fps-rd-ping" r="6"/>
                <path class="fps-rd-arrow" d="M0 -6 L5 5 L0 2.5 L-5 5 Z"/>
            </g>
        </svg>`;
}

// Walk the radar player along FPS_ROUTE as the page scrolls. The anchor
// line sits 35% down the viewport, like the scroll-spy. `ids` must follow
// the page order (each anchor's top below the previous one's).
function initRadar() {
    const me = document.getElementById('fps-rd-me');
    const spot = document.getElementById('fps-radar-spot');
    if (!me) return;
    const ids = ['hero', 'now', 'work', 'timeline', 'about', 'contact', 'footer'];
    const els = ids.map(id => id === 'hero' ? document.querySelector('.hero')
        : id === 'footer' ? document.getElementById('site-footer') : document.getElementById(id));
    if (els.some(el => !el)) return;

    const along = (pts, t) => {
        const segs = [];
        let total = 0;
        for (let i = 1; i < pts.length; i++) {
            const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            segs.push(l); total += l;
        }
        let d = t * total;
        for (let i = 0; i < segs.length; i++) {
            if (d <= segs[i] || i === segs.length - 1) {
                const k = segs[i] ? Math.min(1, d / segs[i]) : 0;
                const a = pts[i], b = pts[i + 1];
                return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
            }
            d -= segs[i];
        }
        return { x: pts[0][0], y: pts[0][1], ang: 0 };
    };

    let ticking = false, lastSpot = '';
    const update = () => {
        ticking = false;
        const y = window.scrollY + window.innerHeight * 0.35;
        const tops = els.map(el => el.getBoundingClientRect().top + window.scrollY);
        let i = 0;
        while (i < tops.length - 2 && y >= tops[i + 1]) i++;
        const t = Math.max(0, Math.min(1, (y - tops[i]) / Math.max(1, tops[i + 1] - tops[i])));
        const p = along(FPS_ROUTE[i], t);
        const deg = p.ang * 180 / Math.PI + 90;
        me.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${deg.toFixed(0)})`);
        const name = FPS_CALLOUTS[ids[t > 0.85 ? i + 1 : i]];
        if (spot && name !== lastSpot) { spot.textContent = name; lastSpot = name; }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    // Late content (projects, timeline) changes section offsets after init.
    setTimeout(update, 1200);
}

// Kill feed, top right of the play area: Tom taking out the usual enemies of
// a product team. Lives inside #main-content so the header dropdowns (same
// stacking context, higher z) always draw above it.
function initKillfeed() {
    const main = document.getElementById('main-content');
    if (!main || document.getElementById('fps-killfeed')) return;
    const feed = document.createElement('div');
    feed.id = 'fps-killfeed';
    feed.setAttribute('aria-hidden', 'true');
    main.appendChild(feed);

    const content = (window.ContentLoader && ContentLoader.content) || {};
    const me = ((content.meta && content.meta.name) || 'Tom Andrieu').trim().toUpperCase().replace(/\s+/g, '_');
    const VICTIMS = ['SCOPE_CREEP', 'LEGACY_CODE', 'TECH_DEBT', 'JIRA_BACKLOG', 'SPEC_V12_FINAL', 'FLAKY_TEST', 'MEETING_BLOAT', 'BORING_SLIDES'];
    const HS = '<svg class="fps-kf-hs" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5.5 5.5 0 0 0-5.5 5.5c0 1.8.9 3.1 2 4V14h7v-3.5c1.1-.9 2-2.2 2-4A5.5 5.5 0 0 0 8 1zM6 7.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"/></svg>';
    let n = 0;
    const push = (victim) => {
        const w = FPS_WEAPONS[n % FPS_WEAPONS.length];
        const row = document.createElement('div');
        row.className = 'fps-kf-row';
        row.innerHTML = `<b class="fps-kf-t">${me}</b><span class="fps-kf-gun">${fpsWeaponSvg(w)}</span>${n % 2 === 0 ? HS : ''}<b class="fps-kf-ct">${victim}</b>`;
        feed.appendChild(row);
        n++;
        while (feed.children.length > 3) feed.firstChild.remove();
        if (!RM_FPS) setTimeout(() => { row.classList.add('fps-kf-out'); setTimeout(() => row.remove(), 400); }, 7000);
    };
    if (RM_FPS) { push(VICTIMS[0]); push(VICTIMS[1]); return; }
    let v = 0;
    setTimeout(() => push(VICTIMS[v++ % VICTIMS.length]), 1600);
    setInterval(() => { if (!document.hidden) push(VICTIMS[v++ % VICTIMS.length]); }, 6500);
}

// The footer painting's sky is transparent: the fixed scene shows through it.
// While the painting is on screen, the right column slides off (it would float
// in the painted sky) and the scene drops its architecture to plain sky.
function initFooterHandoff() {
    const art = document.getElementById('sf-scene') || document.getElementById('site-footer');
    if (!art || !('IntersectionObserver' in window)) return;
    new IntersectionObserver((entries) => {
        entries.forEach(e => document.body.classList.toggle('fps-at-footer', e.isIntersecting));
    }, { rootMargin: '0px 0px 0px 0px', threshold: 0 }).observe(art);
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
        if (!fpsShoot()) { if (window.SFX) SFX.play('fps:empty'); return; }
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

// Magazine: every click is a shot. An empty mag clicks dry and auto-reloads
// (the click itself still goes through — this is only HUD dressing).
let fpsAmmo = 30, fpsReserve = 90, fpsReloading = false;
function fpsShoot() {
    if (fpsReloading) return false;
    if (fpsAmmo <= 0) { fpsReload(); return false; }
    fpsAmmo--;
    fpsAmmoPaint();
    if (fpsAmmo === 0) setTimeout(fpsReload, 250);
    return true;
}
function fpsReload() {
    if (fpsReloading || fpsAmmo === 30) return;
    fpsReloading = true;
    const hud = document.getElementById('fps-ammo-box');
    if (hud) hud.classList.add('fps-reloading');
    if (window.SFX) SFX.play('fps:reload');
    setTimeout(() => {
        const need = 30 - fpsAmmo;
        if (fpsReserve < need) fpsReserve += 90; // infinite reserve, CS-casual style
        fpsReserve -= need; fpsAmmo = 30;
        fpsReloading = false;
        if (hud) hud.classList.remove('fps-reloading');
        fpsAmmoPaint();
    }, RM_FPS ? 0 : 1400);
}
function fpsAmmoPaint() {
    const a = document.getElementById('fps-ammo'), r = document.getElementById('fps-reserve');
    if (a) { a.textContent = fpsAmmo; a.classList.toggle('fps-low', fpsAmmo <= 8); }
    if (r) r.textContent = fpsReserve;
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

// Bottom HUD (CS2 layout): health + armor left, net_graph centre, money +
// ammo + weapon right. Keeps the #fps-telemetry id: Cathode reads its height
// to stand on top of it.
function initTelemetry() {
    if (document.getElementById('fps-telemetry')) return;
    const bar = document.createElement('div');
    bar.id = 'fps-telemetry';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = `
        <div class="fps-hud-l">
            <span class="fps-vital fps-hp">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z"/></svg>
                <b>100</b><i class="fps-vbar"><i></i></i>
            </span>
            <span class="fps-vital fps-armor">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .8l6 2.4v4.3c0 3.9-2.6 6.6-6 7.7-3.4-1.1-6-3.8-6-7.7V3.2z"/></svg>
                <b>100</b><i class="fps-vbar"><i></i></i>
            </span>
        </div>
        <div class="fps-hud-c">
            <span class="fps-m"><i>fps</i><b id="fps-t-fps">240</b></span>
            <span class="fps-m"><i>ping</i><b id="fps-t-ping" class="fps-good">0</b>ms</span>
            <span class="fps-m"><i>loss</i><b class="fps-good">0%</b></span>
            <span class="fps-m"><i>tick</i><b>128</b></span>
            <span class="fps-m"><i>var</i><b id="fps-t-var">0.2</b>ms</span>
            <span class="fps-m fps-map"><i>map</i><b>de_dust2</b></span>
        </div>
        <div class="fps-hud-r">
            <span class="fps-cash">$16 000</span>
            <span class="fps-ammo-box" id="fps-ammo-box">
                <b id="fps-ammo">30</b><small>/ <span id="fps-reserve">90</span></small>
                <em>RELOADING</em>
            </span>
            <span class="fps-hud-gun">${fpsWeaponSvg(FPS_WEAPONS[0])}</span>
        </div>
    `;
    document.body.appendChild(bar);
    if (RM_FPS) return;
    const fps = document.getElementById('fps-t-fps'),
        vari = document.getElementById('fps-t-var'),
        ping = document.getElementById('fps-t-ping');
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    setInterval(() => {
        fps.textContent = 236 + Math.floor(rnd() * 9);
        vari.textContent = (0.1 + rnd() * 0.4).toFixed(1);
        ping.textContent = Math.floor(rnd() * 3);
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
