# og-motion

## /things — `things3d.html`

La vidéo de la page /things (18 s, 1920×1080, boucle) : les stickers de la page tombent un par un et
s'entassent, puis Blip saute sur le tas et lance chaque sticker à sa place dans une grille rangée
(l'ordre de la page, catégorie par catégorie), sous l'en-tête « Things ». La dernière case est vide :
c'est celle de Blip. Même monde que `scene3d.html` (papier + grille de points, Blip en voxels, ombres).
- Les stickers = les images de `frontend/assets/things/`, lues dans `frontend/data/fr/things.json`
  (objets avec image et pas « plus utilisé ») : un objet ajouté à la page entre dans la vidéo au
  prochain rendu. La grille fait 13 × 6 : au-delà de 77 objets, agrandir `COLS`/`ROWS`.
- Rendu : `node render3d.mjs --scene things3d.html --out ./out-things` (même serveur que plus bas ;
  `--three <three.module.js>` si unpkg n'est pas joignable depuis le navigateur), puis le même
  encodage que la v4 avec `og-things.mp4` / `.webm`.
- og:image = `things3d.html?w=1200&h=630&t=18` → `frontend/assets/brand/og-things.png`, balises
  dans `frontend/things.html` (monter le `?v=` à chaque nouveau rendu).

## v4 (actuelle) — scène Three.js 3D : `scene3d.html`

Blip et son essaim construisent les projets en 3D (21,5 s, 1920×1080, boucle, thème default).
- `capture.mjs` photographie les VRAIES cartes du site (DOM, polices, badges, tags, captures) en 2×
  avec la géométrie de chaque partie et la boîte de chaque mot → `captures/<thème>/` (card*.png,
  card*-badge.png, meta.json).
- `scene3d.html` (three@0.160.0, comme le site) : chaque carte est révélée par un shader (contour au
  crayon, remplissage au pot depuis le clic, image au pinceau, badge tamponné), UN outil à la fois.
  Le texte est tapé mot par mot par l'I-beam : c'est `typeWords()` de `blip-draw.js` (le curseur file
  au bout de chaque mot, glyphes de données de `data-trail.js` derrière lui, lettres résolues 160 ms
  après), rejoué en fonction pure du temps — comme la grande phrase du footer. Blip et les curseurs = les vrais sprites (`blip-*.svg`, `CursorSprites`) extrudés en
  voxels pixel pour pixel, couleurs exactes (faces ombrées par orientation, sans éclairage qui ternit
  la marque), clignement contractuel. Sol = le papier du site et sa grille de points (cyclorama).
- `render3d.mjs` capture image par image (WebGL SwiftShader dans le conteneur Playwright, ~0,5 s/image).
  Servir la racine du dépôt : `python3 -m http.server 8766`. `?t=` fige un instant.
- og:image = dernière image rendue en 1200×630 (`?w=1200&h=630`, t = 21,4).

Encodage — la vidéo s'ouvre ET finit sur le plan final (c'est la 1re image que montrent Discord,
LinkedIn… pour un og:video ; une ouverture en fondu = vignette vide) : 1,2 s du plan final, fondu
de 0,5 s vers l'intro, puis toute la scène sans fondu de sortie → boucle sans coupure.
```
FC="[0:v]loop=loop=-1:size=1,trim=duration=1.2,setpts=PTS-STARTPTS,fps=24,format=yuv420p[a];[1:v]fps=24,format=yuv420p[b];[a][b]xfade=transition=fade:duration=0.5:offset=0.7,format=yuv420p[v]"
ffmpeg -i frames/f0515.png -framerate 24 -i frames/f%04d.png -filter_complex "$FC" -map "[v]" \
  -c:v libx264 -preset slow -crf 19 -movflags +faststart og-motion.mp4   # idem libvpx-vp9 -crf 36 -b:v 0 → .webm
```

## v3 — le site filmé : `rec.mjs`

La vidéo « l'atelier se construit » (16 s, 1920×1080, boucle, thème default) et l'og:image.
Ce n'est PAS une maquette : c'est le vrai site filmé. L'intro (`blip-swarm.js`) construit
l'accueil, puis la caméra descend sur Work où `blip-draw.js` dessine chaque projet, et remonte.

`rec.mjs` filme le site image par image :
- horloge factice Playwright (`page.clock`), **mise en pause** : sans `pauseAt`, elle avance aussi
  avec le temps réel et une capture lente accélère le site ;
- animations CSS / Web Animations mises en pause et avancées à la main sur le temps virtuel ;
- caméra = `scrollTo` scripté (`shots.json`) — seulement quand elle bouge : un scroll, même sur
  place, presse l'intro ; jamais de molette (elle saute l'intro) ; `scroll-behavior` forcé à auto ;
- zoom = capture d'une zone (`zoom.json` : `[t, z, cx, cy]`) à `deviceScaleFactor` 2, agrandie ensuite ;
- vitesse du site (`speed.json` : `[t, x]`) — l'attente avant la fusion est passée en ×1,6.

## Rendu

```sh
cd frontend && python3 -m http.server 8000 --bind 127.0.0.1 &
# playwright-core@1.58.2 installé dans un dossier de travail, avec rec.mjs et les 3 JSON
docker run --rm --net host -u $(id -u):$(id -g) -e HOME=/tmp -v "$W:$W" -w "$W" mcr.microsoft.com/playwright:v1.58.2-noble \
  node rec.mjs --out "$W/out" --scale 2 --w 1280 --h 720 --shots "$(cat shots.json)" --zoom "$(cat zoom.json)" --speed "$(cat speed.json)"
docker run --rm -u $(id -u):$(id -g) -v "$W/out:/w" -w /w mwader/static-ffmpeg:7.1 -y -framerate 24 -pattern_type glob -i 'f*.jpg' \
  -vf "scale=1920:1080:flags=lanczos,setsar=1,fade=t=out:st=15.6:d=0.5:color=0xf8f7f4,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -tune animation -movflags +faststart og-motion.mp4
# (même chose en libvpx-vp9 -crf 36 pour og-motion.webm)
```

og:image : même capture en `--w 1200 --h 630 --scale 2`, image de la construction de l'accueil
(~2,4 s du temps du site), réduite en 1200×630. Changer l'og:image = monter le `?v=` des balises
`og:image` / `twitter:image` de `frontend/index.html`.

Variantes par thème : `?theme=` est un paramètre de `rec.mjs` (`--theme terminal` …).
