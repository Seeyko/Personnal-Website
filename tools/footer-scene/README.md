# Footer « home scene » : de l'image à la vidéo détourée

> **État au 5 oct. 2026** : les cinq thèmes affichent une vidéo détourée.
>
> Vidéo sur fond magenta plat (une seule couleur exacte) :
>
> ```
> python tools/footer-scene/key_exact.py "…/footer-terminal.mp4" --theme terminal --jobs 2
> ```
>
> Le script écrit les vidéos et les images dans `frontend/assets/footer/` et affiche l'entrée
> `SCENES` à recopier dans `frontend/js/components/site-footer.js` (puis changer `ASSET_VERSION`
> et le `?v=` du script dans `index.html`). Régler ensuite `--sf-lift` du thème dans
> `frontend/css/site-footer.css` pour que la cime arrive sous la barre légale.
>
> Les nuages clairs viennent de la première image et ne bougent pas : le modèle vidéo les
> repeint en rose en cours de boucle. Dans blueprint, l'arbre a leurs couleurs et reste figé
> lui aussi ; dans terminal, les nuages verts sont ceux de la vidéo.
>
> La suite de ce document décrit l'ancienne pipeline (`prep_loopback.py`, `key_magenta.py`).

Une peinture par thème, animée en boucle, avec le ciel transparent.

## Pourquoi pas magenta → vidéo → détourage

Le détourage d'une **image** sur fond magenta est propre. Celui d'une **vidéo** ne l'est pas :
le modèle vidéo mélange le magenta aux feuilles qui bougent (flou de mouvement, reflets roses
peints sur le feuillage, compression). Dans ces pixels on ne sait plus ce qui est rose d'origine
et ce qui est du fond, et l'erreur change à chaque frame : les feuilles clignotent.

On détoure donc l'image fixe, puis on anime la peinture posée sur **la couleur de la page du
thème**. Ce que le modèle mélange aux bords des feuilles est alors la couleur de la page, qui
disparaît une fois la vidéo posée sur la page.

| Thème | Couleur de fond (page) |
|---|---|
| default | `#F8F7F4` crème |
| terminal | `#0A0A0A` noir |
| blueprint | `#003366` bleu plan |
| retro90s | `#C0C0C0` gris Windows |
| fps | `#ECD7AE` sable (dégradé du fond, autour du footer) |

## Étapes

1. **Image sur fond magenta** (comme avant), nommée `footer-<theme>.png|webp` (`footer-retro` marche).
2. **Préparer pour fal** :
   ```
   python tools/footer-scene/prep_loopback.py "…/stills/footer-default.webp" "…/stills/footer-fps.webp" …
   ```
   Écrit dans `…/stills/loopback/` :
   - `footer-<theme>-loopback.png` : la peinture sur la couleur de page, **à envoyer à fal** ;
   - `footer-<theme>-still.png` : la peinture détourée (RGBA), sert à l'étape 4.
3. **Animer** `footer-<theme>-loopback.png` avec `pixelcult/loopback-video` (prompts plus bas).
   Enregistrer la vidéo en `footer-<theme>.mp4`.
4. **Détourer et intégrer** :
   ```
   python tools/footer-scene/key_magenta.py "…/footer-default.mp4" --bg "#F8F7F4" --still "…/loopback/footer-default-still.png"
   ```
   `--bg` : la couleur du tableau ; `--still` : ce qui est plein dans l'image fixe (loin de ses
   bords) n'est jamais détouré, et la ligne de mer y est lue (rien n'est touché en dessous).
   Le script encode les vidéos du site, les posters, et met `SCENES` à jour.

## Prompts loopback

Base commune (anglais, à coller tel quel), puis la ligne de style du thème.

```
Seamless looping ambient animation of this illustration. Static camera: no pan, no zoom,
no parallax, the framing never moves.

The empty area above the landscape is a plain flat background of one solid colour
({COLOUR}). Keep it exactly that colour, perfectly flat and still in every frame: no sky,
no gradient, no glow, no light rays, no texture, no new clouds, no birds.

Motion, all gentle and slow:
- the clouds drift a few pixels sideways and come back, their shapes stay the same;
- the sea: small waves roll in and the foam breaks softly on the beach;
- the leaves flutter lightly inside the tree canopy, but the outline of each tree
  against the background stays fixed (the trees don't sway, the canopy edge doesn't move);
- flowers and grass sway slightly in the breeze;
- the couple stands still, breathing; the cats move a little (tail, head).

Keep the exact art style, colours, line work and level of detail of the input image.
Nothing new appears, nothing disappears. The last frame matches the first frame.
```

Ligne de style à ajouter selon le thème :

- **default** : `{COLOUR}` = `warm off-white #F8F7F4` — `Style: detailed pixel-art painting, Provence garden by the sea, sunny afternoon.`
- **terminal** : `{COLOUR}` = `pure black #0A0A0A` — `Style: green-phosphor terminal art made of code glyphs; the glyphs may flicker subtly, like a CRT. No colour other than greens on black.`
- **blueprint** : `{COLOUR}` = `dark blueprint blue #003366` — `Style: architectural blueprint drawing in cyan and white line work; the lines stay crisp, no shading appears.`
- **retro90s** : `{COLOUR}` = `flat light grey #C0C0C0` — `Style: 16-bit pixel art with hard pixel edges and a limited palette; keep the pixels sharp, no blur, no anti-aliasing.`
- **fps** : `{COLOUR}` = `flat sand beige #ECD7AE` — `Style: game-art painting of a Mediterranean village (de_dust); the olive tree stays still, only its leaves shimmer.`

### Variante : rester sur le fond magenta

Envoyer l'image magenta d'origine, puis détourer avec `key_magenta.py <vidéo> --still
…/loopback/footer-<theme>-still.png` (sans `--bg`). Prompt :

```
Seamless looping ambient animation of this illustration. Locked-off static camera:
no pan, no zoom, no parallax, no camera shake.

The background is a chroma-key backdrop: flat pure magenta (#FF00FF), one solid colour,
identical in every frame. It is not a sky and not a light source: it casts no light,
no glow, no reflection and no pink tint on the scene. Keep every edge against it
clean and sharp: no motion blur, no soft halo, no magenta fringe, no bleeding.

The silhouettes against the magenta never move: trees, roof, house and hills keep
exactly the same outline in every frame. Only the inside of the canopy is alive:
a few leaves shimmer in place, well inside the foliage, away from its edges.

Other motion, gentle and slow:
- the clouds keep their shape and drift at most a few pixels, then come back;
- the sea: small waves roll in, foam breaks softly on the beach;
- flowers and grass at the bottom sway slightly in the breeze;
- the couple stands still, breathing; the cats move a little (tail, head).

Keep the exact art style, colours, line work and level of detail of the input image.
Nothing new appears, nothing disappears. The last frame matches the first frame.
```

Plus la ligne de style du thème (liste ci-dessus, sans la partie `{COLOUR}`).

Le point qui compte le plus : **le contour des arbres ne bouge pas**. Le ciel n'est jamais
détouré là où l'image fixe est pleine. Si la silhouette reste en place, il n'y a plus rien à
deviner sur les bords.
