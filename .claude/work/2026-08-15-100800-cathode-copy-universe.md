# Cathode copy: universe, no handmade, no coffee

**Status**: completed
**Branch**: `cursor/cathode-copy-universe-5d4e`
**Started**: 2026-08-15 10:08

## Task
Correct Cathode's spoken lines: drop the "handmade" claim and coffee jokes.
Prefer funny / existential lines about the universe and the world. Do not mention Fable.

## Files Being Modified
- frontend/i18n/locales/fr.json
- frontend/i18n/locales/en.json

## Progress
- [x] Locate cathodeGuide strings
- [x] Rewrite handmade + coffee lines (FR + EN)
- [x] Browser-check bubbles on a couple of themes
- [x] Commit / PR

## Notes/Discoveries
- Handmade + coffee live in `cathodeGuide.hero` / `.about` and per-theme overrides.
- Bubbles wrap to 3 lines × 24 chars — keep replacements ≤ ~70 characters.
