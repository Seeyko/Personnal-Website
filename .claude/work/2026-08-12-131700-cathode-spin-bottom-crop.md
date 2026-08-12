# Cathode: self-spin cropped at the viewport bottom

**Status**: completed
**Branch**: `cursor/fix-cathode-spin-bottom-crop-b24e`
**Started**: 2026-08-12 13:17

## Task
When Cathode does her full spin on herself (`cg-spinning` / `cg-life-spin`,
triggered by the life engine's idle beats, perch victory spins, timeline
far-bank spins, and the Blip meet/repair scenes), most of the sprite
disappears below the bottom edge of the viewport mid-turn, then pops back
as the spin completes. Reported for tomandrieu.com.

## Files Being Modified
- frontend/css/cathode-guide.css

## Progress
- [x] Found root cause: `cg-life-spin` runs on `.cg-sprite`, whose
      transform-origin is `50% 88%` (the foot-level pivot meant for the
      small standing lean). A 360° turn around a pivot ~9px above her feet
      swings up to ~75px of sprite below the pivot, but the pivot only has
      ~29px of room above the viewport bottom (20px floor gap + 9px), so
      ~46px of the sprite gets hard-clipped at the viewport edge on desktop
      (~38px mobile). `position: fixed` means no ancestor overflow rule can
      help — the viewport edge itself is the clip.
- [x] Fix: pivot the spin on her middle — `#cathode-guide.cg-spinning
      .cg-sprite { transform-origin: 50% 50% }`, exactly parallel to the
      existing `cg-tumbling` origin override right above it. Worst-case
      rotated extent below her box is ~0.21 × sprite size (≈15px desktop,
      ≈12px mobile), always inside the 12–20px floor gap once the kit's
      mid-spin `scale(.9)` squash is counted; FPS's telemetry-bar floor
      (~35px) absorbs its ±13px parallax too.
- [x] Boundary frames are rotate(0)/rotate(1turn) with scaleX symmetric
      about origin-x 50%, so the origin swap causes no visible jump when
      the class toggles.
- [x] Verified via Playwright (terminal + default themes, 1440×900 and
      375×700): froze the animation at 131°–287° with negative
      animation-delay — before: only a sliver of sprite visible at 180°;
      after: fully visible at every phase. Rest pose byte-identical
      before/after (rule only applies while `cg-spinning` is set). Also
      recorded before/after videos of the natural spin; no console errors.

## Notes/Discoveries
- `cg-tumbling` already rotated about the middle — the spin was the only
  rotation channel left on the foot pivot. Walking waddle (±1.7°) and the
  standing lean (±14°) stay on `50% 88%` on purpose and fit the floor gap.
