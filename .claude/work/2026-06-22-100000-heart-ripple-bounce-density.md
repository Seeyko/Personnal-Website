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

## Notes
- No GPU in sandbox -> WebGL not visually verifiable here; spring constants &
  burst magnitude likely want a quick local tune.
