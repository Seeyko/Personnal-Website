# Footer : vidéos détourées pour les 5 thèmes

**Status**: completed (validé par Tom le 4 oct., PR mergée à sa demande)
**Branch**: `feature/footer-video-default`
**Started**: 2026-10-04 18:30

## Task
Remettre une vidéo dans le footer de chaque thème à partir des nouvelles vidéos sur fond
magenta exact, et remonter la scène par rapport aux images fixes.

## Files Being Modified
- tools/footer-scene/key_exact.py (nouveau), README.md
- frontend/assets/footer/home-scene[-<theme>]-{1920,1280}.{mp4,webm} (20 fichiers),
  home-scene[-<theme>]-poster-{1792,960}.webp (10 fichiers)
- frontend/js/components/site-footer.js (lecture vidéo rétablie, SCENES des 5 thèmes)
- frontend/css/site-footer.css (scène 16:9, --sf-sink 0.72, --sf-lift par thème)
- frontend/index.html (?v= du CSS et du JS du footer)
- frontend/i18n/locales/{fr,en}.json (libellé « Illustration animée »)

## Progress
- [x] Outil de détourage pour fond magenta exact (nuages figés depuis la première image)
- [x] default : vidéos + posters, validé par Tom le 4 oct.
- [x] terminal, retro90s, blueprint, fps : vidéos + posters
- [x] Hauteur par thème : la cime arrive sous le texte de la barre légale
- [x] Vérif navigateur 1440 px : les 5 thèmes (vidéo en lecture, console propre) ;
      390 px : default et retro90s
- [x] Vérif visuelle par Tom (vidéos d'aperçu des 5 thèmes), commits + PR

## Notes/Discoveries
- Les vidéos sont en 16:9 et cadrent la scène plus serré que les anciennes images
  (2230×930) : à largeur égale la peinture est environ 35 % plus haute. Sur un écran de
  1920 px de large, elle fait environ 910 px de la cime au sol.
- Poids des vidéos : environ 104 Mo au total dans le dépôt. Terminal est la plus lourde
  (13,6 Mo en HD mp4, 6,8 Mo en SD) à cause de la texture en glyphes.
- blueprint : l'arbre a les couleurs des nuages, il est donc figé avec eux (première image).
- terminal : pas de nuage figé (ils sont verts), ceux de la vidéo sont gardés.
- fps : nervures rouge-rose dans les feuilles, présentes dans la source.
- default a été généré avant l'ajout de deux règles dans key_exact.py (ce que la vidéo peint
  loin du décor est ignoré ; les restes translucides aussi). Le relancer donnerait un
  résultat légèrement différent de celui validé.
- Les fichiers gardent leurs noms : `ASSET_VERSION` (site-footer.js) casse le cache des médias.
- Le rendu charge le processeur : `--jobs 2` pour ne pas gêner le reste de la machine.
- Non vérifié : Safari / iOS ; mobile pour terminal, blueprint et fps.
