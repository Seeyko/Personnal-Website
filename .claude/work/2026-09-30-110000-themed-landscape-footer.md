# Themed landscape footer

**Status**: completed
**Branch**: `feature/themed-landscape-footer`
**Started**: 2026-09-30

## Task
Integrate the supplied Mediterranean family illustration into the bottom of the homepage, with transparent sky, layered blending and a treatment for all five themes.

## Files Being Modified
- `frontend/index.html`
- `frontend/css/footer-landscape.css`
- `frontend/js/components/footer-landscape.js`
- `frontend/assets/footer/`
- `frontend/i18n/locales/{fr,en}.json`
- `frontend/themes/blueprint/blueprint.js` (skip non-rendered SVG geometry on mobile)

## Progress
- [x] Inspect themes, branding and source illustration
- [x] Extract sky with imagegen and optimize transparent WebP
- [x] Integrate themed scene and footer layout
- [x] Browser verification: five themes, both languages, desktop/mobile, reduced motion
- [x] Verify 320px width, real theme switching with restored scroll, and one cached image request
- [x] Prepare feature branch for PR

## Notes
- Follow-up replaces the initial CSS/SVG color palettes with four independently
  generated illustrations. See `2026-09-30-135500-footer-theme-artwork.md`.
- A pre-existing Blueprint mobile boot error was reproduced against the original
  homepage: `getTotalLength()` threw on hidden SVG geometry. Skip non-rendered
  geometry to allow the theme to initialize normally.
- Tests serve the existing pinned Three.js dependency locally because the
  container's proxy certificate is not trusted by Chrome. No production
  dependency or loader changes were made.
