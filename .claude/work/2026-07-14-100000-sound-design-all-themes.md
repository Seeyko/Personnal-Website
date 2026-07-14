# Sound Design for All Themes

**Status**: completed
**Branch**: `claude/sound-design-themes-f3xj6s`
**Started**: 2026-07-14 10:00

## Task
Extend the terminal theme's synthesized sound design to every theme, each with
its own sonic palette, plus new sounds for Blip (cursor mascot), Cathode
(guide mascot) and their interactions.

Architecture:
- New shared bus `frontend/js/core/effects/sfx.js`: lazy AudioContext, global
  mute persisted in localStorage (`site-sfx`, migrates legacy `terminal-sfx`/
  `fps-sfx`), `window.sound()` console toggle, `tone`/`noise` primitives,
  per-event throttling, global interaction wiring (pointer/keys/card reveals/
  link hover). Themes register a pack via `SFX.register(themeId, handlers)`.
- `blip-cursor.js` + `cathode-guide.js` emit semantic events
  (`blip:joy`, `cathode:jump`, `cathode:crack`, `cathode:meet`, ...) through
  `SFX.play()` — no hardcoded sounds in core.
- Each theme JS registers its own themed pack:
  - terminal: existing thock/blip kept, + new Blip/Cathode cues (refactored onto bus)
  - default: soft minimal ticks
  - blueprint: drafting table (pencil scratch, paper, ruler snap)
  - retro90s: chiptune / GeoCities beeps & boings
  - fps: existing hit/hover/tab migrated onto the bus + tactical Blip/Cathode cues

## Files Being Modified
- frontend/js/core/effects/sfx.js (new)
- frontend/js/core/effects/blip-cursor.js
- frontend/js/core/effects/cathode-guide.js
- frontend/index.html (script tag)
- frontend/themes/terminal/terminal.js
- frontend/themes/default/default.js
- frontend/themes/blueprint/blueprint.js
- frontend/themes/retro90s/retro90s.js
- frontend/themes/fps/fps.js

## Progress
- [x] Explore existing sound code (terminal + fps)
- [x] Core SFX bus
- [x] Instrument blip-cursor / cathode-guide
- [x] Terminal pack (reference implementation)
- [x] Default / Blueprint / Retro90s / FPS packs (subagents)
- [x] Browser test all themes (Playwright: 5/5 load clean; every pack event
      fired on every theme with zero handler errors; mute round-trip OK)
- [x] Commit + push

## Notes/Discoveries
- `window.sound()` was defined by terminal.js AND fps.js; now owned by sfx.js
  (themes must not clobber it — fps delegates to keep its mute button in sync).
- Mute persistence key unified to `site-sfx`.
