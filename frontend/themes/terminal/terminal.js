/**
 * ═══════════════════════════════════════════════════════════════
 * TERMINAL CLI PORTFOLIO - Theme JavaScript
 * "Cyber-Industrial Hacker" Aesthetic
 * Uses new modular architecture with ThemeInit
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Fun ASCII Banner ───
console.log(`
%c╔═══════════════════════════════════════════════════════════════╗
║  ████████╗ ██████╗ ███╗   ███╗   ██████╗ ███████╗██╗   ██╗   ║
║  ╚══██╔══╝██╔═══██╗████╗ ████║   ██╔══██╗██╔════╝██║   ██║   ║
║     ██║   ██║   ██║██╔████╔██║   ██║  ██║█████╗  ██║   ██║   ║
║     ██║   ██║   ██║██║╚██╔╝██║   ██║  ██║██╔══╝  ╚██╗ ██╔╝   ║
║     ██║   ╚██████╔╝██║ ╚═╝ ██║   ██████╔╝███████╗ ╚████╔╝    ║
║     ╚═╝    ╚═════╝ ╚═╝     ╚═╝   ╚═════╝ ╚══════╝  ╚═══╝     ║
╚═══════════════════════════════════════════════════════════════╝
`, 'color: #33ff00; font-family: monospace;');

console.log('%c[SYSTEM] Terminal initialized...', 'color: #ffb000;');
console.log('%c[OK] Portfolio v3.0 loaded', 'color: #33ff00;');
console.log('%c[INFO] Type "help()" for easter eggs', 'color: #33ff00;');

// ─── Easter Egg Console Functions ───
window.help = function() {
    console.log(`
%c╔═══════════════════════════════════════╗
║         AVAILABLE COMMANDS            ║
╠═══════════════════════════════════════╣
║  matrix()    - Enter the Matrix       ║
║  party()     - Party mode!            ║
║  hack()      - Hack the mainframe     ║
║  ship()      - Ship it now!           ║
║  enderman()  - Summon an Enderman     ║
║  sound()     - Toggle UI sound FX     ║
║  reset()     - Reset to default       ║
╚═══════════════════════════════════════╝
`, 'color: #33ff00; font-family: monospace;');
};

window.matrix = function() {
    document.documentElement.style.setProperty('--primary', '#00ff00');
    document.documentElement.style.setProperty('--secondary', '#003300');
    console.log('%c[SYSTEM] You are now in the Matrix...', 'color: #00ff00;');
    console.log('%c"There is no spoon."', 'color: #00ff00;');
};

window.party = function() {
    let colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#7700ff'];
    let i = 0;
    const partyInterval = setInterval(() => {
        document.documentElement.style.setProperty('--primary', colors[i % colors.length]);
        i++;
        if (i > 30) {
            clearInterval(partyInterval);
            document.documentElement.style.setProperty('--primary', '#33ff00');
        }
    }, 100);
    console.log('%c PARTY MODE ACTIVATED!', 'color: #ff00ff; font-size: 20px;');
};

window.hack = function() {
    console.log('%c[SYSTEM] Initializing hack sequence...', 'color: #ffb000;');
    console.log('%c[████████████████████] 100%', 'color: #33ff00;');
    console.log('%c[SUCCESS] Access granted! Just kidding', 'color: #33ff00;');
};

window.ship = function() {
    console.log('%c Another iteration deployed!', 'color: #ffb000; font-size: 16px;');
    console.log('%c[OK] Small steps, meaningful progress.', 'color: #33ff00;');
};

window.reset = function() {
    document.documentElement.style.setProperty('--primary', '#33ff00');
    document.documentElement.style.setProperty('--secondary', '#ffb000');
    console.log('%c[SYSTEM] Colors reset to default', 'color: #33ff00;');
};

// ─── Typewriter Effect Class ───
class Typewriter {
    constructor(element, texts, speed = 80) {
        this.element = element;
        this.texts = texts;
        this.speed = speed;
        this.textIndex = 0;
        this.charIndex = 0;
        this.isDeleting = false;

        if (this.element) {
            this.type();
        }
    }

    type() {
        const currentText = this.texts[this.textIndex];

        if (this.isDeleting) {
            this.element.textContent = currentText.substring(0, this.charIndex - 1);
            this.charIndex--;
        } else {
            this.element.textContent = currentText.substring(0, this.charIndex + 1);
            this.charIndex++;
        }

        let delay = this.isDeleting ? this.speed / 2 : this.speed;

        if (!this.isDeleting && this.charIndex === currentText.length) {
            delay = 2000;
            this.isDeleting = true;
        } else if (this.isDeleting && this.charIndex === 0) {
            this.isDeleting = false;
            this.textIndex = (this.textIndex + 1) % this.texts.length;
            delay = 500;
        }

        setTimeout(() => this.type(), delay);
    }
}

// Theme configuration
const terminalThemeConfig = {
    name: 'Terminal',

    // Card rendering configuration
    cards: {
        wrapperClass: 'project-card fade-in-up',
        showIndex: true,
        indexPrefix: 'PRJ-',
        indexPadding: 2,
        showType: true,
        typePrefix: '// ',
        titlePrefix: '> ',
        tagWrapper: '[ {tag} ]',
        showUrl: true,
        urlIcon: '&#8594;',  // →
        // Custom header template for terminal style
        headerTemplate: (project, indexFormatted) => `
            <div class="project-card-header">
                <span class="project-index">PRJ-${indexFormatted}</span>
                <span class="project-type">// ${project.type}</span>
            </div>
        `
    },

    // Blog card configuration
    blogCards: {
        wrapperClass: 'blog-card fade-in-up',
        showIndex: true,
        indexPrefix: 'BLOG-',
        indexPadding: 2,
        titlePrefix: '> ',
        dateWrapper: '[ {date} ]',
        readingTimePrefix: '~',
        // Custom header template
        headerTemplate: (article, indexFormatted) => `
            <div class="blog-card-header">
                <span class="blog-index">BLOG-${indexFormatted}</span>
            </div>
        `
    },

    // Cursor tracker configuration
    cursor: {
        mode: 'viewport',
        cursorSelector: '#custom-cursor',
        smoothing: 0.15,
        offsetX: 10,
        offsetY: -10
    },

    // Header scroll effect
    headerScroll: 'terminal',

    // Konami code easter egg
    konami: handleKonami,

    // Theme-specific effects
    initEffects: initTerminalEffects,

    // Ready callback
    onReady: () => {
        console.log('%c[OK] All systems operational', 'color: #33ff00;');
        console.log('%c[TIP] Open console and type help() for fun commands!', 'color: #ffb000;');
    }
};

// ─── Theme-Specific Effects ───
function initTerminalEffects() {
    initTypewriter();
    initGlitchEffect();
    initLoadingSpinner();
    initRandomMessages();
    initKeyboardShortcuts();
    randomGlitch();
    createEndermanElement();
    initTerminalSfx();
}

// ─── Typewriter Initialization ───
function initTypewriter() {
    const heroTyped = document.getElementById('hero-typed');
    const heroMessages = [
        'echo "Hello, World!"',
        'npm run create-awesome-stuff',
        'git commit -m "made it better"',
        'sudo let me surf more',
        'iterate() until meaningful(product)',
        './build-dreams.sh --with-passion',
        'grep -r "bugs" . | ./fix-them-with-ai-pipelines.sh',
    ];

    setTimeout(() => {
        new Typewriter(heroTyped, heroMessages, 60);
    }, 1000);
}

// ─── Glitch Effect on Hover ───
function initGlitchEffect() {
    document.querySelectorAll('.section-title').forEach(el => {
        el.addEventListener('mouseenter', () => el.classList.add('glitching'));
        el.addEventListener('mouseleave', () => el.classList.remove('glitching'));
    });
}

// ─── Random Glitch Effect ───
function randomGlitch() {
    const elements = document.querySelectorAll('.section-title');
    if (elements.length === 0) return;

    setInterval(() => {
        if (Math.random() > 0.95) {
            const randomEl = elements[Math.floor(Math.random() * elements.length)];
            randomEl.classList.add('glitching');
            setTimeout(() => randomEl.classList.remove('glitching'), 200);
        }
    }, 2000);
}

// ─── Loading Spinner Animation ───
function initLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (!spinner) return;

    const frames = '⣾⣽⣻⢿⡿⣟⣯⣷';
    let i = 0;

    setInterval(() => {
        spinner.textContent = frames[i];
        i = (i + 1) % frames.length;
    }, 100);
}

// ─── Random Terminal Messages ───
function initRandomMessages() {
    const messages = [
        '[INFO] Good things take time and iteration',
        '[INFO] Remember to stretch!',
        '[OK] All systems nominal',
        '[INFO] Fun fact: This site runs on creativity',
        '[INFO] You found a hidden message!',
        '[OK] Matrix stability at 100%',
        '[INFO] Keep being awesome!',
        '[WARN] Enderman detected in sector 7...',
    ];

    setInterval(() => {
        if (Math.random() > 0.8) {
            const msg = messages[Math.floor(Math.random() * messages.length)];
            console.log(`%c${msg}`, 'color: #33ff00;');
        }
    }, 30000);
}

// ─── Keyboard Shortcuts ───
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            console.log('%c[SYSTEM] Search not implemented... yet!', 'color: #ffb000;');
        }
    });
}

// ─── Konami Code Handler ───
function handleKonami() {
    console.log('%c KONAMI CODE ACTIVATED!', 'color: #ffb000; font-size: 20px;');
    document.documentElement.style.setProperty('--primary', '#ffb000');
    document.documentElement.style.setProperty('--secondary', '#ff3333');

    setTimeout(() => {
        document.documentElement.style.setProperty('--primary', '#33ff00');
        document.documentElement.style.setProperty('--secondary', '#ffb000');
    }, 5000);
}

// ─── Enderman Easter Egg ───
// Pixel map based on the actual Minecraft Enderman model:
// head 8x8, body 8x12, arms & legs 2x30 → 12 wide, 50 tall.
// Eyes: 3x2 px each, edge to edge with a 2px gap (#ed8cff / #cb59ff / #aa1bab).
const ENDERMAN_COLORS = {
    '#': '#1e1e24', // skin base
    '+': '#2a2a33', // skin highlight
    '-': '#131318', // skin shadow
    'E': '#ed8cff', // eye bright
    'P': '#cb59ff', // eye mid
    'M': '#aa1bab'  // eye dark
};

const ENDERMAN_PIXELS = [
    '..########..', // head (rows 0-7)
    '..#+######..',
    '..######+#..',
    '..########..',
    '..PEP##PEP..', // eyes
    '..MPM##MPM..',
    '..########..',
    '..#-####-#..',
    '############', // body + shoulders (rows 8-19)
    '#+##########',
    '##########-#',
    '############',
    '####+#######',
    '############',
    '############',
    '#-######+###',
    '############',
    '############',
    '###+######-#',
    '############',
    '##.##..##.##', // arms + legs (rows 20-37)
    '##.##..##.##',
    '#+.##..##.##',
    '##.#+..##.##',
    '##.##..##.-#',
    '##.##..-#.##',
    '##.##..##.##',
    '##.-#..##.+#',
    '##.##..##.##',
    '#+.##..#+.##',
    '##.##..##.##',
    '##.+#..##.##',
    '##.##..##.##',
    '#-.##..#+.##',
    '##.##..##.##',
    '##.+#..##.#+',
    '##.##..##.##',
    '##.##..##.##',
    '...##..##...', // legs only (rows 38-49)
    '...#+..##...',
    '...##..-#...',
    '...##..##...',
    '...##..##...',
    '...-#..##...',
    '...##..#+...',
    '...##..##...',
    '...##..##...',
    '...+#..##...',
    '...##..##...',
    '...##..##...'
];

// Build an SVG from a pixel map, merging horizontal runs of identical
// pixels into single rects. Pixels are grouped per body part with real
// joints: forearms nest inside upper arms (elbows), shins inside thighs
// (knees) and the jaw inside the head, so limbs can bend and the mouth
// can open. The eyes live in their own sub-group for the glow.
function buildPixelSvg(pixels, colors) {
    const parts = {
        skull: [], jaw: [], eyes: [], body: [],
        armLu: [], armLd: [], armRu: [], armRd: [],
        legLu: [], legLd: [], legRu: [], legRd: []
    };
    const partOf = (x, y, ch) => {
        if ('EPM'.includes(ch)) return 'eyes';
        if (y <= 5) return 'skull';
        if (y <= 7) return 'jaw';
        if (x <= 1) return y <= 22 ? 'armLu' : 'armLd';
        if (x >= 10) return y <= 22 ? 'armRu' : 'armRd';
        if (y <= 19) return 'body';
        if (x <= 5) return y <= 34 ? 'legLu' : 'legLd';
        return y <= 34 ? 'legRu' : 'legRd';
    };

    pixels.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const ch = row[x];
            if (!colors[ch]) { x++; continue; }
            const part = partOf(x, y, ch);
            let w = 1;
            while (x + w < row.length && row[x + w] === ch && partOf(x + w, y, ch) === part) w++;
            parts[part].push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${colors[ch]}"/>`);
            x += w;
        }
    });

    const height = pixels.length;
    const width = pixels[0].length;
    const limb = (up, lo, upCls, loCls) => parts[up].length
        ? `<g class="edm-part ${upCls}">${parts[up].join('')}` +
          (parts[lo].length ? `<g class="edm-part ${loCls}">${parts[lo].join('')}</g>` : '') + `</g>`
        : '';
    const g = (name, cls) => parts[name].length ? `<g class="edm-part ${cls}">${parts[name].join('')}</g>` : '';
    const eyes = parts.eyes.length ? `<g class="edm-eyes">${parts.eyes.join('')}</g>` : '';
    // Purple mouth interior, fully covered by the jaw when closed and
    // revealed as the jaw drops (rows 6-7 of the 8-wide head)
    const mouth = parts.jaw.length
        ? '<rect class="edm-mouth" x="3" y="6" width="6" height="2" fill="#a833c9"/>'
        : '';
    const head = (parts.skull.length || parts.eyes.length)
        ? `<g class="edm-part edm-head">${parts.skull.join('')}${mouth}${eyes}${g('jaw', 'edm-jaw')}</g>`
        : '';
    return `<svg viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true">` +
        limb('armLu', 'armLd', 'edm-arm-l', 'edm-fore-l') +
        limb('armRu', 'armRd', 'edm-arm-r', 'edm-fore-r') +
        limb('legLu', 'legLd', 'edm-leg-l', 'edm-shin-l') +
        limb('legRu', 'legRd', 'edm-leg-r', 'edm-shin-r') +
        g('body', 'edm-body') +
        head +
        `</svg>`;
}

// Flat (ungrouped) pixel SVG, for props like the dirt block
function buildFlatSvg(pixels, colors) {
    const rects = [];
    pixels.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const ch = row[x];
            if (!colors[ch]) { x++; continue; }
            let w = 1;
            while (x + w < row.length && row[x + w] === ch) w++;
            rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${colors[ch]}"/>`);
            x += w;
        }
    });
    return `<svg viewBox="0 0 ${pixels[0].length} ${pixels.length}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

// The dirt block he juggles with
const DIRT_BALL_PIXELS = [
    'DbDDdD',
    'dDdbDd',
    'DdDDbD',
    'bDdDdD',
    'DbdDDb',
    'dDDbdD'
];

const DIRT_BALL_COLORS = {
    'D': '#8a5f42',
    'd': '#714b33',
    'b': '#573a27'
};

// ─── Terminal Sound Design (synthesized with Web Audio, no assets) ───
let terminalAudioCtx = null;
let endermanStareNodes = null;
let sfxEnabled = true;
try { sfxEnabled = localStorage.getItem('terminal-sfx') !== 'off'; } catch (e) { /* private mode */ }

// Browsers only allow audio after a user gesture; every click/keypress
// doubles as an unlock so sounds work as soon as possible.
function ensureAudioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!terminalAudioCtx) terminalAudioCtx = new Ctx();
    if (terminalAudioCtx.state === 'suspended') terminalAudioCtx.resume();
    return terminalAudioCtx;
}

// Console command to mute/unmute all site sounds (persisted)
window.sound = function(on) {
    sfxEnabled = on === undefined ? !sfxEnabled : !!on;
    try { localStorage.setItem('terminal-sfx', sfxEnabled ? 'on' : 'off'); } catch (e) { /* private mode */ }
    console.log(`%c[AUDIO] UI sounds ${sfxEnabled ? 'enabled' : 'disabled'}`, 'color: #33ff00;');
};

// Soft mechanical keyboard hit: muted low "thock" body + felt noise,
// slightly detuned per press so repeated clicks feel organic.
function sfxKeyInto(ctx, dest, t, up) {
    const jitter = 0.92 + Math.random() * 0.16;
    const vol = up ? 0.05 : 0.11;

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((up ? 220 : 155) * jitter, t);
    osc.frequency.exponentialRampToValueAtTime((up ? 115 : 72) * jitter, t + 0.05);
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(vol, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.001, t + (up ? 0.06 : 0.09));
    osc.connect(og);
    og.connect(dest);
    osc.start(t);
    osc.stop(t + 0.12);

    const dur = up ? 0.03 : 0.045;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = (up ? 2200 : 1500) * jitter;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(vol * 0.8, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
}

// Gentle blip for card reveals; consecutive reveals climb a pentatonic step
function sfxBlipInto(ctx, dest, t, step) {
    const ratios = [1, 1.125, 1.25, 1.5, 1.6667];
    const f = 392 * ratios[step % ratios.length];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.07);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.18);
}

const sfxLast = { down: 0, up: 0, blip: 0 };

function playKeySound(kind) {
    if (!sfxEnabled) return;
    const ctx = terminalAudioCtx;
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - sfxLast[kind] < 35) return;
    sfxLast[kind] = now;
    sfxKeyInto(ctx, ctx.destination, ctx.currentTime, kind === 'up');
}

function playCardBlip(step) {
    if (!sfxEnabled) return;
    const ctx = terminalAudioCtx;
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - sfxLast.blip < 90) return;
    sfxLast.blip = now;
    sfxBlipInto(ctx, ctx.destination, ctx.currentTime, step);
}

// Soft blip when project/blog cards scroll into view, cascading up in
// pitch when several reveal in a row. Watches future cards too (they
// render after the JSON data loads).
function initCardRevealSounds() {
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
            playCardBlip(cascade);
        });
    }, { threshold: 0.25 });
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('.project-card, .blog-card').forEach(el => {
        if (!seen.has(el)) {
            seen.add(el);
            io.observe(el);
        }
    });
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

// Keyboard thock on clicks and keystrokes, site-wide
function initTerminalSfx() {
    document.addEventListener('pointerdown', (e) => {
        ensureAudioCtx();
        if (e.pointerType !== 'touch') playKeySound('down');
    });
    document.addEventListener('pointerup', (e) => {
        if (e.pointerType !== 'touch') playKeySound('up');
    });
    // Touch taps: sound on click only, so scroll flicks stay silent
    document.addEventListener('click', (e) => {
        ensureAudioCtx();
        if (e.pointerType === 'touch') {
            playKeySound('down');
            setTimeout(() => playKeySound('up'), 70);
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        ensureAudioCtx();
        playKeySound('down');
    });
    document.addEventListener('keyup', () => playKeySound('up'));
    initCardRevealSounds();
}

// Schedule the full soundtrack relative to t0 (the moment the enderman
// becomes visible). Works on both live and OfflineAudioContext, which is
// also how the demo video's audio track is rendered.
function scheduleEndermanSounds(ctx, dest, t0) {
    const tone = (at, dur, vol, type, from, to) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, at);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + dur);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(vol, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, at + dur);
        osc.connect(g);
        g.connect(dest);
        osc.start(at);
        osc.stop(at + dur + 0.05);
    };
    const noise = (at, dur, vol, from, to, q) => {
        const len = Math.ceil(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = q;
        bp.frequency.setValueAtTime(from, at);
        if (to !== from) bp.frequency.exponentialRampToValueAtTime(to, at + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(vol, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, at + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(dest);
        src.start(at);
        src.stop(at + dur + 0.05);
    };

    // Teleport in: airy downward vwoop
    tone(t0, 0.35, 0.22, 'sawtooth', 700, 90);
    noise(t0, 0.3, 0.15, 1200, 250, 1.2);

    // Deep warbly enderman voice: once dancing, once staring mouth agape
    tone(t0 + 1.2, 0.55, 0.1, 'triangle', 150, 85);
    tone(t0 + 5.5, 0.6, 0.12, 'triangle', 170, 80);

    // Goofy chiptune groove locked to the 0.45s half-beat bounce
    const bassline = [110, 130.81, 164.81, 130.81];
    for (let i = 0; i < 20; i++) {
        const t = t0 + 0.5 + i * 0.45;
        if (i % 2 === 0) {
            tone(t, 0.12, 0.16, 'sine', 120, 45);
            const f = bassline[(i / 2) % 4];
            tone(t, 0.22, 0.055, 'square', f, f);
        } else {
            noise(t, 0.05, 0.05, 6000, 6000, 3);
        }
    }

    // The dirt block pops into his hands (40% of the act)
    tone(t0 + 4.1, 0.09, 0.22, 'sine', 350, 900);

    // Toss: rising whoosh
    noise(t0 + 4.64, 0.5, 0.18, 400, 2600, 1.5);

    // Cartoon falling whistle while he watches, jaw dropping
    tone(t0 + 5.35, 0.7, 0.07, 'sine', 1400, 600);

    // Volley kick: thump + launch whoosh + block whistling away
    tone(t0 + 6.12, 0.18, 0.3, 'sine', 160, 45);
    noise(t0 + 6.12, 0.1, 0.18, 900, 300, 1);
    noise(t0 + 6.2, 0.5, 0.2, 800, 3800, 1.2);
    tone(t0 + 6.22, 0.65, 0.06, 'sine', 900, 1900);

    // Victory arpeggios during the celebration
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(t0 + 6.8 + i * 0.12, 0.14, 0.09, 'square', f, f));
    [659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone(t0 + 8.0 + i * 0.12, 0.14, 0.08, 'square', f, f));

    // Teleport out: rising vwoop
    tone(t0 + 9.6, 0.35, 0.2, 'sawtooth', 120, 800);
    noise(t0 + 9.6, 0.3, 0.14, 300, 1400, 1.2);
}

function playEndermanSoundtrack() {
    const ctx = terminalAudioCtx;
    if (!sfxEnabled || !ctx || ctx.state !== 'running') return; // silent until a user gesture
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    scheduleEndermanSounds(ctx, master, ctx.currentTime + 0.05);
}

// Low tension drone that swells while you stare at the hidden eyes
function startEndermanStareSound() {
    const ctx = terminalAudioCtx;
    if (!sfxEnabled || !ctx || ctx.state !== 'running' || endermanStareNodes) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(75, ctx.currentTime + 2);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 1.9);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    endermanStareNodes = { osc, g };
}

function stopEndermanStareSound() {
    if (!endermanStareNodes) return;
    const ctx = terminalAudioCtx;
    const { osc, g } = endermanStareNodes;
    endermanStareNodes = null;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.2);
}

window.enderman = function() {
    console.log(`
%c    ▄██████▄
    █%c▓▓%c██%c▓▓%c█
    ▀██████▀
   ██ ████ ██
   ██ ████ ██
   ██ █  █ ██
   ██ █  █ ██
      █  █
      █  █
      █  █
%c[ENTITY] Enderman spotted... Don't look directly at it!
`, 'color: #1a1a1f; background: #0a0a0a;', 'color: #cb59ff;', 'color: #1a1a1f;', 'color: #cb59ff;', 'color: #1a1a1f;', 'color: #cb59ff;');

    const endermanEl = document.querySelector('.enderman-pixel');
    if (endermanEl && !endermanEl.classList.contains('visible')) {
        endermanEl.classList.add('visible');
        playEndermanSoundtrack();
        setTimeout(() => {
            endermanEl.classList.add('teleport');
            setTimeout(() => {
                endermanEl.classList.remove('visible', 'teleport');
            }, 500);
        }, 9600);
    }
};

// ─── Create Enderman Element ───
function createEndermanElement() {
    // Create the hidden eyes that trigger the enderman
    const eyes = document.createElement('div');
    eyes.className = 'enderman-hidden-eyes';
    eyes.innerHTML = buildPixelSvg(['PEP..PEP', 'MPM..MPM'], ENDERMAN_COLORS);
    document.body.appendChild(eyes);

    // Create the full enderman (hidden by default)
    const enderman = document.createElement('div');
    enderman.className = 'enderman-pixel';
    const particles = Array.from({ length: 10 }, () => '<span></span>').join('');
    enderman.innerHTML = buildPixelSvg(ENDERMAN_PIXELS, ENDERMAN_COLORS) +
        `<div class="edm-ball">${buildFlatSvg(DIRT_BALL_PIXELS, DIRT_BALL_COLORS)}</div>` +
        `<div class="edm-particles">${particles}</div>`;
    document.body.appendChild(enderman);

    let hoverTimer = null;

    eyes.addEventListener('mouseenter', () => {
        eyes.classList.add('watching');
        startEndermanStareSound();
        hoverTimer = setTimeout(() => {
            eyes.classList.add('triggered');
            stopEndermanStareSound();
            if (!enderman.classList.contains('visible')) {
                enderman.classList.add('visible');
                playEndermanSoundtrack();
            }
            console.log('%c[ENTITY] You looked at it for too long...', 'color: #ff00ff;');

            setTimeout(() => {
                enderman.classList.add('teleport');
                setTimeout(() => {
                    enderman.classList.remove('visible', 'teleport');
                    eyes.classList.remove('triggered');
                }, 500);
            }, 9600);
        }, 2000);
    });

    eyes.addEventListener('mouseleave', () => {
        eyes.classList.remove('watching');
        stopEndermanStareSound();
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    });
}

// ─── Export Blog Card Renderer ───
ThemeInit.exportBlogRenderer((article, index) => {
    return CardRenderer.renderBlogCard(article, index, terminalThemeConfig.blogCards);
});

// ─── Initialize Theme ───
ThemeInit.whenReady(() => {
    console.log('%c[SYSTEM] DOM Ready - Initializing Terminal modules...', 'color: #ffb000;');
    ThemeInit.init(terminalThemeConfig);
});
