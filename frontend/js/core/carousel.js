/**
 * Carousel - Image carousel with autoplay
 */

const Carousel = (() => {
    const AUTOPLAY_INTERVAL = 4000;

    // Slides past the first ship with data-src/data-srcset (no fetch) so an
    // off-screen carousel costs zero bytes on load. Swap them in on first show.
    function hydrateSlide(slide) {
        if (!slide) return;
        const source = slide.querySelector('source[data-srcset]');
        if (source) { source.srcset = source.dataset.srcset; source.removeAttribute('data-srcset'); }
        const img = slide.querySelector('img[data-src]');
        if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
    }

    function initCarousel(carousel, opts = {}) {
        const slides = carousel.querySelectorAll('.carousel-slide');
        const dots = carousel.querySelectorAll('.carousel-dot');
        const prevBtn = carousel.querySelector('.carousel-btn.prev');
        const nextBtn = carousel.querySelector('.carousel-btn.next');

        if (slides.length <= 1) return null;

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let current = 0;
        let interval = null;
        let visible = false;
        const delay = opts.autoPlayDelay || AUTOPLAY_INTERVAL;

        const show = idx => {
            current = idx >= slides.length ? 0 : idx < 0 ? slides.length - 1 : idx;
            hydrateSlide(slides[current]);
            slides.forEach((s, i) => s.classList.toggle('active', i === current));
            dots.forEach((d, i) => d.classList.toggle('active', i === current));
        };

        const next = () => show(current + 1);
        const prev = () => show(current - 1);
        // Autoplay only while on-screen and not reduced-motion. Gating on
        // visibility also keeps deferred slides from loading off-screen (e.g.
        // during a Lighthouse run that never scrolls).
        const start = () => { if (opts.autoPlay !== false && !reduceMotion && visible && !interval) interval = setInterval(next, delay); };
        const stop = () => { clearInterval(interval); interval = null; };
        const reset = () => { stop(); start(); };

        prevBtn?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); prev(); reset(); });
        nextBtn?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); next(); reset(); });
        dots.forEach((d, i) => d.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(i); reset(); }));

        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('mouseleave', start);
        carousel.setAttribute('tabindex', '0');
        carousel.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') { prev(); reset(); }
            else if (e.key === 'ArrowRight') { next(); reset(); }
        });

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                visible ? start() : stop();
            }, { threshold: 0.25 });
            io.observe(carousel);
        } else {
            visible = true;
            start();
        }

        return { next, prev, goTo: show, stop, start, get currentIndex() { return current; } };
    }

    function initAll(opts = {}) {
        return [...document.querySelectorAll('.project-carousel')]
            .map(c => initCarousel(c, opts))
            .filter(Boolean);
    }

    return { init: initCarousel, initAll };
})();

window.Carousel = Carousel;
