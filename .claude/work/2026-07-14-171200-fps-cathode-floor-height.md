# FPS theme: Cathode floor height fix

**Status**: completed
**Branch**: `claude/cathode-fps-arena-height-nx0isu`
**Started**: 2026-07-14 17:12

## Task
Cathode (the CRT mascot) sat visibly higher on the FPS arena theme than on
every other theme, so her jumps/climbs also landed higher — reported by the
user as "Cathode sur le theme FPS arena est + haut que sur les autres theme
et du coup quand il saute quelque part il est + haut aussi".

## Files Being Modified
- frontend/themes/fps/fps.css
- frontend/js/core/effects/cathode-guide.js

## Progress
- [x] Found root cause: `fps.css` unconditionally set `#cathode-guide { bottom: 64px }`
      on desktop, fighting the life engine's `bottom:0` + JS-transform positioning
      (the same system that already handles retro90s's fixed status bar via
      `probeFloor()`). The JS still computed positions assuming a plain 20px
      floor, so the CSS silently added an *extra* 64px on top.
- [x] Scoped the CSS override to `:not(.cg-alive)` (static dock fallback only:
      reduced motion / pre-mount).
- [x] Extended `probeFloor()` to also read `#fps-telemetry`'s real height
      (mirrors the existing `.retro-status-bar` handling), so the life engine
      clears the fps telemetry bar by exactly its height + 6px buffer instead
      of a flat 64px guess.
- [x] Verified via Playwright screenshots + DOM measurements: fps floor gap is
      now 37px (telemetry bar height + 6) vs. the old 84px (64 + 20), while
      terminal/blueprint/retro90s/default are byte-for-byte unchanged.

## Notes/Discoveries
- No other theme had this bug — retro90s already used the correct
  `probeFloor()` pattern instead of a CSS `bottom` override.
