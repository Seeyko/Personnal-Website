/**
 * Language Switcher UI - Dropdown to switch languages
 *
 * The chip only mirrors LanguageManager, the one place that decides the page
 * language. It used to re-detect on its own and fall back to 'fr' when it ran
 * before LanguageManager.init() had finished, so an English browser got
 * English content under an "FR" chip.
 */

const LanguageSwitcher = (() => {
    let container = null;
    let listening = false;

    function render(lang) {
        if (!container || !lang) return;
        container.querySelector('.lang-current').textContent = lang.toUpperCase();
        container.querySelectorAll('.language-option').forEach(o =>
            o.classList.toggle('active', o.dataset.lang === lang)
        );
    }

    function create() {
        container = document.getElementById('language-switcher');
        if (container) return;

        container = document.createElement('div');
        container.id = 'language-switcher';
        container.className = 'language-switcher';
        container.innerHTML = `
            <button class="language-switcher-toggle" aria-label="Switch language">
                <span class="lang-current"></span>
                <span class="lang-arrow">&#9662;</span>
            </button>
            <div class="language-switcher-menu">
                ${LanguageManager.SUPPORTED_LANGS.map(l => `
                    <button class="language-option" data-lang="${l}">
                        <span class="lang-flag">${l.toUpperCase()}</span>
                        <span class="lang-name">${LanguageManager.getLanguageName(l)}</span>
                    </button>
                `).join('')}
            </div>
        `;

        const toggle = container.querySelector('.language-switcher-toggle');
        const menu = container.querySelector('.language-switcher-menu');

        toggle.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });

        container.querySelectorAll('.language-option').forEach(opt => {
            opt.addEventListener('click', async e => {
                e.stopPropagation();
                const code = opt.dataset.lang;
                render(code);
                menu.classList.remove('open');
                await LanguageManager.setLanguage(code);
                window.location.reload();
            });
        });

        document.addEventListener('click', () => menu.classList.remove('open'));

        // Insert into header-right container after theme switcher
        const target = document.querySelector('.header-right') || document.querySelector('.header');
        target ? target.appendChild(container) : document.body.appendChild(container);
    }

    // Safe to call more than once (auto-init below, then ThemeInit).
    function init() {
        if (!window.LanguageManager) return;
        create();
        render(LanguageManager.currentLang);
        if (listening) return;
        listening = true;
        LanguageManager.ready.then(render);
        window.addEventListener('languageChanged', () => render(LanguageManager.currentLang));
    }

    return { init };
})();

window.LanguageSwitcher = LanguageSwitcher;

// Auto-initialize on DOMContentLoaded
document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', LanguageSwitcher.init)
    : LanguageSwitcher.init();
