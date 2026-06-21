# Heart: bigger, per-theme particle types, mobile centering, caption em dash

**Status**: completed
**Branch**: `claude/loving-heisenberg-ajx9vu`
**Started**: 2026-06-21 20:15

## Task (follow-up to PR #53, now merged)
1. Make the heart bigger.
2. Different particle "types" per theme.
3. Make sure on mobile it's centered at the right spot.
4. Remove the em dash in the caption.

## Files Modified
- frontend/js/heart-home.js (adaptive sizing, new particle shapes, per-theme types/sizes)
- frontend/css/base.css (taller section for the bigger heart)
- frontend/index.html (caption em dash -> comma)

## Changes
- Adaptive framing: heart scaled to a fixed fraction of the visible frustum
  (0.92 of height OR 0.96 of width, whichever fits) computed from the geometry
  bounding box + camera FOV, recomputed on resize. Bigger AND fits/centers on
  any aspect (wide desktop + tall phone) -> fixes mobile + "plus gros".
- Section height clamp 340/56vh/560 -> 380/64vh/640 for more presence.
- New particle shapes added to fragment shader: triangle(6), heart(7).
- Per-theme types now: default=heart, terminal=square, blueprint=cross,
  retro90s=star. Sizes nudged up so shapes read in the halftone cloud.
- Caption "Built with heart — touch it." -> "Built with heart, touch it."

## Verification
- node --check passes.
- No browser/GPU in remote sandbox -> WebGL NOT visually verified. Particle
  sizes + heart fill fractions likely want a quick local visual pass on all
  themes + mobile widths before/after merge.
