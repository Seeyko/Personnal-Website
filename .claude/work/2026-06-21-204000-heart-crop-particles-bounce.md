# Heart: no crop, fewer/bigger particles, bouncy hover reconstruction

**Status**: completed
**Branch**: `claude/loving-heisenberg-ajx9vu`
**Started**: 2026-06-21 20:40

## Task (follow-up)
1. Heart is cropped at the top -> give it full space, overflow at worst is fine.
2. Fewer but bigger particles (can't tell they're hearts otherwise).
3. On hover it should stay destructured and reconstruct slower + bouncy
   (not snap back immediately).

## Files Modified
- frontend/js/heart-home.js

## Changes
- Crop fix: frameHeart() now fits the heart perspective-correctly — it solves
  the scale at the heart's NEAREST face (camZ - span*s/2, where perspective
  magnifies most), per axis, using max(width,depth) as the spin span. F=0.96.
  No more top-lobe clipping at rest, on any aspect ratio. camZ 4.4 -> 4.8.
- Fewer/bigger particles: RESOLUTION 64/84 -> 38/48; per-theme sizes bumped
  (~0.12-0.18) so the heart/square/cross/star shapes actually read.
- Hover/bloom is now a spring (STIFF 0.045, DAMP 0.16, ~0.5s, ~28% overshoot):
  holds at full while the pointer is over the heart (pointerenter/leave), then
  reconstructs slowly with a bouncy inward overshoot when the pointer leaves.
  Guarded pow(max(infl,0),1.6) in the vertex shader since infl now dips < 0
  during the bounce.

## Verification
- node --check passes.
- No browser/GPU in remote sandbox -> NOT visually verified. Particle sizes,
  the spring feel (STIFF/DAMP), and F=0.96 fill likely want a quick local tune.
