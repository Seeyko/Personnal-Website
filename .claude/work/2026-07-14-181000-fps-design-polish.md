# FPS Theme Design Polish

**Status**: completed
**Branch**: `claude/fps-theme-design-7d16r7`
**Started**: 2026-07-14 18:10

## Task
Fix the sloppy positioning/margin/padding issues in the FPS theme reported by Tom
("il fait brouillon") and make it feel polished.

## Files Being Modified
- frontend/themes/fps/fps.css
- frontend/themes/fps/fps.js

## Progress
- [x] Audit in headless Chromium (1440 / 1200 / 390 viewports, all sections)
- [x] Align hero NEWS panel with the other content panels (was shrink-to-fit, off-grid)
- [x] Opaque boot ribbon + telemetry bar, more opaque header glass (content ghosted through)
- [x] Telemetry + rail above #main-content (plates used to scroll OVER the fixed bars)
- [x] Align right side panel top with hero panel top (92px)
- [x] Retint git timeline to fps palette incl. inline --branch-color override
- [x] Align timeline viewport with the section grid (was full-bleed, 2rem off)
- [x] Section numbers shown + CSS-counter renumbering (HTML numbers are out of DOM order)
- [x] Mobile: stack hero CTAs full-width (was staggered wrap), hide NEWS clock ≤560px
- [x] Mobile: left-align social buttons (base centers them)
- [x] NEWS clock now includes the day (YYYY-MM-DD · HH:MM:SS)
- [x] Browser re-verification: fps (3 viewports, all sections, no console errors,
      no horizontal overflow) + terminal/blueprint/retro90s/default regression pass

## Notes/Discoveries
- The timeline JS (git-timeline.js) stamps hardcoded colors as inline
  `--branch-color` on commit markers; themes must override per-type classes
  (.git-commit-*, .mobile-commit-*) with !important to retint them.
- index.html section numbers are out of document order (ABOUT=04 sits before
  HISTORY=03). fps renumbers via CSS counter; other themes keep them hidden.
- The "dark background" seen in raw screenshots is a rendering illusion; the
  field is rgb(201,210,217) everywhere (pixel-sampled).
