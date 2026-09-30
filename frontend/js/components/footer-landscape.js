/* Subtle scroll depth: the distant landscape moves up to 10px while the
   foreground stays flush to the page edge. No animation loop while idle. */
function initFooterLandscape() {
    const footer = document.getElementById('site-footer');
    const scenery = footer?.querySelector('.footer-scenery');
    if (!scenery) return;

    const artworks = new Map([
        ['default', 'mediterranean-garden.webp'],
        ['terminal', 'mediterranean-garden-terminal.webp'],
        ['blueprint', 'mediterranean-garden-blueprint.webp'],
        ['retro90s', 'mediterranean-garden-retro90s.webp'],
        ['fps', 'mediterranean-garden-fps.webp']
    ]);
    const images = scenery.querySelectorAll('[data-footer-artwork]');
    function selectArtwork() {
        const filename = artworks.get(document.body.dataset.theme) || artworks.get('default');
        const source = `/assets/footer/${filename}`;
        images.forEach(image => {
            if (image.getAttribute('src') !== source) image.src = source;
        });
    }
    // ThemeManager initializes first at DOMContentLoaded. Defer assigning src
    // until then so a restored footer position never downloads the wrong theme.
    selectArtwork();
    new MutationObserver(selectArtwork).observe(document.body, {
        attributes: true, attributeFilter: ['data-theme']
    });

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

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            document.body.classList.toggle('footer-scenery-visible', visible);
            schedule();
        });
        observer.observe(scenery);
    }
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
}

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initFooterLandscape)
    : initFooterLandscape();
