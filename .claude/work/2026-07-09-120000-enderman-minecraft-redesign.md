# Enderman Minecraft Redesign

**Status**: completed
**Branch**: `claude/enderman-design-minecraft-hgljf7`
**Started**: 2026-07-09 12:00

## Task
Redesign the hidden Enderman easter egg (terminal theme, bottom-left) to look
much closer to an actual Minecraft Enderman: authentic pixel-art proportions
(tall/thin, long arms & legs, square head), magenta glowing eyes, ender
particles, carried grass block.

## Files Being Modified
- frontend/themes/terminal/terminal.js
- frontend/themes/terminal/terminal.css

## Progress
- [x] Locate existing easter egg code
- [x] Gather visual references (official model: head 8x8, body 8x12, limbs 2x30;
      eyes 3x2 each with 2px gap; eye palette #ed8cff/#cb59ff/#aa1bab)
- [x] Implement pixel-art enderman (JS pixel map → inline SVG rects)
- [x] Browser test (Playwright screenshots: hidden eyes, hover trigger,
      appear/tremble/particles, teleport, no new console errors)
- [x] Commit & push

## Notes/Discoveries
- Easter egg lives in `createEndermanElement()` in terminal.js + CSS section
  "Enderman Easter Egg" in terminal.css. `window.enderman()` console command
  reuses the same element.
- `.enderman-ascii` class renamed to `.enderman-pixel`; the pixel map lives in
  `ENDERMAN_PIXELS` (12x50 char grid) and is rendered by `buildPixelSvg()`,
  which merges horizontal runs into single SVG rects.
- Theme switching reloads the page, so the DOM elements can't leak into other
  themes.
