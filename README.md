# tomandrieu.com

Personal portfolio website with multi-theme support, internationalization, and a Go backend for blog content.

**Live:** [tomandrieu.com](https://tomandrieu.com)

## Features

- **4 Switchable Themes** - Default, Terminal (cyber-hacker), Blueprint (technical drawing), Retro 90s (GeoCities nostalgia)
- **Bilingual** - English and French with theme-specific translations
- **Responsive Design** - Mobile-first with touch-friendly interactions
- **Scroll Animations** - GSAP + ScrollTrigger effects
- **Git Timeline** - Interactive career/project history visualization
- **Blog System** - Go backend serving Markdown articles
- **CRO Elements** - Exit modals, floating CTAs, availability badges

## Quick Start

### Frontend Only (Recommended for Development)

```bash
cd frontend

# Pick one:
python -m http.server 8000
npx serve .
php -S localhost:8000
```

Open [http://localhost:8000](http://localhost:8000)

### Full Stack with Docker

```bash
docker-compose -f docker-compose.local.yml up
```

- Frontend: [http://localhost:8000](http://localhost:8000)
- API: [http://localhost:3000](http://localhost:3000)

## Project Structure

```
tomandrieu.com/
├── frontend/               # Static frontend (no build required)
│   ├── index.html          # Main SPA entry
│   ├── blog.html           # Blog page
│   ├── css/
│   │   ├── base.css        # Reset, typography, shared styles
│   │   └── components/     # Buttons, cards, carousel styles
│   ├── js/
│   │   ├── core/           # Content loader, carousel, scroll effects
│   │   ├── components/     # Header, etc.
│   │   ├── theme-manager.js
│   │   ├── git-timeline.js
│   │   └── analytics.js
│   ├── themes/             # Theme-specific CSS + JS
│   │   ├── default/
│   │   ├── terminal/
│   │   ├── blueprint/
│   │   └── retro90s/
│   ├── data/               # Content JSON files (en/fr)
│   ├── i18n/               # Translation files
│   └── assets/             # Images, videos
├── backend/                # Go REST API
│   ├── main.go
│   ├── handlers/
│   ├── models/
│   └── services/
├── blog/                   # Markdown articles
│   └── articles/
├── nginx/                  # Web server config
├── docker-compose.yml      # Production
└── docker-compose.local.yml # Local dev
```

## Theme System

Switch themes via URL parameter or the floating theme button:

| Theme | URL | Description |
|-------|-----|-------------|
| Default | `?theme=default` | Clean, minimal professional |
| Terminal | `?theme=terminal` | Green CRT, ASCII art, typewriter |
| Blueprint | `?theme=blueprint` | Technical drawings, SVG animations |
| Retro 90s | `?theme=retro90s` | GeoCities, marquees, hit counters |

### Adding a New Theme

1. Create `frontend/themes/{theme-name}/` with:
   - `{theme-name}.css` - Theme styles
   - `{theme-name}.js` - Theme initialization + card renderer
2. Register in `frontend/js/theme-manager.js` → `ThemeManager.THEMES`
3. Add i18n files: `frontend/i18n/themes/{theme-name}/en.json` and `fr.json`
4. Theme-specific HTML in `index.html` is hidden by default; show via CSS

## Data Files

All content is driven by JSON files in `/frontend/data/{lang}/`:

| File | Purpose |
|------|---------|
| `content.json` | Hero text, about section, tech stack, contact info |
| `projects.json` | Portfolio projects (title, description, images, tags) |
| `git-history.json` | Timeline entries (education, freelance, projects) |

To update content, edit the JSON files - no code changes needed.

## Internationalization (i18n)

**Supported Languages:** English (`en`), French (`fr`)

**Detection Priority:**
1. URL parameter (`?lang=en`)
2. localStorage
3. Browser language
4. Default: French

**Files:**
- Base translations: `frontend/i18n/locales/{lang}.json`
- Theme-specific: `frontend/i18n/themes/{theme}/{lang}.json`

## Backend API

Go 1.21 with Chi router.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/articles` | List all blog articles |
| GET | `/articles/{id}` | Get article by ID |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ARTICLES_DIR` | `./blog/articles` | Markdown articles path |
| `FRONTEND_URL` | `http://localhost:8000` | CORS allowed origin |

### Running Backend Locally

```bash
cd backend
go run main.go
```

## Deployment

### Production (Docker + Traefik)

```bash
docker-compose up -d
```

Routes via Traefik:
- `tomandrieu.com` → Frontend (nginx:4200)
- `api.tomandrieu.com` → Backend (go:3000)

SSL handled by Let's Encrypt via Traefik.

### Environment Config

- Local: `frontend/config.js`
- Production: Generated from `frontend/config.template.js` via envsubst

## Development Guidelines

### Testing Changes

**Always test in browser before committing:**

1. Start local server
2. Check all themes if theme-related: `?theme=terminal`, `?theme=blueprint`, `?theme=retro90s`
3. Test both languages: `?lang=en`, `?lang=fr`
4. Check browser console for errors
5. Test on mobile viewport

### Git Workflow

- **Never push directly to `main`** (production branch)
- Create feature branches: `feature/`, `fix/`, `refactor/`
- Use pull requests for all changes

### Commit Messages

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code improvements
- `docs:` Documentation
- `style:` Formatting, CSS

## For LLMs / AI Agents

### Key Entry Points

1. **Theme Manager:** `frontend/js/theme-manager.js` - Controls theme switching
2. **Content Loader:** `frontend/js/core/content-loader.js` - Populates DOM from JSON
3. **Card Renderer:** `frontend/js/core/card-renderer.js` - Project card rendering
4. **Main HTML:** `frontend/index.html` - All sections, theme elements

### Content Binding

Elements use `data-content` attributes for dynamic content:

```html
<h1 data-content="hero.title"></h1>
<!-- Populated from content.json: { "hero": { "title": "..." } } -->
```

### Theme Initialization Flow

1. `theme-manager.js` detects theme from URL/localStorage
2. Loads theme CSS dynamically
3. Loads theme JS which calls:
   - `PortfolioBase.initBase()` - Initialize shared functionality
   - `PortfolioBase.loadProjects()` - Load and render projects
4. Theme JS provides custom `renderCard()` function

### Adding Features

- **New section:** Add HTML in `index.html`, data in `content.json`, styles in `base.css` or theme CSS
- **New project:** Add entry to `projects.json` with images in `assets/`
- **New translation:** Add keys to all locale files in `i18n/`

### Work Coordination

When multiple agents work on this project:
1. Check `/.claude/work/` for in-progress work
2. Create your own work file: `{timestamp}-{description}.md`
3. Update status as you progress
4. Push regularly to avoid conflicts

## Tech Stack

**Frontend:**
- Vanilla JS (ES modules)
- GSAP + ScrollTrigger
- CSS custom properties
- No build required (Vite available for optimization)

**Backend:**
- Go 1.21
- Chi router
- Markdown processing

**Infrastructure:**
- Docker + Docker Compose
- Nginx (static serving)
- Traefik (reverse proxy, SSL)

## License

Private repository - All rights reserved.

---

**Questions?** Open an issue or contact via the website.
