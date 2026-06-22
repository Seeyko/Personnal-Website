# Heart: less dense, slower/bouncier hover, distinct click ripple + bigger explosion

**Status**: completed
**Branch**: `claude/fervent-heisenberg-o9f9t9`
**Started**: 2026-06-22 10:00

## Task (FR follow-up)
1. Too dense -> space out / fewer points.
2. Slower hover; leaving the heart should bounce like a click/release; overall
   animation smoother, slower, more satisfying.
3. Click should fire a ripple + an even BIGGER explosion (currently click == hover).

## Files Being Modified
- frontend/js/heart-home.js

## Plan
- Density: RESOLUTION 38/48 -> 30/40 (fewer surface points, same point size = more spacing).
- Hover spring slower + bouncy: STR_STIFF 0.045->0.022, STR_DAMP 0.16->0.11.
- New CLICK channel (separate from hover):
  - uBurst spring: pops to BURST_PEAK on pointerdown, springs back to 0 with a bounce.
  - global radial burst biased toward the click point (bigger than the localized hover bloom).
  - uClickPos + uBurstTime drive a ripple ring expanding outward, fading as it travels.
- IDLE_SPIN 0.0026 -> 0.0018 for a more languid base motion.
- Keep mouse hover bloom alive after a click-release (hovering stays true for mouse).

## Progress
- [x] Implement
- [x] node --check (passes)
- [x] Commit + push + PR

## Follow-up 2 (screenshot feedback: crop ugly on click, hover-out snaps, all too fast)
User chose "les 3": fade + stylish box + smaller explosion. Implemented together:
- Box: canvas wrapped in `.heart-stage` (centred ~620px case) with a theme-aware
  frame (glass case / terminal CRT bezel / blueprint ticks / retro90s Win95 window).
  index.html + base.css.
- Edge fade: shader fades particle alpha in the outer ~14% of the box (vNdc), so an
  overflowing bloom dissolves instead of hard-clipping into a rectangle.
- Smaller explosion: scatter 2.4-3.6 -> 0.55-0.85, BURST_PEAK 0.85 -> 0.6,
  uPush 0.35 -> 0.12, ripple amp 0.5 -> 0.28.
- Hover-out snap fixed: hover bloom is now GLOBAL (whole heart) instead of cursor-
  localised; with the snug box, leaving it = pointerleave = a slow bouncy return.
- ~3.5x slower everywhere: STR spring 0.022/0.11 -> 0.0018/0.03, BURST 0.05/0.12 ->
  0.004/0.035, idle spin 0.0018 -> 0.0008, shimmer 7->1.8, swirl/ripple speeds down.
- HEART_FILL 0.8 gives the bloom room inside the box (heart not shrunk noticeably;
  the frame makes the margin read as intentional).

## Follow-up 3 (FR feedback: preferred TARGETED hover; idle bounce too harsh; hover->click cut)
1. Revert hover to cursor-localised (was made global in follow-up 2):
   `hov = smoothstep(uRadius,0,d) * uStrength` again — bloom follows the cursor.
2. Softer idle-return bounce: STR_DAMP 0.03 -> 0.05 (overshoot -0.30 -> -0.10,
   a gentle bounce instead of a big one).
3. Smooth hover<->click (no "cut"): the press no longer SNAPS uBurst to its peak.
   Instead it kicks the burst spring with a velocity impulse (BURST_KICK=0.095,
   BURST_STIFF 0.004->0.011, BURST_DAMP 0.035->0.055), so the explosion grows
   continuously out of the hover bloom (peak ~0.6 @ ~0.2s) then recoils & settles.
   Burst stays centred on the cursor (uClickPos = uPointer), so it erupts from the
   same spot the hover bloom was lifting.

## Notes
- No GPU/browser in remote sandbox -> WebGL + the 4 themed frames NOT visually
  verified here. Frame styles, HEART_FILL, edge-fade band (0.86) and spring
  constants likely want a quick local pass across all themes + mobile.
- Spring constants tuned via a small offline damped-oscillator simulation (peak,
  overshoot, settle time) since the feel can't be eyeballed here.
