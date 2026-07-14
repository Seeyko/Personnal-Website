/**
 * ═══════════════════════════════════════════════════════════════
 * BLUEPRINT PORTFOLIO - Theme JavaScript
 * "The Master Plan" Aesthetic
 * Uses new modular architecture with ThemeInit
 * ═══════════════════════════════════════════════════════════════
 */

console.log('%c[BLUEPRINT] Portfolio Initialized', 'color: #00FFFF; font-family: monospace;');

// Theme configuration
const blueprintThemeConfig = {
    name: 'Blueprint',

    // Card rendering configuration
    cards: {
        wrapperClass: 'project-card fade-in-up',
        showIndex: true,
        indexPrefix: 'PRJ-',
        indexPadding: 2,
        indexInMedia: true,  // Show index inside media container
        showType: true,
        typeInInfo: true,    // Show type in info section
        tagWrapper: '{tag}',
        showUrl: true,
        urlIcon: '&#8599;',  // ↗
        cornerDecorations: true,
        animationDelay: true
    },

    // Blog card configuration
    blogCards: {
        wrapperClass: 'blog-card fade-in-up',
        showIndex: true,
        indexPrefix: 'BLOG-',
        indexPadding: 2,
        cornerDecorations: true,
        animationDelay: true
    },

    // Cursor tracker configuration
    cursor: {
        mode: 'page',
        cursorSelector: '#custom-cursor',
        coordXSelector: '#coord-x',
        coordYSelector: '#coord-y',
        smoothing: 0.15
    },

    // Header scroll effect
    headerScroll: 'blueprint',

    // Konami code easter egg
    konami: handleKonami,

    // Theme-specific effects
    initEffects: initBlueprintEffects,

    // Ready callback
    onReady: () => {
        console.log('%c[BLUEPRINT] All systems operational', 'color: #00FF00;');
    }
};

// ─── Theme-Specific Effects ───
function initBlueprintEffects() {
    initSVGAnimations();
    initParallax();
    initCardEffects();
    initBlueprintSfx();
}

// ─── SVG Line Drawing Animation ───
function initSVGAnimations() {
    const svgPaths = document.querySelectorAll('.frame-line, .dim-line');

    svgPaths.forEach(path => {
        if (path.getTotalLength) {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
        }
    });
}

// ─── Blueprint Grid Parallax ───
function initParallax() {
    const overlay = document.getElementById('theme-overlay');
    if (!overlay) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                overlay.style.transform = `translateY(${scrollY * 0.1}px)`;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ─── Project Card Hover Effects (3D Tilt) ───
function initCardEffects() {
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.project-card').forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if mouse is near the card
            const isNear = x >= -50 && x <= rect.width + 50 &&
                          y >= -50 && y <= rect.height + 50;

            if (isNear) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 30;
                const rotateY = (centerX - x) / 30;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
            } else {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            }
        });
    });
}

// ─── Konami Code Handler ───
function handleKonami() {
    document.body.style.setProperty('--accent-cyan', '#FFD700');
    document.body.style.setProperty('--accent-redline', '#00FF00');
    console.log('%c KONAMI CODE ACTIVATED!', 'color: #FFD700; font-size: 20px;');
    if (window.SFX) SFX.play('konami');

    setTimeout(() => {
        document.body.style.setProperty('--accent-cyan', '#00FFFF');
        document.body.style.setProperty('--accent-redline', '#FF3333');
    }, 5000);
}

// ─── Blueprint Sound Design (synthesized with Web Audio, no assets) ───
// The shared SFX bus (js/core/effects/sfx.js) owns the AudioContext, the
// mute toggle (window.sound) and the global interaction wiring; this theme
// just registers its pack. The palette is a drafting studio: graphite
// scratches, paper slides, compass ticks and the clunk of a drafting-machine
// arm — more texture (noise) than melody, drawing-office quiet.

// Pencil dot on paper: a short graphite scratch + a faint woody tick,
// slightly jittered per press so repeated taps feel hand-drawn.
function sfxPencilTap(a, up) {
    const jitter = 0.9 + Math.random() * 0.2;
    if (up) {
        a.noise(a.t, 0.02, 0.035, 2600 * jitter, 2600 * jitter, 2.5);
    } else {
        a.noise(a.t, 0.03, 0.06, 2000 * jitter, 1700 * jitter, 2);
        a.tone(a.t, 0.045, 0.035, 'triangle', 190 * jitter, 95 * jitter);
    }
}

// Tight woody click: ruler set down, compass pivot, T-square snap.
function sfxDraftClick(a, at, vol, f) {
    a.noise(at, 0.025, vol, f, f, 4);
    a.tone(at, 0.04, vol * 0.6, 'triangle', 260, 130);
}

// Paper sliding across the drafting table: a broad airy noise sweep.
function sfxPaperSlide(a, at, dur, vol, f0, f1) {
    a.noise(at, dur, vol, f0, f1, 0.9);
}

function initBlueprintSfx() {
    if (!window.SFX) return;
    SFX.register('blueprint', {
        // ── Site-wide interactions: pencil on paper ──
        'ui:down': (a) => sfxPencilTap(a, false),
        'ui:up': (a) => sfxPencilTap(a, true),
        // key:down / key:up deliberately silent — typing shouldn't scratch.

        // Whisper of a pencil gliding as the nib finds a link.
        'ui:hover': (a) => a.noise(a.t, 0.06, 0.026, 1600, 2500, 1.2),

        // Ruler snap + rising pencil stroke; consecutive reveals draw higher.
        'card:reveal': (a) => {
            const ratios = [1, 1.12, 1.26, 1.41, 1.59];
            const r = ratios[(a.opts.step || 0) % ratios.length];
            sfxDraftClick(a, a.t, 0.05, 2400 * r);
            a.noise(a.t + 0.03, 0.11, 0.045, 1500 * r, 3200 * r, 1.5);
        },

        // ── Blip (the cursor mascot): quick graphite gestures ──
        // blip:blink deliberately silent — it fires far too often to scratch.
        'blip:click': (a) => sfxDraftClick(a, a.t, 0.04, 3200),
        'blip:joy': (a) => {
            // Three upward pencil flicks, each starting a step higher.
            [1800, 2300, 2900].forEach((f, i) =>
                a.noise(a.t + i * 0.07, 0.05, 0.05, f, f * 1.6, 2));
        },
        'blip:listen': (a) => a.noise(a.t, 0.24, 0.03, 1400, 2000, 1.3), // slow pencil circle
        'blip:wave': (a) => {
            a.noise(a.t, 0.05, 0.05, 1900, 3000, 2);
            a.noise(a.t + 0.11, 0.05, 0.05, 3000, 1900, 2);
        },
        'blip:wake': (a) => {
            sfxPaperSlide(a, a.t, 0.11, 0.045, 700, 2400);
            a.tone(a.t + 0.04, 0.08, 0.03, 'sine', 320, 640);
        },
        'blip:snooze': (a) => {
            sfxPaperSlide(a, a.t, 0.3, 0.03, 1300, 400);   // sheet settling flat
            a.tone(a.t, 0.32, 0.022, 'sine', 340, 160);
        },
        'blip:twirl': (a) => {
            // Compass spun on its needle: four ticks walking up the paper.
            [2000, 2400, 2900, 3500].forEach((f, i) =>
                sfxDraftClick(a, a.t + i * 0.06, 0.04, f));
        },

        // ── Cathode (the guide mascot): the drafting machine itself ──
        'cathode:boot': (a) => {
            a.tone(a.t, 0.6, 0.05, 'sawtooth', 42, 68);           // blueprint machine hum
            sfxPaperSlide(a, a.t + 0.1, 0.35, 0.045, 350, 1800);  // sheet feeding through
            a.tone(a.t + 0.5, 0.12, 0.05, 'sine', 1100, 1650);    // diazo lamp ping
        },
        'cathode:enter': (a) => {
            sfxPaperSlide(a, a.t, 0.12, 0.05, 600, 2100);
            sfxDraftClick(a, a.t + 0.1, 0.045, 2600);
        },
        'cathode:speak': (a) => {
            // Rapid hatching strokes, one per few characters in the bubble.
            const ticks = Math.min(9, Math.max(3, Math.round((a.opts.chars || 24) / 8)));
            for (let i = 0; i < ticks; i++) {
                const jit = 0.85 + Math.random() * 0.3;
                a.noise(a.t + i * 0.07, 0.03, 0.028, 2500 * jit, 1900 * jit, 2.5);
            }
        },
        'cathode:jump': (a) => {
            // Compass pivot + a short arc drawn upward; stones hop quicker.
            sfxDraftClick(a, a.t, 0.045, 2800);
            a.tone(a.t + 0.02, a.opts.stone ? 0.08 : 0.13, 0.035, 'sine', 260, a.opts.stone ? 640 : 520);
        },
        'cathode:land': (a) => {
            a.tone(a.t, 0.08, 0.065, 'sine', 140, 55);            // soft paper thump
            a.noise(a.t, 0.05, 0.04, 800, 400, 1);
            if (a.opts.perch) a.noise(a.t + 0.05, 0.02, 0.03, 2600, 2600, 3); // graphite tick
        },
        'cathode:spin': (a) => {
            // Joy spin: compass ticks circling up, then back down.
            [2100, 2700, 3300, 2700].forEach((f, i) =>
                sfxDraftClick(a, a.t + i * 0.08, 0.035, f));
        },
        'cathode:squish': (a) => {
            a.tone(a.t, 0.14, 0.05, 'sine', 250, 95);             // eraser pressed flat
            a.noise(a.t, 0.1, 0.035, 700, 350, 1);
        },
        'cathode:bump': (a) => {
            a.tone(a.t, 0.08, 0.1, 'sine', 115, 45);              // drafting-arm clunk
            a.noise(a.t, 0.05, 0.055, 450, 220, 1);
        },
        'cathode:dizzy': (a) => {
            a.tone(a.t, 0.45, 0.03, 'triangle', 330, 240);        // ruler twang wobble
            a.tone(a.t + 0.04, 0.45, 0.03, 'triangle', 345, 228);
        },
        'cathode:crack': (a) => {
            a.noise(a.t, 0.04, 0.12, 3600, 3600, 0.7);            // pencil-lead SNAP
            a.noise(a.t + 0.05, 0.24, 0.09, 2300, 500, 0.8);      // paper tearing
            a.tone(a.t + 0.05, 0.3, 0.045, 'triangle', 180, 60);
        },
        'cathode:repair': (a) => {
            // Eraser rubbing back and forth, alternating stroke direction.
            for (let i = 0; i < 6; i++) {
                const back = i % 2 === 1;
                a.noise(a.t + i * 0.11, 0.07, 0.045, back ? 1300 : 900, back ? 900 : 1300, 1.2);
            }
        },
        'cathode:fixed': (a) => {
            sfxDraftClick(a, a.t, 0.05, 2600);                    // clean T-square
            sfxDraftClick(a, a.t + 0.09, 0.05, 3100);             // double-click
            a.tone(a.t + 0.2, 0.16, 0.045, 'sine', 1319, 1319);   // bright approval ping
        },
        'cathode:meet': (a) => {
            // Two draftsmen compare notes: paired pencil flicks + a soft hum.
            const base = a.opts.scene === 'hug' ? 300 : 400;
            a.noise(a.t, 0.05, 0.04, 1900, 2800, 2);
            a.noise(a.t + 0.1, 0.05, 0.04, 2400, 1700, 2);
            a.tone(a.t + 0.18, 0.12, 0.035, 'sine', base, base * 1.25);
            if (a.opts.scene === 'dance') sfxDraftClick(a, a.t + 0.32, 0.035, 2900);
        },
        'cathode:off': (a) => {
            sfxPaperSlide(a, a.t, 0.16, 0.055, 2000, 350);        // sheet folded away
            a.tone(a.t + 0.08, 0.12, 0.04, 'sine', 290, 70);
        },
        'cathode:on': (a) => {
            sfxPaperSlide(a, a.t, 0.14, 0.05, 400, 2300);         // sheet unrolled
            a.tone(a.t + 0.12, 0.1, 0.04, 'sine', 900, 1400);
        },

        // ── Konami: the gold-leaf revision stamp ──
        'konami': (a) => {
            sfxPaperSlide(a, a.t, 0.15, 0.05, 500, 2600);         // sheet whipped out
            a.tone(a.t + 0.16, 0.07, 0.08, 'sine', 170, 60);      // stamp thump
            [1046.5, 1318.5, 1568].forEach((f, i) =>             // gilded flourish
                a.tone(a.t + 0.26 + i * 0.09, 0.11, 0.04, 'sine', f, f));
        }
    });
}

// ─── Export Blog Card Renderer ───
ThemeInit.exportBlogRenderer((article, index) => {
    return CardRenderer.renderBlogCard(article, index, blueprintThemeConfig.blogCards);
});

// ─── Initialize Theme ───
ThemeInit.whenReady(() => {
    ThemeInit.init(blueprintThemeConfig);
});
