# Favicon transparent + recadré par thème

**Status**: completed
**Branch**: `claude/happy-goldberg-rfmilo`
**Started**: 2026-07-14 17:12

## Task
Rendre le favicon thémifié plus gros et transparent : suppression du fond opaque 24×24
et recadrage du viewBox pile sur le sprite pour chaque `favicon-{theme}.svg`.

## Files Being Modified
- frontend/assets/brand/favicon-default.svg
- frontend/assets/brand/favicon-terminal.svg
- frontend/assets/brand/favicon-blueprint.svg
- frontend/assets/brand/favicon-retro90s.svg
- frontend/assets/brand/favicon-fps.svg
- frontend/assets/brand/README.md

## Progress
- [x] Suppression du rect de fond opaque dans les 5 favicons
- [x] viewBox recadré : `1 1 22 22` (sprites Blip), `2 2 20 20` (crosshair FPS, cadre interne retiré)
- [x] Vérification visuelle (rendu Chromium headless sur fond clair/sombre)

## Notes/Discoveries
- Le swap par thème existait déjà (`updateFavicon()` dans theme-manager.js + `<link id="favicon">`) — seul le dessin des SVG a changé, aucun JS/HTML touché.
- Les sprites Blip font 12×22 px : le viewBox carré 22×22 les fait remplir toute la hauteur, centrés horizontalement.
