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
    '#': '#1a1a1f', // skin base
    '+': '#26262e', // skin highlight
    '-': '#101014', // skin shadow
    'E': '#ed8cff', // eye bright
    'P': '#cb59ff', // eye mid
    'M': '#aa1bab', // eye dark
    'G': '#6fae43', // grass bright
    'g': '#578b34', // grass dark
    'D': '#8a5f42', // dirt light
    'd': '#714b33', // dirt mid
    'b': '#573a27'  // dirt dark
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
    '##.GgGGgG.##', // carried grass block (rows 26-31)
    '##.gDggDg.##',
    '##.DdDDbD.##',
    '#+.dDbdDd.##',
    '##.DbDdbD.##',
    '##.bddDdb.##',
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
// pixels into single rects. Layers split eyes/block from skin so they
// can be styled (glow) independently.
function buildPixelSvg(pixels, colors) {
    const layers = { skin: [], eyes: [], block: [] };
    const layerOf = (ch) => 'EPM'.includes(ch) ? 'eyes' : 'GgDdb'.includes(ch) ? 'block' : 'skin';

    pixels.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const ch = row[x];
            if (!colors[ch]) { x++; continue; }
            let w = 1;
            while (x + w < row.length && row[x + w] === ch) w++;
            layers[layerOf(ch)].push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${colors[ch]}"/>`);
            x += w;
        }
    });

    const height = pixels.length;
    const width = pixels[0].length;
    return `<svg viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true">` +
        `<g class="edm-skin">${layers.skin.join('')}</g>` +
        `<g class="edm-block">${layers.block.join('')}</g>` +
        `<g class="edm-eyes">${layers.eyes.join('')}</g>` +
        `</svg>`;
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
    if (endermanEl) {
        endermanEl.classList.add('visible');
        setTimeout(() => {
            endermanEl.classList.add('teleport');
            setTimeout(() => {
                endermanEl.classList.remove('visible', 'teleport');
            }, 500);
        }, 3000);
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
        `<div class="edm-particles">${particles}</div>`;
    document.body.appendChild(enderman);

    let hoverTimer = null;

    eyes.addEventListener('mouseenter', () => {
        eyes.classList.add('watching');
        hoverTimer = setTimeout(() => {
            eyes.classList.add('triggered');
            enderman.classList.add('visible');
            console.log('%c[ENTITY] You looked at it for too long...', 'color: #ff00ff;');

            setTimeout(() => {
                enderman.classList.add('teleport');
                setTimeout(() => {
                    enderman.classList.remove('visible', 'teleport');
                    eyes.classList.remove('triggered');
                }, 500);
            }, 3000);
        }, 2000);
    });

    eyes.addEventListener('mouseleave', () => {
        eyes.classList.remove('watching');
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
