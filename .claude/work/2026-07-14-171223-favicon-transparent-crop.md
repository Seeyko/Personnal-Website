# Favicon transparent + recadré par thème / Blip custom FPS

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

## Suite : Blip custom FPS (2026-07-14 17:30)
- [x] `blip-fps.svg` redessiné sur la base du Blip universel (l'ancien était un brouillon simplifié hors charte, non référencé dans le code)
- [x] Swap de palette phosphore → bleus HUD du thème FPS + costume : casque balistique acier sur la pente, oreillette montée sur le bord du casque, micro à LED rouge `#ff4655` devant la bouche, blush or `#f4b73a`
- [x] `favicon-fps.svg` remplacé par la tête de Blip FPS (l'ancien crosshair dégage), transparent, viewBox `0 1 22 22`
- [x] Vérification visuelle Chromium headless (grand format + 16px, fonds clair/sombre)

## Notes/Discoveries
- Le swap par thème existait déjà (`updateFavicon()` dans theme-manager.js + `<link id="favicon">`) — seul le dessin des SVG a changé, aucun JS/HTML touché.
- Les sprites Blip font 12×22 px : le viewBox carré 22×22 les fait remplir toute la hauteur, centrés horizontalement.
