# Footer : images fixes seulement, plus de vidéo

**Status**: completed (PR ouverte, en attente de Tom)
**Branch**: `feature/footer-stills-only`
**Started**: 2026-11-05 13:30

## Task
Tom (5 nov.) : « vire les vidéos du footer, ne mets que des images ». Le footer affiche
l'image fixe détourée de chaque thème, avec l'entrée et le parallaxe WebGL existants.

## Files Being Modified
- frontend/js/components/site-footer.js (lecture vidéo, texture vidéo, fondu retirés)
- frontend/assets/footer/home-scene*-{1280,1920}.{mp4,webm} (20 fichiers supprimés)
- frontend/index.html (commentaires, aria-label, ?v= du script du footer)
- frontend/css/site-footer.css (commentaires)
- frontend/i18n/locales/{fr,en}.json (libellé sans « animée »)
- tools/footer-scene/README.md (état)

## Progress
- [x] Code vidéo retiré, shader ne lit plus que le poster
- [x] Vidéos supprimées (environ 104 Mo)
- [x] Vérif navigateur 5 thèmes, 1440 px et 390 px (Playwright en docker : still peint, aucun <video>, aucune requête mp4/webm, console propre)
- [x] PR

## Notes/Discoveries
- Pour remettre une vidéo un jour : repartir de la PR #106.
