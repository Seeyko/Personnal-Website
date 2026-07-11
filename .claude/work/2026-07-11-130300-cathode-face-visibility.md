# Cathode face invisible on non-terminal themes

**Status**: completed
**Branch**: `claude/cathode-expressions-visibility-8ax2a8`
**Started**: 2026-07-11 13:03

## Task
Cathode's face + expression animations are invisible ("black on black") on
every theme except terminal. Only terminal shows her face/expressions.

## Root cause
The CRT screen (face + all idle expressions) is drawn with `fill="currentColor"`,
coloured by the kit rule `#cathode-guide .cg-scr { color: var(--cg-ink) }`.
But the per-theme *bubble skin* blocks re-theme `--cg-ink` for the speech
bubble, and that same var also drives the screen phosphor:
- terminal  `--cg-ink:#33ff00` green  -> face visible
- default   `--cg-ink:#2c2825` dark   -> face dark-on-dark
- retro90s  `--cg-ink:#111111` dark   -> face dark-on-dark
- blueprint `--cg-ink:#dcf3ff` pale   -> dim
The sprite is meant to be the mascot's constant (see CSS comment ~L657-664);
only the bubble should reskin. Screen phosphor must be decoupled from bubble ink.

## Files Being Modified
- frontend/css/cathode-guide.css

## Progress
- [x] Locate cause (cg-scr color tied to themed --cg-ink)
- [x] Add site-integration rule locking screen phosphor to bright green
- [x] Verify each theme in browser (computed color + screenshot)
      -> all 4 themes: .cg-scr color = rgb(51,255,0), face opacity 1,
         screenshots confirm visible green eyes/mouth on default+retro90s
- [x] Commit + push

## Notes/Discoveries
- Fix lives in the site-integration section (below the kit marker), no kit edit.
- New rule: `#cathode-guide .cg-scr { color: var(--cg-phosphor, #33ff00); }`
  wins over kit L23 by source order (same specificity); `--cg-phosphor` is a
  hook for future per-theme tinting but defaults to the constant CRT green.
