# Footer : nouvelles images fixes des 5 thèmes

**Status**: completed
**Branch**: `claude/footer-key-retro-terminal`
**Started**: 2026-10-03 12:00

## Task
Tom arrête les vidéos du footer tant que le rendu n'est pas bon (main les a déjà retirées,
b87d10d). Il fournit 5 peintures sur fond magenta dont le haut n'est pas coupé par l'arbre :
les détourer et remplacer les posters du site.

## Files Being Modified
- frontend/assets/footer/home-scene*-poster-{1792,960}.webp (10 fichiers)
- tools/footer-scene/prep_loopback.py (option --posters), README.md

## Progress
- [x] Branche rebasée sur main (#104)
- [x] 5 images détourées (sources PNG sans perte : …/footer tomandrieu/stills/loopback/original)
- [x] Posters écrits, chargement vérifié (10 fichiers, 1792×748 et 960×400)
- [ ] Vérif visuelle par Tom dans le footer des 5 thèmes

## Notes/Discoveries
- Essais vidéo mis de côté dans la branche locale `wip/footer-videos-essais` (non poussée).
- key_magenta.py écrit encore les champs vidéo de SCENES, que main n'a plus : à réadapter
  quand les vidéos reviendront (il affiche un avertissement et ne touche pas au JS).
- default : derim 160 (pointes roses peintes dans l'arbre) ; les roses de la maison restent.
- retro : les ombres bleu-violet dans l'arbre font partie du dessin.
