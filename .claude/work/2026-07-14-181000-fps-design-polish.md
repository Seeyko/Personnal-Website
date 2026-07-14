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

## Pass 2 — per-section subagent audit (8 agents, ~30 findings)
- [x] Header: badge resized to 30px chip height, even control spacing, right gutter,
      near-opaque dropdown menus, no double-indent ≤768, lang menu overhang, nowrap options
- [x] Ribbon: hint span hidden ≤640 (clipped mid-word on mobile)
- [x] Hero: CTA stack breakpoint 560→640 (FR labels collided 561-625px), title text-wrap balance
- [x] NOW: section numbers baseline-aligned, paragraph capped 75ch, EN " : " typo fixed
- [x] WORK: tag rows anchored to tile bottom (were ~18px misaligned per row),
      no doubled hairline at buy-bar/grid junction
- [x] ABOUT: spec keys fixed 7rem column (values were ragged ±40px), paragraph rhythm evened,
      /* code comments */ un-hidden
- [x] CONTACT/footer: email promoted to 1.2rem, orphaned trailing "|" hidden,
      mobile padding-bottom 112px (rail clipped the cathode toggle)
- [x] HUD: base.css section styles reset on #fps-side panels (title bars now cap edge-to-edge,
      panels aligned), mobile rail active underline (specificity fix), rail hugs telemetry (29px),
      telemetry units glued to values
- [x] Timeline: overlay opaque + on-grid + max-height (spilled 116px onto CONTACT), overlay
      type-border regex fix (shared JS), per-lane two-pass label sweep (shared JS — "Lead
      Front-End" was buried), unconditional right-edge clamp (graph overflowed 20px at 1200),
      NOW badge + hover glows retinted, tablet mobile-list on grid, empty hash slot collapsed
- [x] Re-verified fps at 1440/1200/900/620/390 + terminal/blueprint/default regression pass

## Notes/Discoveries
- The timeline JS (git-timeline.js) stamps hardcoded colors as inline
  `--branch-color` on commit markers; themes must override per-type classes
  (.git-commit-*, .mobile-commit-*) with !important to retint them.
- index.html section numbers are out of document order (ABOUT=04 sits before
  HISTORY=03). fps renumbers via CSS counter; other themes keep them hidden.
- The "dark background" seen in raw screenshots is a rendering illusion; the
  field is rgb(201,210,217) everywhere (pixel-sampled).
