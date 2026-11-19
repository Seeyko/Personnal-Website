/**
 * Browser entry for react-xeet (https://react-xeet.vercel.app), the static
 * tweet renderer from vercel-labs: no iframe, no X widgets.js, no tracking.
 *
 * The site has no build step, so this is bundled once (build.mjs) into
 * frontend/assets/vendor/xeet/xeet.{js,css} and exposes:
 *
 *   XeetEmbed.mount(el, id, { apiUrl, onError }) -> unmount()
 *
 * apiUrl answers { data: <syndication tweet> } (our Go backend: GET /api/xeet/{id}).
 * onError(err) fires when the tweet can't be loaded (deleted, network...), so the
 * page can keep its own fallback card instead of the "not found" box.
 */
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { Xeet } from 'react-xeet';

function mount(el, id, { apiUrl, onError, onLoad } = {}) {
    const NotFound = ({ error }) => {
        useEffect(() => { onError?.(error); }, [error]);
        return null;
    };
    const root = createRoot(el);
    root.render(
        <Xeet
            id={id}
            apiUrl={apiUrl}
            components={{ XeetNotFound: NotFound }}
            fallback={null}
            onError={err => err}
        />
    );
    // Tell the page once the xeet is in the DOM.
    const obs = new MutationObserver(() => {
        if (el.querySelector('.react-xeet-theme')) {
            obs.disconnect();
            onLoad?.();
        }
    });
    obs.observe(el, { childList: true, subtree: true });
    return () => { obs.disconnect(); root.unmount(); };
}

window.XeetEmbed = { mount };
