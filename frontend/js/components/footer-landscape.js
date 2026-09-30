/* Subtle scroll depth: the distant landscape moves up to 10px while the
   foreground stays flush to the page edge. No animation loop while idle. */
(() => {
    const footer = document.getElementById('site-footer');
    const scenery = footer?.querySelector('.footer-scenery');
    if (!scenery || !('IntersectionObserver' in window)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let frame = null;

    function update() {
        frame = null;
        if (!visible || reducedMotion.matches) return;
        const rect = scenery.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
        footer.style.setProperty('--footer-shift', `${(1 - progress) * 10}px`);
    }

    function schedule() {
        if (visible && !reducedMotion.matches && frame === null) frame = requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        document.body.classList.toggle('footer-scenery-visible', visible);
        schedule();
    });
    observer.observe(scenery);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) footer.style.removeProperty('--footer-shift');
        else schedule();
    });

    // The shared smooth-scroll helper handles all anchors. Override only these
    // top links so they return to the actual page start and respect reduced
    // motion; the contact link keeps the site's standard section behavior.
    footer.querySelectorAll('a[href="#home"]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        });
    });
})();
