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

    // Ready callback
    onReady: () => {
        console.log('%c✦ Default theme loaded', 'color: #0f766e;');
    }
};

// Reveal animations are handled centrally by ScrollEffects (IntersectionObserver
// fallback now that GSAP is removed) — no per-theme duplicate observer needed.

// ─── Konami Code Handler ───
function handleKonami() {
    console.log('%c You found the easter egg!', 'color: #0f766e; font-size: 16px;');

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
