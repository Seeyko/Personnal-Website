# Stickers « die-cut » pour /things

Chaque objet de `/things` peut avoir une image : un sticker vinyle découpé à la forme
(contour blanc épais qui suit la silhouette, grain de papier, petit biseau sur la tranche).
L'ombre et le relief (inclinaison, ombre de contact, soulèvement au survol, reflet,
flottement dans la fiche) sont faits en CSS, section `STICKERS` à la fin de
`frontend/css/things.css`, pour pouvoir les animer.

```
python tools/stickers/make_stickers.py                       # tous les objets du manifeste
python tools/stickers/make_stickers.py --only ps4 go         # un ou plusieurs ids
python tools/stickers/make_stickers.py --sheet /tmp/s.png    # + planche contact pour vérifier
python tools/stickers/make_stickers.py --only ps4 --set-json # + "image" dans fr/en things.json
```

Sortie : `frontend/assets/things/{id}.webp`, WebP transparent 800×600, < 120 Ko
(la qualité baisse toute seule si besoin). Le cadre est fixe et l'objet y est centré,
avec une épaisseur de contour identique pour tous : les cartes restent homogènes.

## Installation

```
python3 -m venv .venv && .venv/bin/pip install -r tools/stickers/requirements.txt
```

- `rembg[cpu]` (onnxruntime) détoure les photos. Au premier lancement il télécharge le
  modèle `isnet-general-use` (~180 Mo, depuis les releases GitHub de rembg) dans
  `tools/stickers/.cache/models`. Ce dossier est ignoré par git : ne jamais committer de
  poids ni de sources téléchargées.
- `resvg-py` rend les logos vectoriels (sources `iconify:`).
- Les téléchargements sont en cache dans `tools/stickers/.cache` (`--cache-dir` pour en
  changer). Relancer le script est donc rapide et donne le même résultat (bruit du papier
  tiré d'une graine dérivée de l'id).
- Les fichiers téléchargés sont des données non fiables : lancer le script avec
  `python -I` si le cache est dans le dossier courant.

## Le manifeste `sources.json`

`items` associe chaque id de `things.json` à sa source :

| clé | rôle |
|---|---|
| `source` | URL `https://…`, chemin local (relatif à ce dossier, ex. `local/superwhisper.png`) ou `iconify:<set>:<nom>` (logo tiré du paquet npm `@iconify-json/<set>`) |
| `matte` | `auto` (alpha existant sinon rembg), `alpha` (PNG déjà transparent), `white` (fond blanc uni, clé par remplissage depuis les bords, `tol` = tolérance), `rembg`, `none` (garder l'image entière, ex. icône d'app carrée) |
| `crop` | `[x0, y0, x1, y1]` en fractions de l'image, appliqué avant le détourage |
| `rotate` | degrés, sens anti-horaire |
| `scale` | taille relative dans le cadre (défaut 1 ; ~0.85 pour les logos carrés) |
| `dx`, `dy` | décalage en px dans le cadre final |
| `keep` | `all` (défaut, enlève seulement les poussières) ou `largest` (garde le plus gros morceau) |
| `erode` | px retirés au bord du masque (défaut 1 avec rembg, contre les liserés) |
| `bridge` | force du pontage entre morceaux séparés (défaut 1) |
| `color` | recolore un logo vectoriel monochrome (`#0AE448`) |
| `matte: deck` / `poly` | `deck` : planche de skate vue à plat (rectangle à nez et tail ronds) ; `poly` : contour tracé à la main, `polys` = liste de polygones en fractions |
| `trim_white` | coupe les marges blanches autour d'une couverture |
| `inpaint` | liste de `[x0, y0, x1, y1]` (fractions) à effacer avant détourage (badge, texte promo) |
| `quad`, `quad_aspect` | redresse la perspective : 4 coins TL, TR, BR, BL en fractions → rectangle de rapport hauteur/largeur `quad_aspect` |
| `decks` | plusieurs planches d'une même photo, recomposées en éventail : liste de `{quad, aspect, tilt}` |
| `alpha_min` | avec `matte: alpha`, supprime un filigrane ou un voile sous cette opacité |
| `open` | px : ouverture morphologique, coupe les fines excroissances (ombre, câble) |
| `fill_holes` | bouche les trous du masque |
| `add_polys`, `add_ellipses` | ajoute au masque des parties oubliées par le détourage (`[cx, cy, rx, ry]` pour les ellipses) |
| `shape: ellipse`, `shape_shrink` | remplace un masque irrégulier par l'ellipse ajustée (objets ronds) |
| `flatten` | nettoie les taches d'un tissu clair : `{min_v, max_s, sigma, keep, detail}` |
| `book` | couverture → livre : tranche de pages et plat arrière (valeur = épaisseur relative, ex. `0.03`) ; à combiner avec `rotate` |
| `compose` | assemble plusieurs images déjà détourées en une seule source : `{"size": [W, H], "layers": [{"source", "crop"?, "box": [x0, y0, x1, y1]}]}`, chaque calque rogné à son alpha, ajusté dans sa boîte (fractions du canevas, calé en bas) puis empilé dans l'ordre ; `source` reste requis (premier calque) |
| `page` | page où la source a été trouvée (traçabilité) |
| `note` | remarque libre (modèle exact, pourquoi pas de source…) |

Un objet sans `source` (ou `null`) est ignoré et reste en monogramme sur le site.

## Ajouter un objet

1. Ajouter l'objet dans `frontend/data/fr/things.json` et `frontend/data/en/things.json`
   (même `id`).
2. Trouver une photo propre : vue 3/4 de face, fond blanc ou transparent, ≥ 800 px.
   Par ordre de préférence : PNG transparent officiel, photo produit sur fond blanc
   (site de la marque), Wikimedia Commons. Pour un logiciel : le logo officiel
   (`iconify:logos:<nom>` couvre la plupart des outils de dev).
   Si le site est inaccessible, enregistrer l'image dans `tools/stickers/local/` et mettre
   ce chemin en `source`.
3. Ajouter l'entrée dans `sources.json`, puis :
   `python tools/stickers/make_stickers.py --only <id> --sheet /tmp/s.png --set-json`
4. Regarder la planche : bords nets, pas de halo, pas de morceau de fond. Sinon jouer sur
   `matte` (`white` pour un objet sombre sur blanc pur, `rembg` sinon), `crop`, `erode`,
   `keep`, `scale`.
5. Changer le `?v=` de `things.css` / `things.js` dans `frontend/things.html` si le CSS ou
   le JS ont bougé.

## Rendu (ce que fait le script)

1. Source → RGBA (SVG rendu par resvg, EXIF corrigé).
2. Détourage selon `matte`, nettoyage (poussières, trous, érosion légère).
3. Recadrage serré, mise à l'échelle dans le cadre 800×600 (rendu en 2× puis réduit,
   en alpha prémultiplié pour éviter les franges), avec un plafond de surface pour que les
   objets massifs ne paraissent pas énormes à côté des fins.
4. Contour : silhouette (trous bouchés) dilatée de 30 px par distance euclidienne, morceaux
   séparés reliés (fermeture morphologique puis enveloppe convexe en dernier recours),
   flou + seuil pour arrondir les angles rentrants, bord anti-aliasé.
5. Papier : blanc cassé chaud, grain fin + marbrure basse fréquence, biseau éclairé du
   haut-gauche (lèvre claire d'un côté, tranche plus sombre de l'autre), filet sombre très
   fin sur la coupe pour décoller le blanc d'un fond clair, léger lustre diagonal.
6. Image par-dessus le papier, export WebP.

## Licences

Les sources sont des photos produit (sites des marques), des fichiers de Wikimedia
Commons (voir la licence de chaque fichier via `page`) et des logos officiels (paquets
`@iconify-json/logos` / `simple-icons`, avatars GitHub). Usage personnel, non commercial,
pour illustrer des objets que Tom possède ou utilise ; les marques appartiennent à leurs
propriétaires. Pour les fichiers Commons sous CC BY / CC BY-SA, l'attribution est dans
`sources.json` (`page`).
