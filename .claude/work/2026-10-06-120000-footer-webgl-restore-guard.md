# Footer: guard WebGL setup on context restore

**Status**: completed
**Branch**: `posthog-self-driving/fixsite-footer-guard-webgl-setup-when-22a79d`
**Started**: 2026-10-06 12:00

## Task
The `webglcontextrestored` handler in the footer scene called `setupGL()` without a try/catch. When the
context was lost again during the restore, `compile()` threw an uncaught `[site-footer] shader: null`.

## Files Being Modified
- frontend/js/components/site-footer.js
- frontend/index.html (`?v=` cache key)

## Progress
- [x] Return early from the restore handler when the context is lost
- [x] Wrap `setupGL()` in try/catch + `console.warn`, like the first setup
- [x] `compile()` reports a lost context instead of a shader error
- [x] Playwright: lose/restore and failed compile on restore in all 5 themes, 0 page errors

## Notes/Discoveries
- The next `webglcontextrestored` event runs setup again, so the scene comes back after a failed restore.
