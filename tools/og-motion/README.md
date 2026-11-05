# og-motion

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
