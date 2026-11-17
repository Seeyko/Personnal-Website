# Cards Ciboulot et My Little Garden

**Status**: completed
**Branch**: `claude/project-thread-eddfg1`
**Started**: 2026-11-17 18:30

## Task
Ajouter deux cards projet : Ciboulot (le système, avec Popote, Marmotti et Méli) et My Little Garden.

## Files Being Modified
- frontend/data/fr/projects.json
- frontend/data/en/projects.json
- frontend/assets/ciboulot-*.webp, frontend/assets/my-little-garden-*.webp

## Progress
- [x] Visuels 1600×1000 (16:10) composés depuis les repos popote et my-little-garden
- [x] Cards FR + EN
- [x] Testé : default, terminal, blueprint, retro90s (fps ne charge aucune image de projet, déjà le cas avant)

- [x] Textes réécrits plus simples (guide clean-copy de Tom)
- [x] Visuels propres à chaque thème : `themeImages.{theme}` dans projects.json, lu par content-loader.js ; fichiers dans assets/projects/{theme}/ (fps garde `images`)

## Notes/Discoveries
- Les visuels viennent des captures App Store, des mascottes et des maquettes des deux repos ; le schéma Ciboulot et la planche Méli sont des pages HTML capturées avec Playwright.
