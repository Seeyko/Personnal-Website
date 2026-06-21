# Heart home: alignment, drag-rotate, per-theme dots, scroll memory

**Status**: completed
**Branch**: `claude/loving-heisenberg-ajx9vu`
**Started**: 2026-06-21 19:57

## Task
Homepage 3D heart fixes requested by user:
1. Heart not aligned with caption text below it.
2. Restore drag-to-rotate ("grab" it) + change cursor (grab/grabbing).
3. Make the dots change completely between themes (more distinct shapes/palettes).
4. Preserve scroll position across theme switches (full reload currently loses it).

## Files Being Modified
- frontend/css/base.css (heart layout + cursor)
- frontend/js/heart-home.js (drag-rotate, cursor, per-theme dot styles)
- frontend/js/theme-manager.js (scroll save/restore across theme switch)

## Progress
- [x] Alignment: caption flows below canvas (flex), both centered on same axis
- [x] Drag-to-rotate with inertia + grab/grabbing cursor (touch still scrolls)
- [x] Distinct per-theme dot shapes (round/square/cross/star) + palettes + ring shape added
- [x] Scroll restoration via sessionStorage on theme switch (smooth-scroll paused, aborts on user input)

## Verification
- node --check passes on both modified JS files.
- No browser/GPU in this remote sandbox -> WebGL render NOT visually verified here.
  Needs a quick local browser pass (all themes) per CLAUDE.md before merge.

## Notes/Discoveries
- Theme switch does a FULL page reload (window.location.href), so the heart
  re-inits and already reads the new theme — but reload loses scroll, so the
  user never scrolls back to see the new heart. Fixing scroll (4) makes (3)
  visible. Keeping full reload; restoring scroll via sessionStorage.
- html { scroll-behavior: smooth } must be temporarily disabled while snapping
  scroll into place, else it animates and fights the restore loop.
- heart-home.js currently only has the pointer "ripple" — no drag rotate.
