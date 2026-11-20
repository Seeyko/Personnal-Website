/**
 * Browser entry for react-xeet (https://react-xeet.vercel.app), the static
 * tweet renderer from vercel-labs: no iframe, no X widgets.js, no tracking.
 *
 * The site has no build step, so this is bundled once (build.mjs) into
 * frontend/assets/vendor/xeet/xeet.{js,css} and exposes:
 *
 *   XeetEmbed.mountPost(el, ids, { apiUrls, onLoad, onError }) -> unmount()
 *
 * ids: one tweet, or every tweet of a thread in order (rendered as one card,
 * like a thread on X). Each id is fetched from the first of apiUrls that
 * answers (`${apiUrl}/${id}` -> { data: <syndication tweet> }).
 * The card also shows the tweet a reply answers (parent) and the quoted tweet,
 * both compact, like X does.
 * onError fires when the first tweet can't be loaded, so the page keeps its
 * own card instead.
 */
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import {
    enrichXeet,
    XeetContainer,
    XeetHeader,
    XeetInReplyTo,
    XeetBody,
    XeetMedia,
    XeetInfo,
    XeetActions,
    XeetReplies,
} from 'react-xeet';
import './post.css';

const cache = new Map();

// Tries every endpoint until one has the tweet. `null` only when they all
// say it is gone; otherwise the error lists what each endpoint answered.
async function fetchXeet(id, apiUrls) {
    if (cache.has(id)) return cache.get(id);
    const job = (async () => {
        const attempts = [];
        let gone = 0;
        for (const base of apiUrls) {
            try {
                const res = await fetch(`${base}/${id}`);
                const json = await res.json().catch(() => null);
                if (json && json.data && json.data.id_str) return json.data;
                if (json && 'data' in json && (res.ok || res.status === 404)) gone++;
                attempts.push({ api: base, status: res.status });
            } catch (err) {
                attempts.push({ api: base, error: String(err && err.message || err) });
            }
        }
        if (gone === apiUrls.length) return null;
        const err = new Error('xeet unavailable');
        err.attempts = attempts;
        throw err;
    })();
    cache.set(id, job);
    job.catch(() => cache.delete(id));
    return job;
}

const safeEnrich = t => {
    try {
        return enrichXeet({ ...t, display_text_range: [...(t.display_text_range || [0, Array.from(t.text || '').length])], entities: t.entities || {} });
    } catch {
        return null;
    }
};

const fmtDate = iso => {
    try {
        return new Date(iso).toLocaleDateString(document.documentElement.lang || undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
};

// A tweet shown small inside another one: the quoted tweet, or the tweet a reply answers.
function Compact({ xeet: raw, kind }) {
    const t = safeEnrich(raw);
    if (!t) return null;
    const media = (t.mediaDetails || []).filter(m => m.type === 'photo' || m.media_url_https).slice(0, 4);
    return (
        <a className={`mcx-compact mcx-${kind}`} href={t.url} target="_blank" rel="noopener noreferrer">
            <span className="mcx-compact-head">
                <img className="mcx-compact-avatar" src={t.user.profile_image_url_https} alt="" loading="lazy" />
                <b className="mcx-compact-name">{t.user.name}</b>
                <span className="mcx-compact-meta">@{t.user.screen_name} · {fmtDate(t.created_at)}</span>
            </span>
            <span className="mcx-compact-body">
                <XeetBody xeet={t} />
            </span>
            {media.length > 0 && (
                <span className={`mcx-compact-media n${media.length}`}>
                    {media.map(m => <img key={m.media_url_https} src={`${m.media_url_https}?name=small`} alt={m.ext_alt_text || ''} loading="lazy" />)}
                </span>
            )}
        </a>
    );
}

// One tweet of the card. In a thread, every tweet but the last keeps the line
// that links the avatars, and only the last one gets the actions.
function Item({ xeet: raw, index, total }) {
    const t = safeEnrich(raw);
    if (!t) return null;
    const last = index === total - 1;
    const showParent = index === 0 && raw.parent && raw.parent.id_str && raw.parent.user;
    return (
        <div className={`mcx-item${total > 1 ? ' mcx-in-thread' : ''}${last ? ' mcx-last' : ''}`}>
            {showParent && <Compact xeet={raw.parent} kind="parent" />}
            <XeetHeader xeet={t} />
            <div className="mcx-content">
                {t.in_reply_to_status_id_str && index === 0 && !showParent && <XeetInReplyTo xeet={t} />}
                <XeetBody xeet={t} />
                {t.mediaDetails?.length ? <XeetMedia xeet={t} /> : null}
                {raw.quoted_tweet && raw.quoted_tweet.user && <Compact xeet={raw.quoted_tweet} kind="quoted" />}
                <XeetInfo xeet={t} />
                {last && <XeetActions xeet={t} />}
                {last && total === 1 && <XeetReplies xeet={t} />}
            </div>
        </div>
    );
}

function Post({ ids, apiUrls, onLoad, onError }) {
    const [xeets, setXeets] = useState(null);
    useEffect(() => {
        let alive = true;
        let firstErr = null;
        Promise.all(ids.map((id, i) => fetchXeet(id, apiUrls).catch(err => { if (i === 0) firstErr = err; return null; }))).then(list => {
            if (!alive) return;
            if (!list[0]) {
                onError?.(firstErr || new Error('not found'));
                return;
            }
            setXeets(list.filter(Boolean));
        });
        return () => { alive = false; };
    }, [ids.join(',')]);
    useEffect(() => { if (xeets) onLoad?.(); }, [xeets]);
    if (!xeets) return null;
    return (
        <XeetContainer className={xeets.length > 1 ? 'mcx-thread' : undefined}>
            {xeets.map((x, i) => <Item key={x.id_str} xeet={x} index={i} total={xeets.length} />)}
        </XeetContainer>
    );
}

function mountPost(el, ids, { apiUrls = [], onLoad, onError } = {}) {
    const root = createRoot(el);
    root.render(<Post ids={[].concat(ids)} apiUrls={apiUrls} onLoad={onLoad} onError={onError} />);
    return () => root.unmount();
}

window.XeetEmbed = { mountPost };
