# Plan : vidéos détourées dans le footer des 5 thèmes

**Date :** 2026-10-04
**Branche :** `feature/footer-video-default`

## Objectif

Afficher les nouvelles vidéos (fond magenta exact) dans le footer de chaque thème, plus haut
que les images fixes actuelles. D'abord le thème par défaut (validé le 4 oct.), puis terminal,
retro90s, blueprint et fps.

## Étapes

1. [x] `tools/footer-scene/key_exact.py` : détourage continu (pas de décision par région),
   nuages pris sur la première image, sorties « couleur + alpha empilés » et posters.
2. [x] Générer `home-scene-{1920,1280}.{mp4,webm}` et les deux posters.
3. [x] `site-footer.js` : rétablir la lecture vidéo retirée par b87d10d, limitée aux scènes
   qui déclarent une vidéo ; version des médias dans l'URL.
4. [x] `site-footer.css` : scène 16:9 pour default (≥ 641 px), `--sf-lift` 0.215, `--sf-sink` 0.72.
5. [x] Vérification navigateur (default desktop et mobile, terminal).
6. [x] Mêmes étapes pour terminal, retro90s, blueprint, fps : rendu, `SCENES`, scène 16:9 pour
   tous les thèmes, `--sf-lift` par thème, vérification navigateur des 5 thèmes.
7. [x] Validation visuelle par Tom, puis commits atomiques et PR.

## Critères d'acceptation

- La vidéo joue en boucle dans le footer de chaque thème, sans magenta visible.
- Le texte légal de la barre reste lisible ; l'arbre n'est pas coupé en haut.

## Risques

- Poids : de 3,7 à 13,6 Mo en HD mp4 selon le thème (terminal est le plus lourd), chargés
  seulement à l'approche du footer ; environ 104 Mo de vidéos ajoutés au dépôt.
- Sur grand écran la scène occupe presque toute la hauteur de la fenêtre.
- Safari / iOS non testés.

## Rollback

Revenir à `main` : supprimer les vidéos, restaurer les posters, le JS, le CSS et
les `?v=` de `index.html`.
