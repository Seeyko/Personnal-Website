# Footer default : points violets + scène remontée

**Status**: completed (PR ouverte sur la branche de la PR #100)
**Branch**: `claude/brave-wozniak-ir73fw`
**Started**: 2026-10-01 22:15

## Task
Retours de Tom sur la PR #100 : enlever les points violets sous le petit nuage (et baisser
le seuil de magenta retiré), et monter encore la vidéo du footer.

## Files Being Modified
- tools/footer-scene/key_magenta.py (passe `despeck`, option `--despeck`)
- frontend/assets/footer/home-scene-{1792,1280}.{mp4,webm}, home-scene-poster-{1792,960}.webp
- frontend/css/site-footer.css (`--sf-lift`, 0.16 pour le thème default)
- frontend/index.html (versions ?v= du CSS et du JS du footer)

## Progress
- [x] Passe despeck dans le script + appliquée aux vidéos default existantes
- [x] Scène remontée (default), autres thèmes inchangés
- [x] Vérif navigateur desktop 1440 / tablette 1024 / mobile 390

## Notes/Discoveries
- La source magenta n'est pas dans le dépôt : les vidéos default ont été nettoyées à partir
  de `home-scene-1792.mp4` (décodage, despeck, réencodage HD/SD + posters). Relancer
  `key_magenta.py` sur la source donne le même nettoyage, intégré au détourage.
- Les points violets étaient des trous de ciel enfermés dans les nuages / le feuillage, restés
  opaques et étalés par le sous-échantillonnage de la chroma : le despeck compare chaque pixel à
  la couleur locale du premier plan et ne corrige que les écarts vers le magenta (toits rouges,
  volets, fleurs épargnés).
- nginx sert .css et .js en immutable 1 an : le CSS du footer n'était pas versionné, et le JS
  de la PR #100 (nouveaux alphaH) gardait le même ?v= que #98 → passés en 2026-10-01b.
