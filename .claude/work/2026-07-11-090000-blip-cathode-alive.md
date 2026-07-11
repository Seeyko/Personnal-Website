# Blip mobile + Cathode alive (post-merge fixes & upgrades)

**Status**: completed (round 2: gyroscope physics + Blip×Cathode scenes + screen break/repair)
**Branch**: `claude/affectionate-wozniak-nqo7si` (PR #63)
**Started**: 2026-07-11 09:00

## Round 2 additions
- Gyroscope (phones, pointer:coarse only; iOS permission on first touch):
  in-plane gravity vector from beta/gamma (+screen-rotation correction).
  Mild felt slope (>8°) = lean + slide with scramble feet; steep (>30°) =
  full 2D tumble: she rolls (angular velocity from wall contact), bounces
  off all four viewport walls (squash + dust), settles wherever gravity
  points - flip the phone and she falls to the ceiling and rests there
  (rot 180°). Settling = dizzy mimique (half eyes + wavy mouth + wobble +
  orbiting stars) + themed line (dizzy/flipped variants). devicemotion
  shakes kick her; shaking mid-tumble pumps energy in.
- Screen break: ≥2 brutal impacts (>820 px/s) in one tumble session may
  crack the screen (overlay SVG on the tube area, kit SVG untouched) →
  dim flicker + red LED + garbled SOS lines. Blip repairs: auto-summoned
  on touch devices (spring target override), or when the visitor brings
  the cursor close on desktop. Repair scene: waves, sparks, flash back
  on, happy face, hearts, thank-you line, twirl.
- Meet scenes when Blip lingers near her (~350ms within 96px, 16s+
  cooldown): check (wave + star burst + spin), hug (heart screen + pixel
  hearts + Blip blush), talk (themed meet line + Blip listens/laughs),
  dance (synchronized twirls + stars). Scene steps carry a token and
  re-validate Blip proximity - graceful aborts.
- BlipCursor public API: getPosition(), react(whitelist), summon(x,y)
  (touch mode only). bc-twirl one-shot added below the kit marker.
- Bubble now opens downward when she's high up (cg-bub-below).
- FX layer (#cathode-fx): pixel hearts/stars/dust/sparks, fire-and-forget.

## Task
Follow-up on the merged Blip/Cathode MR:
1. Blip never visible on mobile → touch companion mode (pops above each tap,
   follows drags, dozes then fades; native cursor untouched).
2. Cursor reported unchanged on themes → removed the >=900px desktop gate
   (half-screen windows silently kept the legacy theme cursor); Blip now runs
   on any fine-pointer viewport. If it still looks stale in prod, it's browser
   cache — files are fine.
3. Cathode overlapped by scanlines/clippy/sparkles (z 9500 vs 9998-99999) →
   z-index 2147483000, above everything except the Blip cursor. Also visible
   below 380px now (shrinks instead of display:none).
4. Bubble style + dialogue per theme: terminal window / atelier card /
   blueprint annotation (handwritten) / Win95 comic box, with per-theme
   i18n texts (`cathodeGuide.themes.*`) + per-theme bar titles + quips.
   Proportional-font themes use fade-in lines (ch-typing is mono-only).
5. Life engine: walks the viewport floor (fixed bottom), waddle bob, flips
   facing (--cg-dir), spins, hops; after ~9s without scrolling she climbs
   visible cards (they squish via .cg-perch-squish/.cg-perch-release), uses
   timeline commit markers as stepping stones, quips in-theme, rides moving
   perches, hops down the instant the page scrolls. Bubble flips side based
   on her position. Retro90s status bar raises her floor. Reduced motion =
   static dock (engine off). Power-off click still works (drops to floor,
   sags, stops wandering); footer toggle revives.

## Files Modified
- frontend/js/core/effects/blip-cursor.js (touch mode, gate rework)
- frontend/css/blip-cursor.css (touch visibility rules)
- frontend/js/core/effects/cathode-guide.js (life engine, themed bubbles)
- frontend/css/cathode-guide.css (z-index, life CSS, per-theme skins — all
  below the vendor-kit marker)
- frontend/i18n/locales/fr.json, en.json (themed dialogue + quips)

## Verification (Playwright/Chromium, local server)
- 4 themes × desktop: alive, z=2147483000, themed bar/text/font/paper,
  walk/spin/jump/landing observed, bubble side-flip works.
- Idle adventure: perched on .project-card after ~10s, squish classes fire,
  in-theme quip shown, hops between perches, returns to floor on scroll.
- Mobile (touch): Blip pops at tap point (no cursor hijack), Cathode alive.
- Reduced motion: engine off, static dock 20/20, no Blip.
- Narrow desktop 820px: Blip cursor takes over (old bug fixed).

## Notes/Discoveries
- data/projects.json moved to data/{lang}/projects.json (CLAUDE.md is stale).
- "[ERR] API unavailable" in console = articles backend (localhost:3000),
  pre-existing, unrelated.
