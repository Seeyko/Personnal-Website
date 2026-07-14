/**
 * SFX Module — shared UI sound bus
 * One Web Audio pipeline for the whole site (no audio assets, everything is
 * synthesized). Core modules (blip-cursor, cathode-guide, this file's own
 * interaction wiring) emit SEMANTIC events through SFX.play('event'); the
 * active theme registers a "sound pack" mapping those events to actual
 * synthesized cues, so the same jump / click / reveal sounds different under
 * each theme. No pack (or a pack without that event) = silence.
 *
 * Contract for packs — theme JS calls:
 *
 *   SFX.register('mytheme', {
 *       'ui:down': (a) => a.tone(a.t, 0.05, 0.1, 'square', 800, 600),
 *       'cathode:jump': (a) => { ... },
 *       ...
 *   });
 *
 * Each handler receives a toolkit `a`:
 *   a.ctx   AudioContext (running, unlocked)
 *   a.t     ctx.currentTime (schedule relative to it)
 *   a.out   destination GainNode (master)
 *   a.tone(at, dur, vol, type, f0, f1[, dest])   oscillator blip/sweep
 *   a.noise(at, dur, vol, f0, f1, q[, dest])     bandpass-filtered noise
 *   a.opts  event payload (e.g. {step} on card:reveal, {scene} on cathode:meet)
 *
 * Events emitted by the bus itself (global interaction wiring):
 *   ui:down / ui:up      mouse press / release (also synthesized for touch taps)
 *   key:down / key:up    keyboard press / release
 *   ui:hover             pointer enters a link/button
 *   card:reveal          a project/blog card scrolls into view ({step}: 0,1,2…
 *                        climbs while reveals cascade — pitch ladders welcome)
 *
 * Events emitted by blip-cursor.js (Blip, the cursor mascot):
 *   blip:click blip:blink blip:joy blip:listen blip:wave blip:wake
 *   blip:twirl blip:snooze
 *
 * Events emitted by cathode-guide.js (Cathode, the guide mascot):
 *   cathode:boot cathode:enter cathode:speak({chars}) cathode:jump
 *   cathode:land({perch}) cathode:spin cathode:squish cathode:bump
 *   cathode:dizzy cathode:crack cathode:repair cathode:fixed
 *   cathode:meet({scene: check|hug|talk|dance}) cathode:off cathode:on
 *
 * Mute: window.sound() (persisted in localStorage 'site-sfx'; migrates the
 * legacy per-theme keys 'terminal-sfx' / 'fps-sfx').
 */
const SFX = (() => {
    const STORAGE_KEY = 'site-sfx';
    const LEGACY_KEYS = ['terminal-sfx', 'fps-sfx'];

    let ctx = null;
    let master = null;
    let pack = null;
    let packTheme = null;
    let enabled = true;
    const changeListeners = [];

    try {
        let saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) {
            // Migrate whichever legacy per-theme mute the visitor had set.
            for (const k of LEGACY_KEYS) {
                const v = localStorage.getItem(k);
                if (v !== null) { saved = v; localStorage.setItem(STORAGE_KEY, v); break; }
            }
        }
        enabled = saved !== 'off';
    } catch (e) { /* private mode */ }

    // Browsers only allow audio after a user gesture; the wiring below calls
    // this on every pointerdown/keydown/click so sound unlocks ASAP.
    function ensure() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) {
            ctx = new Ctx();
            master = ctx.createGain();
            master.gain.value = 0.9;
            master.connect(ctx.destination);
        }
        // != 'running' (not == 'suspended'): iOS Safari parks the context in a
        // non-standard 'interrupted' state after calls/route changes/tab
        // switches, and it stayed muted forever because we never resumed it.
        if (ctx.state !== 'running') ctx.resume().catch(() => { /* needs gesture */ });
        return ctx;
    }

    function running() {
        return enabled && !!ctx && ctx.state === 'running';
    }

    // ── Synth primitives (shared by every pack) ──
    function tone(at, dur, vol, type, f0, f1, dest) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(f0, 1), at);
        if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), at + dur);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(vol, at + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, at + dur);
        osc.connect(g);
        g.connect(dest || master);
        osc.start(at);
        osc.stop(at + dur + 0.05);
    }

    function noise(at, dur, vol, f0, f1, q, dest) {
        const len = Math.ceil(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = q || 1;
        bp.frequency.setValueAtTime(Math.max(f0, 1), at);
        if (f1 && f1 !== f0) bp.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), at + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(vol, at + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, at + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(dest || master);
        src.start(at);
        src.stop(at + dur + 0.05);
    }

    // ── Event dispatch ──
    // Default per-event throttle (ms) so rapid-fire emitters (typing, bumps,
    // cascading reveals) never machine-gun. Events not listed use 50ms.
    const THROTTLE = {
        'ui:down': 35, 'ui:up': 35, 'key:down': 35, 'key:up': 35,
        'ui:hover': 90, 'card:reveal': 90,
        'blip:blink': 400, 'cathode:bump': 180, 'cathode:speak': 250
    };
    const lastAt = {};

    function play(event, opts) {
        if (!enabled || !ctx || !pack) return;
        const fn = pack[event];
        if (!fn) return;
        const now = performance.now();
        const gap = THROTTLE[event] != null ? THROTTLE[event] : 50;
        if (lastAt[event] && now - lastAt[event] < gap) return;
        lastAt[event] = now;
        // Mobile first-tap: resume() (kicked off by ensure() in the same
        // gesture) is async, so the context is still 'suspended' here and the
        // cue used to be dropped — every tap resumed, none ever sounded.
        // Defer the cue to the resume continuation instead of eating it.
        if (ctx.state !== 'running') {
            ctx.resume().then(() => {
                if (ctx.state !== 'running' || !enabled) return;
                try {
                    fn({ ctx, out: master, t: ctx.currentTime, tone, noise, opts: opts || {} });
                } catch (e) { /* pack handler failed post-resume */ }
            }).catch(() => { /* still locked: needs a user gesture */ });
            return;
        }
        try {
            fn({ ctx, out: master, t: ctx.currentTime, tone, noise, opts: opts || {} });
        } catch (e) {
            console.warn('[SFX] pack handler failed for', event, e);
        }
    }

    // The active theme's pack. Last registration wins (themes fully reload the
    // page on switch, so in practice there is exactly one per page).
    function register(themeId, handlers) {
        packTheme = themeId;
        pack = handlers || {};
    }

    function setOn(v) {
        enabled = v === undefined ? !enabled : !!v;
        try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
        changeListeners.forEach(fn => { try { fn(enabled); } catch (e) { /* ignore */ } });
        return enabled;
    }

    // Themes with a visual mute control (fps) sync it here.
    function onChange(fn) {
        if (typeof fn === 'function') changeListeners.push(fn);
    }

    /* ── Global interaction wiring ──
       Site-wide, theme-agnostic: presses, keys, link hovers and card reveals.
       Packs opt in by implementing the events; unimplemented ones cost one
       no-op lookup. */

    function initInteractions() {
        // Mouse/pen: distinct press + release. Touch: a single synthesized
        // down/up pair on click only, so scroll flicks stay silent.
        document.addEventListener('pointerdown', (e) => {
            ensure();
            if (e.pointerType !== 'touch') play('ui:down');
        });
        // Extra unlock chance on iOS: touchend is the canonical gesture Safari
        // accepts for audio activation (some versions reject touchstart-time
        // resumes), and it also revives an 'interrupted' context post-call.
        document.addEventListener('touchend', () => ensure(), { passive: true });
        document.addEventListener('pointerup', (e) => {
            if (e.pointerType !== 'touch') play('ui:up');
        });
        document.addEventListener('click', (e) => {
            ensure();
            if (e.pointerType === 'touch') {
                play('ui:down');
                setTimeout(() => play('ui:up'), 70);
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            ensure();
            play('key:down');
        });
        document.addEventListener('keyup', () => play('key:up'));

        // Hover cue on anything clickable.
        document.addEventListener('mouseover', (e) => {
            if (!e.target || !e.target.closest) return;
            const el = e.target.closest('a, button, [role="button"], .clickable');
            if (!el) return;
            const from = e.relatedTarget;
            if (from && from.closest && from.closest('a, button, [role="button"], .clickable') === el) return;
            play('ui:hover');
        });

        initCardRevealEvents();
    }

    // card:reveal fires when project/blog cards scroll into view; {step}
    // climbs while reveals cascade (<900ms apart) so packs can ladder pitch.
    // Watches future cards too — they render after the JSON data loads.
    function initCardRevealEvents() {
        if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return;
        let cascade = 0;
        let lastReveal = 0;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                const now = performance.now();
                cascade = now - lastReveal < 900 ? cascade + 1 : 0;
                lastReveal = now;
                play('card:reveal', { step: cascade });
            });
        }, { threshold: 0.25 });
        const seen = new WeakSet();
        const scan = () => document.querySelectorAll('.project-card, .blog-card').forEach(el => {
            if (!seen.has(el)) {
                seen.add(el);
                io.observe(el);
            }
        });
        const startWatching = () => {
            scan();
            new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
        };
        if (document.body) startWatching();
        else document.addEventListener('DOMContentLoaded', startWatching);
    }

    initInteractions();

    return {
        ensure,
        play,
        register,
        setOn,
        onChange,
        isOn: () => enabled,
        isRunning: running,
        get context() { return ctx; },
        get output() { return master; },
        get theme() { return packTheme; }
    };
})();

// Console command to mute/unmute all site sounds (persisted).
window.sound = function (on) {
    const state = SFX.setOn(on);
    console.log(`%c[AUDIO] UI sounds ${state ? 'enabled' : 'disabled'}`, 'color: #33ff00;');
    return state;
};

// Export for use in other modules
window.SFX = SFX;
