# Cathode copy: CRT voice, no handmade, no coffee

**Status**: in_progress
**Branch**: `cursor/cathode-copy-universe-5d4e`
**Started**: 2026-08-15 10:08

## Task
Correct Cathode's spoken lines: drop the "handmade" claim and coffee jokes.
Voice must match Cathode — old 8-bit CRT — funny / lightly existential,
not a cosmology lecture. Do not mention Fable.

## Files Being Modified
- frontend/i18n/locales/fr.json
- frontend/i18n/locales/en.json

## Progress
- [x] Locate cathodeGuide strings
- [x] Drop handmade + coffee
- [x] Rewrite again in CRT / 8-bit voice (less space)
- [ ] Re-check bubbles
- [ ] Commit / update PR

## Notes/Discoveries
- Bubbles wrap to 3 lines × 24 chars — keep replacements ≤ ~70 characters.
- User feedback: trop de réf à l'espace ; ça doit matcher le perso (vieux écran 8-bit).
