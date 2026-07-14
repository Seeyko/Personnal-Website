# Blip cursor: kill the spring-back overshoot

**Status**: completed
**Branch**: `claude/blip-cursor-springback-9d4llk`
**Started**: 2026-07-14 17:13

## Task
The cursor follower (Blip) overshot the target and bounced back ("ressort" /
"retour arrière") when following the mouse, making it hard to aim at things.

## Files Being Modified
- frontend/js/core/effects/blip-cursor.js (comments only + 2 spring constants)

## Progress
- [x] Diagnose: the follower is an intentionally under-damped spring (ζ ≈ 0.62),
      which by definition overshoots and bounces. Confirmed no CSS transition on
      `transform` adds extra springiness — all motion is the JS integrator in
      `tick()`.
- [x] Retune to quasi-critical damping: SPRING_K 190→520, SPRING_C 17→48
      (ζ ≈ 1.05). Stiffness raised to keep the same trailing lag during motion
      (lag ≈ (C/K)·speed, ~0.09s, unchanged); only the settle changes.
- [x] Update comments (constants block + body-language "tremblé de pose").
- [x] Numeric check of the exact symplectic-Euler integrator: overshoot
      6px→0px at 48–144fps; trailing lag ~58px→~60px @800px/s (unchanged).
- [x] Browser E2E (Playwright + preinstalled Chromium): cursor mode active,
      flick-and-stop settles exactly on target with 0px overshoot, no console
      errors. All 5 themes load clean; fps hard-snap path (+13px offset)
      untouched.

## Notes/Discoveries
- Counterintuitive: pushing damping higher than ~ζ1.1 makes the 30fps MAX_DT
  clamp frame numerically unstable, because the explicit velocity-damping term
  `-vel*C*dt` needs C·dt < 2. C=48 gives C·dt=1.6 at the 1/30 clamp — safely
  stable, with only a bounded ~2px transient on the rare post-refocus frame and
  exactly 0 overshoot at every real refresh rate.
- The FPS theme uses a separate hard-snap branch (`isFpsSnap()`), unaffected by
  the spring constants.
