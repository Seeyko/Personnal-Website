# Theme-specific footer illustrations

**Status**: completed
**Branch**: `feature/themed-landscape-footer`
**Started**: 2026-09-30

## Task
Replace recoloring filters with four independently generated theme illustrations.
Keep the supplied natural artwork for the default theme and preserve transparent
sky, bottom layering, responsive layout and reduced-motion behavior.

## Files Being Modified
- `frontend/assets/footer/`
- `frontend/index.html`
- `frontend/css/footer-landscape.css`
- `frontend/js/components/footer-landscape.js`

## Progress
- [x] Inspect source composition and theme directions
- [x] Generate four transparent illustrations, then push their artistic directions further
- [x] Select the active theme asset without recoloring filters
- [x] Browser verification and updated screenshots
- [x] Prepare PR #95 update and same private preview for publication

## Notes
- Blueprint uses architectural cutaways, cotations, botanical sections and
  survey contours rather than a cyanotype treatment of the painted source.
- Each page downloads only its active theme artwork, shared by both layers.
  Browser checks include actual theme switching at the footer, filter-free
  ancestors, attribute-driven artwork changes and reduced motion.
- The default artwork keeps its original colors. Separate 1942 × 809 natural
  transparent and magenta PNGs were generated for Higgsfield (ratio 2.4005).
- Test-only Three.js remains the identical pinned version, served locally to
  avoid the environment proxy certificate. Production loading is unchanged.
