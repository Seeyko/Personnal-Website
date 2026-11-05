# og-motion

La vidéo « l'atelier se construit » (16 s, boucle, thème default) et l'og:image, qui est sa
dernière image.

Plan par plan : sur le papier, un curseur bloc ouvre les yeux et devient Blip, puis se divise en
essaim. La caméra suit la construction des projets : Ride My Park en gros plan (cadre au crayon,
fond au pot, capture au pinceau, titre à l'I-beam, badge tamponné, compteur 0 → 30K spots),
Skoolbook, puis Teach Tools et GyroDex en plan à deux (GyroDex, « pour le fun », est construit
par les Blip de thème). Recul sur la page entière, la tagline se tape, l'essaim fusionne en Blip
sur son skate (pixel-art d'après `skate3d` de Ride My Park : kicktails, grip, chant d'érable,
dessous bleu, trucks alu, roues crème), ollie, fermeture à l'iris : la boucle repart du papier.

Tout est une fonction pure du temps, `render(t)` dans `scene.html`. Les sprites avancent par pas
de 1/12 s (BRANDING.md : tout est en steps()) ; seule la caméra glisse. Rendu image par image exact.

## Rendu

```sh
bun tools/og-motion/serve.ts 8765 &                      # /og-motion/* ici, le reste depuis frontend/
# playwright-core installé dans un dossier à part (NODE_PATH ou dossier de travail)
docker run --rm --net host -u $(id -u):$(id -g) -e HOME=/tmp -v "$PWD:$PWD" -w <dossier avec playwright-core> \
  mcr.microsoft.com/playwright:v1.58.2-noble node render.mjs --out <out> --fps 24
# encodage (ffmpeg statique en conteneur)
docker run --rm -u $(id -u):$(id -g) -v <out>:/w -w /w mwader/static-ffmpeg:7.1 -y -framerate 24 -i frames/f%04d.png \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -tune animation -movflags +faststart og-motion.mp4
docker run --rm -u $(id -u):$(id -g) -v <out>:/w -w /w mwader/static-ffmpeg:7.1 -y -framerate 24 -i frames/f%04d.png \
  -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -pix_fmt yuv420p og-motion.webm
```

Sorties à copier dans `frontend/assets/brand/` : `og-image.png`, `og-motion.mp4`, `og-motion.webm`.
Changer l'og:image = monter le `?v=` dans les balises `og:image` / `twitter:image` de
`frontend/index.html` (LinkedIn et X gardent l'ancienne en cache sinon).

Aperçu d'un instant : `http://127.0.0.1:8765/og-motion/scene.html?t=4.2` ; image finale : `?still=1`.
