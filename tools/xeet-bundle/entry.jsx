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
import { Component, useEffect, useState } from 'react';
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

// X hides from the text the link that the card previews and the link to the
// quoted tweet when they end the tweet: do the same.
function trimTrailingLinks(t) {
    const range = [...(t.display_text_range || [0, Array.from(t.text || '').length])];
    const ent = t.entities || {};
    const urls = [...(ent.urls || [])].sort((a, b) => b.indices[0] - a.indices[0]);
    const cardUrl = t.card && t.card.url;
    const quoted = t.quoted_tweet && t.quoted_tweet.id_str;
    const hidden = new Set();
    const text = Array.from(t.text || '');
    const trim = () => { while (range[1] > range[0] && /\s/.test(text[range[1] - 1] || '')) range[1]--; };
    trim();
    for (const u of urls) {
        if (u.indices[1] < range[1]) break;
        const isCard = cardUrl && (u.url === cardUrl || u.expanded_url === cardUrl);
        const status = ((u.expanded_url || '').match(/\/status\/(\d+)/) || [])[1];
        const isQuote = quoted && status === quoted;
        if (!isCard && !isQuote) break;
        hidden.add(u);
        range[1] = u.indices[0];
        trim();
    }
    return {
        ...t,
        display_text_range: range,
        entities: {
            hashtags: ent.hashtags || [],
            user_mentions: ent.user_mentions || [],
            symbols: ent.symbols || [],
            ...(ent.media ? { media: ent.media } : {}),
            urls: (ent.urls || []).filter(u => !hidden.has(u)),
        },
    };
}

const safeEnrich = t => {
    try {
        return enrichXeet(trimTrailingLinks(t));
    } catch {
        return null;
    }
};

// Link preview, like X's cards: big image on top (summary_large_image) or a
// thumbnail beside the text (summary and the rest).
const bv = (card, key) => {
    const v = card.binding_values && card.binding_values[key];
    return v ? v.string_value || (v.image_value && v.image_value.url) || '' : '';
};
function LinkCard({ xeet, small }) {
    // Inside a compact tweet (already a link) the card can't be a link itself.
    const Tag = small ? 'span' : 'a';
    const card = xeet.card;
    if (!card || !card.binding_values) return null;
    const title = bv(card, 'title');
    if (!title) return null;
    const u = ((xeet.entities && xeet.entities.urls) || []).find(e => e.url === card.url);
    const href = (u && u.expanded_url) || bv(card, 'card_url') || card.url;
    let domain = bv(card, 'domain') || bv(card, 'vanity_url');
    if (!domain) { try { domain = new URL(href).hostname.replace(/^www\./, ''); } catch { domain = ''; } }
    const large = !small && /large_image/.test(card.name || '');
    const img = large
        ? bv(card, 'summary_photo_image_large') || bv(card, 'photo_image_full_size_large') || bv(card, 'thumbnail_image_large')
        : bv(card, 'thumbnail_image') || bv(card, 'thumbnail_image_small') || bv(card, 'summary_photo_image_small');
    const desc = bv(card, 'description');
    return (
        <Tag className={`mcx-card${large ? ' mcx-card-large' : ''}${small ? ' mcx-card-small' : ''}`} {...(small ? {} : { href, target: '_blank', rel: 'noopener noreferrer' })}>
            {img && <span className="mcx-card-img"><img src={img} alt="" loading="lazy" /></span>}
            <span className="mcx-card-text">
                {domain && <span className="mcx-card-domain">{domain}</span>}
                <span className="mcx-card-title">{title}</span>
                {desc && <span className="mcx-card-desc">{desc}</span>}
            </span>
        </Tag>
    );
}

// A render crash in one tweet must not take the whole card down.
class Guard extends Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(err) { this.props.onCrash && this.props.onCrash(err); }
    render() { return this.state.failed ? null : this.props.children; }
}

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
    const media = (t.mediaDetails || []).filter(m => m.media_url_https).slice(0, 4);
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
            {!media.length && <LinkCard xeet={raw} small />}
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
                {!t.mediaDetails?.length && <LinkCard xeet={raw} />}
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
            {xeets.map((x, i) => (
                <Guard key={x.id_str} onCrash={err => i === 0 && setTimeout(() => onError?.(Object.assign(new Error('render failed: ' + (err && err.message)), { attempts: [] })))}>
                    <Item xeet={x} index={i} total={xeets.length} />
                </Guard>
            ))}
        </XeetContainer>
    );
}

function mountPost(el, ids, { apiUrls = [], onLoad, onError } = {}) {
    const root = createRoot(el);
    root.render(<Post ids={[].concat(ids)} apiUrls={apiUrls} onLoad={onLoad} onError={onError} />);
    return () => root.unmount();
}

window.XeetEmbed = { mountPost };
