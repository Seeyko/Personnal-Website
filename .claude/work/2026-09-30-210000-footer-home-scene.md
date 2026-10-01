# Footer « home scene » (vidéo détourée + footer refondu)

**Status**: completed (en review)
**Branch**: `claude/busy-thompson-xp6kyx`
**Started**: 2026-09-30 21:00

## Task
Détourer le fond magenta de la vidéo perso de Tom (maison du Sud, famille, chats, mer)
et construire un nouveau footer inspiré des références (ROOTED / Zuno / Glaux / Bloom).
Consigne de Tom en cours de route : seul le thème **default** compte pour l'instant, il
enverra une vidéo par thème pour les 4 autres.

## Files Being Modified
- frontend/index.html (markup footer + liens CSS/JS)
- frontend/css/site-footer.css (nouveau)
- frontend/js/components/site-footer.js (nouveau : horloge, copie email, scène WebGL)
- frontend/assets/footer/* (vidéos empilées couleur+alpha 1792/1280 en mp4+webm, posters WebP),
  une scène par thème : default, terminal, blueprint, retro90s (fps réutilise default)
- frontend/i18n/locales/{fr,en}.json (clés footer.*)
- frontend/themes/retro90s/retro90s.js (webring → nouvelle barre du footer)

## Progress
- [x] Keying magenta (matting par projection sur couleur locale + garbage matte horizon)
- [x] Encodages : H.264 + VP9 « empilés », posters WebP, WebM VP9 alpha livré à Tom
- [x] Markup + CSS + i18n (layout compact, vidéo au premier plan, aucun texte dessous)
- [x] Renderer WebGL (alpha empilé, lavis d'entrée, parallaxe, pause, reduced-motion)
- [x] Tests navigateur (default desktop/tablette/mobile, EN, reduced-motion, sans WebGL,
      autres thèmes lisibles) + vidéo de démo envoyée à Tom
- [x] Vidéos terminal / blueprint / retro90s de Tom détourées et intégrées, carte habillée par
      thème (terminal phosphore, cartouche de plan, fenêtre Windows 95) + entrée propre à chaque
      thème dans le shader (impression ligne à ligne, balayage traceur, GIF entrelacé)

## Notes/Discoveries
- Vidéo source 2230×930, 24 fps, 124 frames, fond ≈ #F501F5. Quasi-boucle : fondu de 8 frames
  en fin pour une boucle sans couture (116 frames côté site).
- Le premier plan ne dépasse jamais min(R,B)−G ≈ 30 → les fleurs roses ne sont pas touchées.
- Safari ne lit pas l'alpha VP9 → le site utilise une vidéo « empilée » (couleur en haut,
  alpha en bas) recomposée en WebGL : même rendu partout, iOS compris. H.264 d'abord,
  VP9 pour les Chromium sans codecs propriétaires.
- Retours de Tom : pas de voile/dégradé derrière la vidéo (le ciel transparent doit montrer
  exactement le fond de page), vidéo au premier plan, aucun texte sous la vidéo, et surtout
  « le footer vit dans la vidéo » (réf. Bloom) : la carte des liens s'enfonce derrière le
  paysage (--sf-sink = 0.7 × hauteur de scène, sous l'horizon donc bord bas toujours caché).
  Le haut de la frame coupe l'arbre : dissolution fine « feuillage » (10 %).
- Autre thème = ajouter une entrée dans SCENES (site-footer.js) avec le même layout empilé.
- Pas de bouton play/pause (demande de Tom) : autoplay muet, pause hors écran et onglet caché,
  relance au premier geste si l'autoplay est refusé (iOS économie d'énergie).
- Chargement : rien au chargement de la page. Le réveil (poster du thème + WebGL) n'est armé
  qu'après body.loaded (avant, la page est courte et le footer paraît proche), à 800 px ;
  la vidéo seulement à 200 px de la scène. Pas de vidéo en reduced-motion ni en Save-Data.
- Réglages de détourage par vidéo (scratchpad key.py, variables d'env) :
  retro KEYISH=150 + horizon 570 (fleurs roses jusqu'à m≈127), terminal (v2 « Matrix »,
  1er oct.) horizon 560 sans crop, blueprint horizon 590 ; puis passe « despeck » qui
  efface les points violets collés au ciel (ciel sombre compressé entre les feuilles).
- Bug pré-existant repéré (pas corrigé ici) : themes/blueprint/blueprint.js initSVGAnimations
  appelle getTotalLength sur le SVG du hero masqué en mobile → ThemeInit échoue en mobile.
- Copy : pas de « fait main », pas de café, pas de tournures « IA slop » (cf. #85). Pas de promesse
  de dispo (now.json : pas de freelance en ce moment) → tagline de BRANDING.md + email.
