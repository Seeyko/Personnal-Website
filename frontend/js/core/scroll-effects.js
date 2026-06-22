/**
 * Scroll Effects - GSAP scroll-triggered animations with observer fallback
 */

const ScrollEffects = (() => {
    let initialized = false;

    const hasGSAP = () => typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

    function animateWithGSAP(selector, opts = {}) {
        const cfg = {
            from: { opacity: 0, y: 50, scale: 0.98 },
            to: { opacity: 1, y: 0, scale: 1 },
            duration: 0.6, ease: 'power3.out', stagger: 0.05,
            start: 'top bottom-=100', toggleActions: 'play none none none',
            ...opts
        };

        gsap.utils.toArray(selector).forEach((el, i) => {
            gsap.fromTo(el, cfg.from, {
                scrollTrigger: { trigger: el, start: cfg.start, toggleActions: cfg.toggleActions },
                ...cfg.to, duration: cfg.duration, ease: cfg.ease, delay: i * cfg.stagger
            });
        });
    }

    function animateWithObserver(selector, opts = {}) {
        const cfg = {
            threshold: 0.1, rootMargin: '0px 0px -50px 0px',
            initial: { opacity: '0', transform: 'translateY(30px)', transition: 'opacity 0.6s ease, transform 0.6s ease' },
            visible: { opacity: '1', transform: 'translateY(0)' },
            ...opts
        };

        // Reduced-motion: reveal everything immediately (no opacity:0 start, no
        // transition) so these elements can never get stuck hidden.
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            document.querySelectorAll(selector).forEach(el => {
                Object.assign(el.style, cfg.visible, { transition: 'none' });
                el.classList.add('visible');
            });
            return;
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    Object.assign(e.target.style, cfg.visible);
                    e.target.classList.add('visible');
                }
            });
        }, { threshold: cfg.threshold, rootMargin: cfg.rootMargin });

        document.querySelectorAll(selector).forEach(el => {
            Object.assign(el.style, cfg.initial);
            observer.observe(el);
        });
    }

    function animateProjectCards() {
        hasGSAP()
            ? animateWithGSAP('.project-card', { from: { opacity: 0, y: 50, scale: 0.98 }, duration: 0.6, stagger: 0.05 })
            : animateWithObserver('.project-card');
    }

    function animateBlogCards() {
        hasGSAP()
            ? animateWithGSAP('.blog-card', { from: { opacity: 0, y: 30, scale: 0.98 }, duration: 0.5, stagger: 0.1 })
            : animateWithObserver('.blog-card');
    }

    function animateSectionHeaders() {
        if (hasGSAP()) {
            gsap.utils.toArray('.section-header').forEach(h => {
                gsap.fromTo(h, { opacity: 0, x: -30 }, {
                    scrollTrigger: { trigger: h, start: 'top bottom-=50', toggleActions: 'play none none none' },
                    opacity: 1, x: 0, duration: 0.5, ease: 'power2.out'
                });
            });
        } else {
            animateWithObserver('.section-header', {
                initial: { opacity: '0', transform: 'translateX(-30px)', transition: 'opacity 0.5s ease, transform 0.5s ease' },
                visible: { opacity: '1', transform: 'translateX(0)' }
            });
        }
    }

    function animateInfoCards() {
        hasGSAP()
            ? animateWithGSAP('.about-card, .contact-card', { from: { opacity: 0, y: 30 }, duration: 0.7 })
            : animateWithObserver('.about-card, .contact-card');
    }

    function initAll() {
        if (initialized) return;
        if (hasGSAP()) gsap.registerPlugin(ScrollTrigger);
        animateProjectCards();
        animateSectionHeaders();
        animateInfoCards();
        initialized = true;
    }

    function initResizeHandler() {
        let timeout;
        window.addEventListener('resize', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => hasGSAP() && ScrollTrigger.refresh(), 250);
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    return { initAll, initResizeHandler, initSmoothScroll, animateBlogCards };
})();

window.ScrollEffects = ScrollEffects;
