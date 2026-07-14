/**
 * ═══════════════════════════════════════════════════════════════
 * DEFAULT THEME - Clean & Minimal
 * Uses new modular architecture with ThemeInit
 * ═══════════════════════════════════════════════════════════════
 */

// Theme configuration
const defaultThemeConfig = {
    name: 'Default',

    // Card rendering configuration
    cards: {
        wrapperClass: 'project-card fade-in-up',
        showIndex: false,
        showType: false,
        tagWrapper: '{tag}',
        showUrl: false
    },

    // Blog card configuration (inherits from cards)
    blogCards: {
        wrapperClass: 'blog-card fade-in-up',
        showIndex: false
    },

    // Header scroll effect
    headerScroll: 'default',

    // Konami code easter egg
    konami: handleKonami,

    // Theme-specific effects
    initEffects: initDefaultEffects,

    // Ready callback
    onReady: () => {
        console.log('%c✦ Default theme loaded', 'color: #0f766e;');
    }
};

// ─── Theme-Specific Effects ───
function initDefaultEffects() {
    initRevealAnimation();
    initDefaultSfx();
}

// ─── Smooth Reveal Animation ───
function initRevealAnimation() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe cards and sections after a short delay to allow rendering
    setTimeout(() => {
        document.querySelectorAll('.project-card, .about-card, .contact-card').forEach((el) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    }, 100);
}

// ─── Default Sound Design (synthesized with Web Audio, no assets) ───
// The shared SFX bus (js/core/effects/sfx.js) owns the AudioContext, the
// mute toggle (window.sound) and the global interaction wiring; this theme
// just registers its pack. Palette: calm modern-UI — soft glass/marimba
// plinks, gentle sine taps, muted woody ticks. Nothing harsh, nothing loud.

// Soft glass/marimba plink: pure sine with a hair of downward settle plus
// a faint second partial for that "tapped glass" shimmer.
function sfxGlass(a, at, f, vol, dur) {
    dur = dur || 0.16;
    a.tone(at, dur, vol, 'sine', f, f * 0.985);
    a.tone(at, dur * 0.55, vol * 0.22, 'sine', f * 2.01, f * 2.01);
}

// Muted woody tick: a whisper of filtered noise, barely there.
function sfxTick(a, at, vol, f) {
    a.noise(at, 0.02, vol, f || 2400, f || 2400, 3);
}

function initDefaultSfx() {
    if (!window.SFX) return;
    SFX.register('default', {
        // ── Site-wide interactions: soft felt taps ──
        // key:down / key:up stay silent on purpose — minimal ≠ typewriter.
        'ui:down': (a) => a.tone(a.t, 0.05, 0.05, 'sine', 600, 500),
        'ui:up': (a) => a.tone(a.t, 0.04, 0.03, 'sine', 500, 440),
        'ui:hover': (a) => sfxTick(a, a.t, 0.025, 2800),

        // Glass plink climbing a major scale as reveals cascade
        'card:reveal': (a) => {
            const ratios = [1, 1.125, 1.25, 1.5, 1.6667, 2];
            sfxGlass(a, a.t, 523.25 * ratios[(a.opts.step || 0) % ratios.length], 0.05);
        },

        // Konami easter egg: a small, satisfied ascending chime
        'konami': (a) => {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => sfxGlass(a, a.t + i * 0.09, f, 0.05));
        },

        // ── Blip (the cursor mascot): tiny warm plinks ──
        // blip:click / blip:blink deliberately silent — he blinks a lot.
        'blip:joy': (a) => {
            sfxGlass(a, a.t, 659.25, 0.05, 0.1);
            sfxGlass(a, a.t + 0.08, 880, 0.05, 0.12);
        },
        'blip:listen': (a) => a.tone(a.t, 0.18, 0.04, 'sine', 440, 550),
        'blip:wave': (a) => {
            sfxGlass(a, a.t, 587.33, 0.04, 0.1);
            sfxGlass(a, a.t + 0.11, 493.88, 0.04, 0.12);
        },
        'blip:wake': (a) => a.tone(a.t, 0.14, 0.05, 'sine', 330, 660),
        'blip:snooze': (a) => a.tone(a.t, 0.35, 0.03, 'sine', 440, 220),
        'blip:twirl': (a) => {
            [523.25, 587.33, 659.25, 783.99].forEach((f, i) => sfxGlass(a, a.t + i * 0.06, f, 0.04, 0.08));
        },

        // ── Cathode (the guide mascot): warm chimes, felt thumps ──
        'cathode:boot': (a) => {
            a.tone(a.t, 0.4, 0.05, 'sine', 220, 440);             // warm rise
            sfxGlass(a, a.t + 0.32, 880, 0.05);                   // arrival sparkle
        },
        'cathode:enter': (a) => a.tone(a.t, 0.1, 0.05, 'sine', 300, 600),
        'cathode:speak': (a) => {
            // Soft page-flip ticks, one per few characters typed.
            const ticks = Math.min(7, Math.max(2, Math.round((a.opts.chars || 24) / 10)));
            for (let i = 0; i < ticks; i++) {
                sfxTick(a, a.t + i * 0.08, 0.02, 2000 * (0.92 + Math.random() * 0.16));
            }
        },
        'cathode:jump': (a) => a.tone(a.t, a.opts.stone ? 0.08 : 0.13, 0.05, 'sine', 330, a.opts.stone ? 660 : 550),
        'cathode:land': (a) => {
            a.tone(a.t, 0.08, 0.06, 'sine', 180, 80);             // felt thump
            if (a.opts.perch) sfxTick(a, a.t + 0.03, 0.03, 1600); // settled tick
        },
        'cathode:spin': (a) => {
            [523.25, 659.25, 783.99].forEach((f, i) => sfxGlass(a, a.t + i * 0.08, f, 0.04, 0.09));
        },
        'cathode:squish': (a) => a.tone(a.t, 0.14, 0.05, 'sine', 300, 140),
        'cathode:bump': (a) => {
            a.tone(a.t, 0.07, 0.1, 'sine', 140, 60);              // muted wall thud
            a.noise(a.t, 0.04, 0.04, 350, 200, 1);
        },
        'cathode:dizzy': (a) => {
            a.tone(a.t, 0.45, 0.03, 'sine', 480, 340);
            a.tone(a.t + 0.04, 0.45, 0.03, 'sine', 495, 330);     // detuned wobble
        },
        'cathode:crack': (a) => {
            a.noise(a.t, 0.15, 0.12, 1800, 500, 1);               // muffled crunch
            a.tone(a.t + 0.04, 0.3, 0.06, 'sine', 160, 55);       // low sag
        },
        'cathode:repair': (a) => {
            for (let i = 0; i < 4; i++) sfxTick(a, a.t + i * 0.14, 0.035, 1400); // soft ratchet
        },
        'cathode:fixed': (a) => {
            [523.25, 659.25, 783.99].forEach((f, i) => sfxGlass(a, a.t + i * 0.1, f, 0.05));
        },
        'cathode:meet': (a) => {
            // A friendly two-note hello; the hug variant is warmer/lower.
            const base = a.opts.scene === 'hug' ? 330 : 440;
            sfxGlass(a, a.t, base, 0.04, 0.12);
            sfxGlass(a, a.t + 0.13, base * 1.5, 0.04, 0.14);
        },
        'cathode:off': (a) => a.tone(a.t, 0.2, 0.06, 'sine', 660, 180),
        'cathode:on': (a) => {
            a.tone(a.t, 0.18, 0.05, 'sine', 220, 660);
            sfxGlass(a, a.t + 0.16, 990, 0.04, 0.1);
        }
    });
}

// ─── Konami Code Handler ───
function handleKonami() {
    console.log('%c You found the easter egg!', 'color: #0f766e; font-size: 16px;');
    if (window.SFX) SFX.play('konami');

    // Subtle color shift
    document.documentElement.style.setProperty('--accent', '#6366f1');
    document.documentElement.style.setProperty('--accent-hover', '#818cf8');

    setTimeout(() => {
        document.documentElement.style.setProperty('--accent', '#0f766e');
        document.documentElement.style.setProperty('--accent-hover', '#0d9488');
    }, 5000);
}

// ─── Export Blog Card Renderer ───
// Create a renderer for blog.js to use
ThemeInit.exportBlogRenderer((article, index) => {
    return CardRenderer.renderBlogCard(article, index, defaultThemeConfig.blogCards);
});

// ─── Initialize Theme ───
ThemeInit.whenReady(() => {
    ThemeInit.init(defaultThemeConfig);
});
