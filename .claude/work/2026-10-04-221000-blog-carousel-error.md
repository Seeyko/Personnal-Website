# Blog: `Carousel is not defined`

**Status**: completed
**Branch**: `claude/youthful-davinci-yvb74v`
**Started**: 2026-10-04 22:10

## Task
`/blog` (and `/blog/<slug>`, and the admin page) logged `[THEME] Failed: ReferenceError: Carousel is not defined`
in every theme: `ThemeInit.init` called `Carousel.initAll()` unconditionally, but blog.html, its SSR twin
(`backend/handlers/templates/blog.html`) and admin.html don't load `carousel.js` (nor `scroll-effects.js`,
`cursor-tracker.js`, `konami.js`). The throw aborted the rest of `init`.

## Files Being Modified
- frontend/js/core/theme-init.js
- frontend/themes/fps/fps.js (comment only)
- frontend/js/theme-manager.js (ASSET_VERSION bump)
- frontend/index.html, frontend/blog.html, frontend/admin.html, backend/handlers/templates/blog.html (`?v=` keys)

## Progress
- [x] Guard the homepage-only modules (Carousel, ScrollEffects, CursorTracker, KonamiCode) in ThemeInit
- [x] Keep theme effects (`config.initEffects`) homepage-only so the blog/admin look is unchanged
- [x] Only fetch the 3-article preview when `#blog-grid` exists (it exists on no page today)
- [x] Bump / add `?v=` cache keys for theme-init.js and theme-manager.js; bump ASSET_VERSION
- [x] Playwright: blog, article, admin and home in all 5 themes, 0 page errors

## Notes/Discoveries
- Once ThemeInit stopped throwing, `initEffects` ran on the blog and admin pages: fps injected its whole HUD
  (rail, radar, scoreboard, killfeed), retro90s its assistant + status bar, terminal the enderman. The blog was
  designed as a CSS-only surface for every theme (see d5379de), so effects are now gated on `#work-grid`
  (homepage only). Dropping that gate is a one-line change if the blog should get theme effects.
- The header-scroll preset now runs on the blog/admin (header-scroll.js was already loaded there for it).
- Production `/blog/*` is served by the Go SSR template, so changes to blog.html script tags must be mirrored there.
