/**
 * Site footer — "cd ~"
 *
 * - Local clock (Europe/Paris), copy-to-clipboard e-mail, current year.
 * - Entrance choreography: each [data-sf-group] gets .sf-in when it scrolls in.
 * - Hands the floating "Let's talk" button off while the footer is on screen
 *   (the footer carries its own contact pill, and the button would sit on the scene).
 * - Home scene: Tom's painted home (transparent sky, RGBA still), drawn by a small
 *   WebGL pass: a watercolour wash reveal as the scene scrolls in and a depth
 *   parallax on scroll (the garden rises over the sky). prefers-reduced-motion
 *   drops the entrance and the parallax; no WebGL keeps the <img> poster.
 *
 * One scene per theme: add an entry to SCENES keyed by the theme id; themes
 * without one fall back to `default`.
 */
(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function t(key, fallback) {
        const value = window.LanguageManager?.t?.(key);
        return typeof value === 'string' && value !== key ? value : fallback;
    }

    // ─── Clock ───
    function initClock(root) {
        const time = root.querySelector('#sf-clock-time');
        const meta = root.querySelector('#sf-clock-meta');
        if (!time) return;

        let fmt, offsetFmt;
        try {
            fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        } catch { return; }
        try { offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' }); } catch {}

        time.textContent = '';
        const hh = document.createElement('span');
        const colon = document.createElement('span');
        const mm = document.createElement('span');
        colon.className = 'sf-clock-colon';
        colon.textContent = ':';
        time.append(hh, colon, mm);

        function tick() {
            const now = new Date();
            const parts = fmt.formatToParts(now);
            const h = parts.find(p => p.type === 'hour')?.value ?? '--';
            const m = parts.find(p => p.type === 'minute')?.value ?? '--';
            hh.textContent = h;
            mm.textContent = m;
            time.dateTime = `${h}:${m}`;
            if (meta && offsetFmt) {
                const off = offsetFmt.formatToParts(now).find(p => p.type === 'timeZoneName')?.value;
                if (off) meta.textContent = `France · ${off.replace('GMT', 'UTC')}`;
            }
        }

        tick();
        setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000 + 50);
    }

    // ─── Copy e-mail ───
    function legacyCopy(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch {}
        area.remove();
        return ok;
    }

    function initCopy(root) {
        const pill = root.querySelector('.sf-pill');
        const button = root.querySelector('.sf-pill-copy');
        const status = root.querySelector('#sf-copy-status');
        if (!pill || !button) return;

        let timer = 0;
        button.addEventListener('click', async () => {
            const text = button.dataset.copy;
            let ok = false;
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch {
                ok = legacyCopy(text);
            }
            if (!ok) {
                window.location.href = `mailto:${text}`;
                return;
            }
            pill.classList.add('is-copied');
            if (status) status.textContent = t('footer.copyStatus', 'Adresse e-mail copiée.');
            try { window.posthog?.capture?.('footer_email_copied'); } catch {}
            clearTimeout(timer);
            timer = setTimeout(() => {
                pill.classList.remove('is-copied');
                if (status) status.textContent = '';
            }, 2200);
        });
    }

    // ─── Entrance choreography ───
    function initReveal(root) {
        if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
        const groups = [...root.querySelectorAll('[data-sf-group]')];
        if (!groups.length) return;
        root.classList.add('sf-armed');
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                // A jump to the bottom (End key, anchor) can carry the earlier groups
                // past the viewport without ever intersecting: reveal them too.
                const upTo = groups.indexOf(entry.target);
                groups.slice(0, upTo + 1).forEach(group => {
                    group.classList.add('sf-in');
                    io.unobserve(group);
                });
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        groups.forEach(group => io.observe(group));
    }

    // ─── Floating CTA hand-off ───
    function initCtaHandoff(root) {
        const cta = document.getElementById('floating-cta');
        if (!cta || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([entry]) => {
            cta.classList.toggle('hidden', entry.isIntersecting);
        }, { rootMargin: '0px 0px -20% 0px' });
        io.observe(root);
    }

    // ═══════════════════════════════════════════════════════════════
    // Home scene — WebGL compositor
    // ═══════════════════════════════════════════════════════════════

    // One painting per theme. `aspect` is the painting's real aspect, `style` picks
    // the entrance in the shader, `revealMs` its length.
    const SCENES = {
        default: {
            aspect: 2230 / 930, style: 0, revealMs: 1800,
            hd: { poster: 'home-scene-poster-1792.webp' },
            sd: { poster: 'home-scene-poster-960.webp' }
        },
        terminal: {
            aspect: 2230 / 930, style: 1, revealMs: 2000,
            hd: { poster: 'home-scene-terminal-poster-1792.webp' },
            sd: { poster: 'home-scene-terminal-poster-960.webp' }
        },
        blueprint: {
            aspect: 2230 / 930, style: 2, revealMs: 2200,
            hd: { poster: 'home-scene-blueprint-poster-1792.webp' },
            sd: { poster: 'home-scene-blueprint-poster-960.webp' }
        },
        retro90s: {
            aspect: 2230 / 930, style: 3, revealMs: 2400,
            hd: { poster: 'home-scene-retro90s-poster-1792.webp' },
            sd: { poster: 'home-scene-retro90s-poster-960.webp' }
        },
        fps: {
            aspect: 2230 / 930, style: 4, revealMs: 1800,
            hd: { poster: 'home-scene-fps-poster-1792.webp' },
            sd: { poster: 'home-scene-fps-poster-960.webp' }
        }
    };

    function sceneFor(theme) {
        return SCENES[theme] || SCENES.default;
    }
    const ASSET_DIR = '/assets/footer/';

    const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
    v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

    const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;

uniform sampler2D u_tex;
uniform vec2  u_res;        // canvas size, device px
uniform vec4  u_crop;       // visible scene rect (x, y, w, h), scene uv
uniform float u_reveal;     // 0..1 watercolour wash
uniform float u_rise;       // 0..1 scroll parallax (1 = settled)
uniform vec2  u_fade;       // top dissolve depth, fraction of canvas height (x: tree side, y: sky side)
uniform float u_style;      // entrance: 0 watercolour, 1 phosphor print, 2 plotter sweep, 3 interlaced GIF, 4 radar ping

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
}

float bayer2(vec2 q) {
    q = mod(q, 2.0);
    return q.y < 0.5 ? (q.x < 0.5 ? 0.0 : 2.0) : (q.x < 0.5 ? 3.0 : 1.0);
}

// 4x4 ordered-dither threshold, 0..1.
float bayer4(vec2 p) {
    p = floor(p);
    return (4.0 * bayer2(p) + bayer2(floor(p / 2.0)) + 0.5) / 16.0;
}

// Near things sit low in a landscape: depth grows from the horizon to the grass.
float depthAt(float v) { return smoothstep(0.5, 1.0, v); }

vec4 sampleScene(vec2 s) {
    return texture2D(u_tex, clamp(s, vec2(0.0), vec2(1.0)));
}

vec2 sceneUV(vec2 uv) {
    vec2 s = u_crop.xy + uv * u_crop.zw;
    float d = depthAt(s.y);
    s.y -= (1.0 - u_rise) * d * 0.06;
    return s;
}

void main() {
    vec2 uv = v_uv;
    vec2 px = uv * u_res;
    float unit = u_res.x / 1440.0;                            // ~1 css px at desktop width
    float reveal = 1.0;                                        // entrance mask
    vec3 glow = vec3(0.0);                                     // light the entrance adds (premultiplied)
    float glowA = 0.0;

    bool retro = u_style > 2.5 && u_style < 3.5;

    // retro90s: the GIF arrives in interlaced passes, blocky first, then sharp.
    if (retro) {
        float p = u_reveal * 4.0;
        float k = floor(p) + step(uv.y, fract(p));             // passes this row has received
        if (k < 0.5) reveal = 0.0;
        float blk = k < 1.5 ? 24.0 : k < 2.5 ? 12.0 : k < 3.5 ? 6.0 : 0.0;
        if (blk > 0.0) {
            blk *= unit;
            uv = (floor(px / blk) + 0.5) * blk / u_res;
        }
    }

    vec2 s = sceneUV(uv);
    vec4 c = sampleScene(s);
    vec3 rgb = c.rgb;
    float n = fbm(vec2(s.x * 7.0, s.y * 4.0) + 3.1);

    if (u_style < 0.5) {
        // Watercolour wash: runs down the scene, sky first, garden last, with a
        // ragged edge where the pigment pools and darkens.
        rgb += (hash(px) - 0.5) * 0.02;                        // a breath of paper grain
        float front = s.y * 0.82 + n * 0.32;
        float r = u_reveal * 1.2;
        reveal = 1.0 - smoothstep(r - 0.1, r, front);
        rgb *= 1.0 - smoothstep(r - 0.1, r - 0.03, front) * reveal * 0.22;
    } else if (u_style < 1.5) {
        // Phosphor print: the picture is written row by row, a bright beam on the
        // line being drawn.
        float rows = 150.0;
        float row = floor(uv.y * rows) / rows;
        float front = u_reveal * 1.04;
        reveal = step(row, front - 1.0 / rows);
        float beam = (1.0 - step(0.999, u_reveal)) * step(abs(row - front), 1.5 / rows);
        rgb = mix(rgb, vec3(0.75, 1.0, 0.65), beam * 0.7);
        reveal = max(reveal, beam * c.a);
    } else if (u_style < 2.5) {
        // Plotter sweep: a cyan head crosses the sheet and leaves the drawing behind.
        float front = u_reveal * 1.1 - 0.05;
        reveal = smoothstep(front + 0.004, front - 0.004, uv.x);
        float beam = exp(-abs(uv.x - front) * u_res.x / (5.0 * unit)) * (1.0 - step(0.999, u_reveal));
        glow = vec3(0.0, 1.0, 1.0) * beam * 0.85;
        glowA = beam * 0.85;
    } else if (u_style > 3.5) {
        // Radar ping: the map is revealed by a ring growing from the family,
        // a HUD-blue pulse on its front edge.
        float ar = u_res.x / u_res.y;
        float d = length((uv - vec2(0.55, 0.78)) * vec2(ar, 1.0)) / ar;
        float front = u_reveal * 0.95;
        reveal = smoothstep(front + 0.006, front - 0.006, d);
        float ring = exp(-abs(d - front) * u_res.x / (7.0 * unit)) * (1.0 - step(0.999, u_reveal));
        glow = vec3(0.49, 0.74, 1.0) * ring * 0.9;
        glowA = ring * 0.9;
    }

    // The frame's top edge cuts through the canopy: dissolve it over a thin band
    // (leafy noise; ordered dither for the pixel-art painting), so it reads as
    // foliage rather than a cut. Below it, only the keyed sky is see-through.
    float depth = mix(u_fade.x, u_fade.y, smoothstep(0.3, 0.7, uv.x));
    float e;
    if (retro) {
        e = step(bayer4(px / (6.0 * unit)), clamp(uv.y / depth, 0.0, 1.0));   // chunky, art-sized dither
    } else {
        float leaf = fbm(vec2(s.x * 95.0, s.y * 42.0));
        e = smoothstep(0.36, 0.64, uv.y / depth + (leaf - 0.5) * 0.85 + (n - 0.5) * 0.4);
    }
    float a = c.a * reveal * e;
    gl_FragColor = vec4(rgb * a + glow * (1.0 - a), a + glowA * (1.0 - a));
}`;

    function compile(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`[site-footer] shader: ${log}`);
        }
        return shader;
    }

    function createScene(scene) {
        const canvas = scene.querySelector('.sf-scene-canvas');
        const root = scene.closest('.site-footer') || document.body;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
            || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true });
        if (!gl) return;

        const config = sceneFor(document.body.dataset.theme || 'default');
        const still = reduceMotion.matches;

        const state = {
            visible: false,
            raf: 0,
            lastTime: 0,
            reveal: still ? 1 : 0,
            washStart: 0,
            rise: still ? 1 : 0,
            crop: [0, 0, 1, 1],
            fade: [0.1, 0.06],
            dirty: true
        };

        let program, loc, texture;
        function setupGL() {
            program = gl.createProgram();
            gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
            gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('[site-footer] link failed');
            gl.useProgram(program);

            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
            const aPos = gl.getAttribLocation(program, 'a_pos');
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            loc = {};
            ['u_tex', 'u_res', 'u_crop', 'u_reveal', 'u_rise', 'u_fade', 'u_style']
                .forEach(name => { loc[name] = gl.getUniformLocation(program, name); });

            texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            gl.uniform1i(loc.u_tex, 0);
            gl.clearColor(0, 0, 0, 0);
        }

        // "Cover" crop, bottom-anchored (the ground always touches the page's end),
        // horizontally centred on --sf-scene-focus-x (the family, by default).
        function resize() {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            let dpr = Math.min(window.devicePixelRatio || 1, 2);
            const maxPixels = 4.2e6;
            if (rect.width * rect.height * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (rect.width * rect.height));
            const w = Math.max(1, Math.round(rect.width * dpr));
            const h = Math.max(1, Math.round(rect.height * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            const ar = rect.width / rect.height;
            let cw = 1, ch = 1;
            if (ar < config.aspect) cw = ar / config.aspect; else ch = config.aspect / ar;
            const overscan = 1.035;                     // room for the parallax to move
            cw /= overscan;
            ch /= overscan;
            const styles = getComputedStyle(root);
            const focus = (parseFloat(styles.getPropertyValue('--sf-scene-focus-x')) || 56) / 100;
            state.fade = [
                (parseFloat(styles.getPropertyValue('--sf-scene-fade-tree')) || 10) / 100,
                (parseFloat(styles.getPropertyValue('--sf-scene-fade-sky')) || 6) / 100
            ];
            state.crop = [Math.min(Math.max(focus - cw / 2, 0), 1 - cw), 1 - ch - 0.008, cw, ch];
            state.dirty = true;
        }

        function goLive() {
            scene.classList.add('is-live');
            state.dirty = true;
            requestFrame();
        }

        // The still is the page's own <img> poster (srcset picks its size), so it is
        // downloaded once and serves both the no-WebGL fallback and the scene.
        function loadPoster() {
            const img = scene.querySelector('.sf-scene-poster');
            if (!img) return;
            const upload = () => {
                if (gl.isContextLost() || !img.naturalWidth) return;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                goLive();
            };
            if (img.complete && img.naturalWidth) upload();
            else img.addEventListener('load', upload, { once: true });
        }

        // Reveal completes once most of the scene is on screen (some themes keep
        // fixed chrome over the page bottom, so it can't rely on the very end).
        function scrollProgress() {
            const rect = scene.getBoundingClientRect();
            const vh = window.innerHeight || 1;
            return Math.min(Math.max((vh - rect.top) / (rect.height * 0.75), 0), 1);
        }

        function requestFrame() {
            if (!state.raf && state.visible) state.raf = requestAnimationFrame(frame);
        }

        function frame(now) {
            state.raf = 0;
            if (!state.visible || gl.isContextLost()) return;
            const dt = Math.min((now - (state.lastTime || now)) / 1000, 0.1);
            state.lastTime = now;
            let animating = false;

            if (!still) {
                const target = scrollProgress();
                // The entrance plays once (config.revealMs) from the moment the scene's top
                // edge shows; the depth parallax keeps following the scroll both ways.
                if (!state.washStart && target > 0.02) state.washStart = now;
                if (state.washStart && state.reveal < 1) {
                    const k = Math.min((now - state.washStart) / config.revealMs, 1);
                    state.reveal = 1 - Math.pow(1 - k, 3);
                    animating = true;
                }
                if (Math.abs(target - state.rise) > 1e-3) {
                    state.rise += (target - state.rise) * (1 - Math.exp(-dt * 5));
                    animating = true;
                }
            }

            if (state.dirty || animating) {
                draw();
                state.dirty = false;
            }
            if (animating) requestFrame();
        }

        function draw() {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(loc.u_res, canvas.width, canvas.height);
            gl.uniform4f(loc.u_crop, state.crop[0], state.crop[1], state.crop[2], state.crop[3]);
            gl.uniform1f(loc.u_reveal, state.reveal);
            gl.uniform1f(loc.u_rise, state.rise);
            gl.uniform2f(loc.u_fade, state.fade[0], state.fade[1]);
            gl.uniform1f(loc.u_style, config.style);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        const io = new IntersectionObserver(([entry]) => {
            state.visible = entry.isIntersecting;
            if (state.visible) {
                state.lastTime = 0;
                state.dirty = true;
                requestFrame();
            }
        }, { rootMargin: '200px 0px' });

        canvas.addEventListener('webglcontextlost', e => {
            e.preventDefault();
            scene.classList.remove('is-live');
            if (state.raf) cancelAnimationFrame(state.raf);
            state.raf = 0;
        });
        canvas.addEventListener('webglcontextrestored', () => {
            setupGL();
            resize();
            loadPoster();
        });

        try {
            setupGL();
        } catch (err) {
            console.warn(err);
            return;
        }
        resize();
        loadPoster();
        if (!still) {
            window.addEventListener('scroll', requestFrame, { passive: true });
        }
        io.observe(scene);
        new ResizeObserver(() => { resize(); requestFrame(); }).observe(scene);
    }

    // ─── Boot ───
    function init() {
        const root = document.getElementById('site-footer');
        if (!root) return;

        const year = root.querySelector('.sf-year');
        if (year) year.textContent = String(new Date().getFullYear());

        initClock(root);
        initCopy(root);
        initReveal(root);
        initCtaHandoff(root);

        // Nothing of the scene downloads up front: the still and WebGL wake up when
        // the footer is getting close.
        const scene = root.querySelector('.sf-scene');
        if (!scene) return;

        function wake() {
            // The theme's own painting, picked now that the theme is known.
            const config = sceneFor(document.body.dataset.theme || 'default');
            const poster = scene.querySelector('.sf-scene-poster');
            if (poster && !poster.getAttribute('src')) {
                poster.srcset = `${ASSET_DIR}${config.sd.poster} 960w, ${ASSET_DIR}${config.hd.poster} 1792w`;
                poster.src = ASSET_DIR + config.hd.poster;
            }
            const art = scene.querySelector('.sf-scene-art');
            if (art) art.setAttribute('aria-label', t('footer.sceneLabel', art.getAttribute('aria-label')));
            createScene(scene);
        }

        if (!('IntersectionObserver' in window)) { wake(); return; }
        const near = new IntersectionObserver(entries => {
            if (!entries.some(e => e.isIntersecting)) return;
            near.disconnect();
            wake();
        }, { rootMargin: '800px 0px' });

        // Only start watching once the theme has rendered: before that the page is
        // still short (projects, timeline… load async) and the footer looks close.
        let armed = false;
        const arm = () => {
            if (armed) return;
            armed = true;
            classWatch.disconnect();
            near.observe(scene);
        };
        const classWatch = new MutationObserver(() => {
            if (document.body.classList.contains('loaded')) arm();
        });
        if (document.body.classList.contains('loaded')) arm();
        else {
            classWatch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            setTimeout(arm, 8000);   // a theme that never reports ready
        }
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init, { once: true })
        : init();
})();
