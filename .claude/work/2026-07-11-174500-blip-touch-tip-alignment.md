# Blip touch mode: tip lands exactly on tap point

**Status**: completed
**Branch**: `claude/blip-cursor-alignment-puero2`
**Started**: 2026-07-11 17:45

## Task
On touch devices Blip appeared offset from the tap point (+10px right, -34px up).
User wants the cursor tip (Blip's top-left hotspot) exactly on the tap point,
like a real cursor.

## Files Being Modified
- frontend/js/core/effects/blip-cursor.js
- frontend/css/blip-cursor.css (comment only)

## Progress
- [x] Remove TOUCH_OFFSET_X / TOUCH_OFFSET_Y, target raw clientX/clientY in touch mode
- [x] Update comments (JS header, onTouchPoint, CSS touch-companion note)
- [x] Verified with Playwright iPhone 13 emulation: hotspot settles at exactly
      the tap coordinates, screenshot confirms tip-on-dot alignment

## Notes/Discoveries
- The hotspot contract (SVG shifted by (-6s,-3s)) already makes the root origin
  the cursor tip, so touch mode just needed the same raw coordinates cursor
  mode uses. No CSS change required.
