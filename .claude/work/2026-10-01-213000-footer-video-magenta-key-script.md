# Footer : nouvelle vidéo default + script de détourage magenta

**Status**: in_progress
**Branch**: `claude/remove-magenta-video-footer-edd0fb`
**Started**: 2026-10-01 21:30

## Task
Tom envoie une nouvelle vidéo par thème (fond magenta, 4460×1860, 24 fps, 124 frames).
Détourer la vidéo default, la mettre dans le footer, et livrer un script réutilisable
pour les 4 autres thèmes.

## Files Being Modified
- tools/footer-scene/key_magenta.py (nouveau : détourage + encodages + patch SCENES)
- frontend/assets/footer/home-scene-{1792,1280}.{mp4,webm}, home-scene-poster-{1792,960}.webp
- frontend/js/components/site-footer.js (SCENES.default : alphaH/totalH)
- .claude/launch.json (serveur local pour l'aperçu)

## Progress
- [x] Script : clé estimée, fond « cœur » (magenta + magenta sombre), alpha par projection
      couleur locale fond/premier plan, unmix, despill autour du ciel, remplissage push-pull
      des pixels transparents, fondu de boucle 8 frames
- [ ] Vidéo default encodée et intégrée
- [ ] Vérif navigateur

## Notes/Discoveries
- La nouvelle vidéo a l'horizon plus bas (ciel jusqu'à ~69 % de la hauteur, contre 63,8 %
  pour l'ancienne) : le script mesure la zone transparente et ajuste alphaH tout seul.
- Usage : `python tools/footer-scene/key_magenta.py "…/footer-<theme>.mp4"` (thème lu dans le
  nom du fichier). `--preview-only --preview <dossier>` pour régler le détourage sur la 1re frame.
