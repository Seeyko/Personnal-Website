/**
 * Header Component
 * Reusable header with navigation, theme switcher, and language switcher
 * Works across all pages and themes
 */

const HeaderComponent = (() => {
    let isInitialized = false;
    let config = {
        brandLink: '/',
        navItems: [],
        activeNav: null,
        showBlog: false
    };

    // Default navigation items
    const DEFAULT_NAV_ITEMS = [
        { href: '/#now', section: '01', i18nKey: 'nav.now', text: 'Now' },
        { href: '/#work', section: '02', i18nKey: 'nav.work', text: 'Work' },
        { href: '/#writing', section: '03', i18nKey: 'nav.writing', text: 'Writing' },
        { href: '/#timeline', section: '04', i18nKey: 'nav.history', text: 'History' },
        { href: '/#about', section: '05', i18nKey: 'nav.about', text: 'About' },
        { href: '/#contact', section: '06', i18nKey: 'nav.contact', text: 'Contact' }
    ];

    // Navigation items for landing page (internal links)
    const LANDING_NAV_ITEMS = [
        { href: '#now', section: '01', i18nKey: 'nav.now', text: 'Now' },
        { href: '#work', section: '02', i18nKey: 'nav.work', text: 'Work' },
        { href: '#writing', section: '03', i18nKey: 'nav.writing', text: 'Writing' },
        { href: '#timeline', section: '04', i18nKey: 'nav.history', text: 'History' },
        { href: '#about', section: '05', i18nKey: 'nav.about', text: 'About' },
        { href: '#contact', section: '06', i18nKey: 'nav.contact', text: 'Contact' }
    ];

    /**
     * Generate header HTML
     */
    function generateHTML(options = {}) {
        const {
            isLandingPage = false,
            activeNav = null,
            includeBlogNav = false
        } = options;

        const navItems = isLandingPage ? LANDING_NAV_ITEMS : DEFAULT_NAV_ITEMS;

        // Build navigation links
        let navLinksHTML = navItems.map(item => `
            <a href="${item.href}" class="nav-link${activeNav === item.href ? ' active' : ''}" data-section="${item.section}">
                <span class="nav-prefix"></span>
                <span class="nav-text" data-i18n="${item.i18nKey}">${item.text}</span>
            </a>
        `).join('');

        // Add blog link if needed
        if (includeBlogNav) {
            navLinksHTML += `
            <a href="/blog/" class="nav-link${activeNav === '/blog/' ? ' active' : ''}" data-section="04">
                <span class="nav-prefix"></span>
                <span class="nav-text" data-i18n="nav.blog">Blog</span>
            </a>`;
        }

        return `
        <header class="header" role="banner">
            <div class="header-brand">
                <a href="/" class="brand-link" aria-label="Go to homepage">
                    <span class="brand-prefix"></span>
                    <span class="brand-name" data-content="meta.name">TOM ANDRIEU</span>
                    <span class="brand-suffix"></span>
                </a>
            </div>
            <div class="header-right">
                <nav class="nav" id="main-nav" role="navigation" aria-label="Main navigation">
                    ${navLinksHTML}
                </nav>
                <!-- Theme and language switchers will be inserted here by JS -->
                <div class="header-controls" id="header-controls">
                    <!-- Theme switcher and language switcher moved here on mobile -->
                </div>
                <!-- Mobile hamburger menu button -->
                <button class="hamburger-menu" id="hamburger-menu" aria-label="Toggle navigation menu" aria-expanded="false">
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </button>
            </div>
        </header>
        `;
    }

    /**
     * Insert header into the page
     */
    function render(targetSelector = '#main-content', options = {}) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.warn('[HeaderComponent] Target element not found:', targetSelector);
            return null;
        }

        // Check if header already exists
        let existingHeader = target.querySelector('header.header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Generate and insert header HTML
        const headerHTML = generateHTML(options);
        target.insertAdjacentHTML('afterbegin', headerHTML);

        // Return the inserted header element
        return target.querySelector('header.header');
    }

    /**
     * Initialize header functionality
     * Call this after the header is in the DOM
     */
    function init(options = {}) {
        if (isInitialized) return;

        const header = document.querySelector('header.header');
        if (!header) {
            console.warn('[HeaderComponent] Header element not found');
            return;
        }

        // Initialize mobile menu if available
        if (window.MobileMenu && !window.MobileMenu.isInitialized) {
            window.MobileMenu.init();
        }

        // Mark active nav link based on current URL
        markActiveNavLink(options.activeNav);

        isInitialized = true;
    }

    /**
     * Mark the active navigation link
     */
    function markActiveNavLink(activeNav = null) {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.classList.remove('active');

            const href = link.getAttribute('href');

            // Check if explicitly set as active
            if (activeNav && href === activeNav) {
                link.classList.add('active');
                return;
            }

            // Auto-detect based on current path
            if (href === '/blog/' && currentPath.startsWith('/blog')) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Update brand name (e.g., after content loads)
     */
    function updateBrandName(name) {
        const brandName = document.querySelector('.brand-name');
        if (brandName) {
            brandName.textContent = name;
        }
    }

    /**
     * Add scroll effect to header
     */
    function enableScrollEffect(options = {}) {
        const header = document.querySelector('header.header');
        if (!header) return;

        const {
            scrollThreshold = 50,
            scrolledClass = 'header-scrolled'
        } = options;

        function handleScroll() {
            if (window.scrollY > scrollThreshold) {
                header.classList.add(scrolledClass);
            } else {
                header.classList.remove(scrolledClass);
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Check initial state
    }

    /**
     * Destroy and clean up
     */
    function destroy() {
        const header = document.querySelector('header.header');
        if (header) {
            header.remove();
        }

        if (window.MobileMenu) {
            window.MobileMenu.destroy();
        }

        isInitialized = false;
    }

    // Public API
    return {
        generateHTML,
        render,
        init,
        destroy,
        updateBrandName,
        enableScrollEffect,
        markActiveNavLink,
        get isInitialized() { return isInitialized; },
        DEFAULT_NAV_ITEMS,
        LANDING_NAV_ITEMS
    };
})();

// Export for use in other modules
window.HeaderComponent = HeaderComponent;
