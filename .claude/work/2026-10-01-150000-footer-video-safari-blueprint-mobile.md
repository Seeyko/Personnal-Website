# Footer vidéo figée + bug blueprint mobile

**Status**: completed
**Branch**: `claude/busy-thompson-xp6kyx`
**Started**: 2026-10-01 15:00

## Task
1. En prod (tomandrieu.com), la vidéo du footer restait figée sur l'image fixe chez Tom.
2. Bug pré-existant : en mobile, le thème blueprint plantait à l'init.

## Files Being Modified
- frontend/js/components/site-footer.js
- frontend/themes/blueprint/blueprint.js

## Progress
- [x] Vidéo : la texture ne dépend plus de requestVideoFrameCallback (temps de la vidéo
      sondé à chaque frame tant qu'elle joue) ; vidéo proxy de 2 px déplacée en bas au centre
      de la scène ; la boucle tourne aussi avec « Réduire les animations » (entrée et parallaxe
      restent coupées)
- [x] Blueprint : initSVGAnimations saute les lignes SVG non rendues (hero masqué en mobile)

## Notes/Discoveries
- Prod testée via un miroir local + Google Chrome (H.264) : le code joue dans Chrome. En
  simulant un requestVideoFrameCallback qui ne se déclenche jamais (comportement suspecté de
  Safari pour une vidéo qu'il ne peint pas), l'ancien code fige la texture sur la 1re image
  (identique au poster webp) alors que la vidéo tourne ; le correctif l'anime.
- Safari / iOS non testables ici.
