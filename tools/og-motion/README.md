# og-motion

La vidéo « l'atelier se construit » (10 s, boucle) et l'og:image, qui est sa dernière image.

Un Blip se divise en essaim de curseurs (les vrais sprites de `CursorSprites` et les Blip
de thème) ; chacun construit un morceau de la page avec le geste de son outil (crayon :
le cadre, pot : la barre de titre, I-beam et Blip terminal : les titres, Blip blueprint : la
cote de marge, main : les puces, pinceau : le soulignement ambre, Blip retro90s : la devise).
Ils refusionnent en Blip sur son skate, ollie, puis extinction CRT : la boucle repart du noir.

Tout est une fonction pure du temps, `render(t)` dans `scene.html`, en pas de 1/12 s
(pixel-art, BRANDING.md « tout est animé en steps() »). Aucune animation CSS : le rendu
image par image est exact.

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
