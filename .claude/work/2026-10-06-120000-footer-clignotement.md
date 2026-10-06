# Footer : clignotement de la scène et vidéo figée

**Status**: completed (PR ouverte)
**Branch**: `claude/happy-hamilton-o9b07m`
**Started**: 2026-10-06 12:00

## Task
Retour de Niko : la scène du footer clignote, et après un reload la version animée
n'apparaît plus.

## Files Being Modified
- frontend/js/components/site-footer.js
- frontend/css/site-footer.css
- frontend/index.html (?v= du CSS et du JS du footer, hauteur du poster)

## Progress
- [x] Clignotement reproduit dans Chromium (touche Fin vers le footer) et corrigé
- [x] Boucle de rendu qui ne s'arrête plus au rebouclage de la vidéo
- [x] Fondu image fixe → vidéo dans le shader
- [x] Vérif navigateur : 5 thèmes 1280 px, default et fps 390 px, sans WebGL,
      reduced-motion, perte/restauration du contexte WebGL, boucles de la vidéo

## Notes/Discoveries
- Cause du clignotement : le `<img>` poster s'affichait dès son chargement, puis
  `.is-live` le faisait disparaître en 0,8 s pendant que le canvas démarrait son entrée
  depuis zéro (texture vide) : la peinture apparaissait, disparaissait, puis revenait.
  Visible quand on arrive vite au footer (lien de nav, touche Fin, reload ou changement
  de thème avec la position restaurée). Désormais `.is-gl` masque le `<img>` dès que
  WebGL marche, et l'entrée attend qu'une image soit dans la texture.
- La boucle rAF s'arrêtait dès que `readyState < 2` (le seek du rebouclage, une attente
  de données) et ne repartait qu'avec requestVideoFrameCallback ou un scroll. Sans rVFC
  (Safari quand il ne peint pas la vidéo, vieux Firefox), la scène restait figée au
  premier rebouclage tant qu'on ne scrollait pas. Pas d'upload pendant un seek non plus.
- Le canvas ne redessine plus qu'à chaque nouvelle image vidéo (25 i/s) au lieu de
  chaque rafraîchissement d'écran : moins de charge GPU sur les écrans 120 Hz.
- Non testable ici : Safari / iOS et Chrome macOS avec H.264 (Chromium headless lit le
  WebM VP9).
