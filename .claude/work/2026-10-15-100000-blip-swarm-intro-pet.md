# Blip : intro « swarm » + créature autonome

**Status**: in_progress
**Branch**: `claude/friendly-ramanujan-goonvd`
**Started**: 2026-10-15 10:00

## Task
Blip ne remplace plus la souris (le suivi à ressort faisait cliquer à côté).
1. Intro qui remplace le loader : un seul Blip, qui se divise en un essaim de
   curseurs (Blip de chaque thème + curseurs OS classiques), chacun « dessine »
   un élément visible de la page avec le geste de son outil, puis tous
   refusionnent en un seul Blip (fusion façon Dragon Ball).
2. Ensuite Blip vit sa vie : erre, se perche, somnole, se laisse attraper /
   lancer, et devient timide quand le pointeur du visiteur s'approche.

## Files Being Modified
- frontend/js/core/effects/blip-cursor.js (réécrit : créature autonome)
- frontend/js/core/effects/blip-swarm.js (nouveau : intro)
- frontend/js/core/effects/cursor-sprites.js (nouveau : bibliothèque de curseurs pixel-art)
- frontend/css/blip-cursor.css (intégration site)
- frontend/js/theme-manager.js (hideLoading délègue à l'intro)
- frontend/index.html

## Progress
- [x] Recherche références (swarm-cursors, openstation.blog)
- [x] Sprites curseurs (20, pixel-art, teintés par thème)
- [x] Spec motion (directeur motion)
- [x] Créature autonome (errance/perchoirs, timidité, drag + lancer avec gravité)
- [x] Intro swarm (split → build → fusion, variante rapide, skip)
- [x] Tests navigateur 5 thèmes + mobile + reduced motion + skip
- [ ] Revue de code + critique motion, corrections

## Notes/Discoveries
- `body.loaded` du thème default lance `elegantFadeIn` (opacité du body) : coupé
  pendant l'intro (sinon le Blip seul apparaissait délavé).
- `.header` a `transition: all` : sa visibilité arrive en retard après la levée
  de `body.loading` ; l'intro termine ces transitions avant de choisir ses cibles.
- Debug de l'intro : `?bsdebug` logue les cibles et les tâches dans la console.
- swarm-cursors n'a pas de licence : idées réimplémentées, aucun code copié.
- openstation.blog : la mascotte est un blob (Mio), pas un curseur ; on reprend
  le drag à ressort quasi critique ; le lancer, lui, a une gravité (il retombe
  sur le bas de l’écran ou sur le haut d’un titre / d’une carte).
