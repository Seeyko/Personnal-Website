# Brand assets — Tom Andrieu

Référence complète : [`/BRANDING.md`](../../../BRANDING.md). Règles rapides :

## Blip — la mascotte (mark principal)

Le curseur bloc du prompt `tom@dev:~$` devenu créature pixel (grille 12×12, contour encre `#1a1a1a` constant).

- `blip.svg` — version universelle (corps phosphore `#33ff00`, smirk, pattes).
- `blip-{terminal,blueprint,retro90s,default}.svg` — reskin par thème : corps `#33ff00`/`#00FFFF`/`#FF00FF`/`#3d7a73` + costume (lunettes / casque or / casquette rouge / rien).
- `blip-skate.svg` — pose héro (deck ambre, roues rouges) : bannières, og:image, easter egg Konami.
- `blip-error.svg` — pose 404/erreur (corps rouge, bras de T-Rex, bouche ouverte).
- **Rituel blink (contractuel)** : visage éteint 1 frame toutes les ~1.06 s (`steps(1)`) → Blip redevient le curseur plein, puis rouvre les yeux. Respecter `prefers-reduced-motion`.
- **Règle anti-générique** : jamais publié sans au moins un marqueur propriétaire (smirk asymétrique, pattes, ou costume).

## Autres assets

- `heartbit.svg` — sceau « Built with heart » : cœur pixel rouge, bit-curseur vert clignotant à la place du pixel manquant. Footer, fin d'article, stickers. (Contraste rouge/vert validé en niveaux de gris : lum 0.24 vs 0.72.)
- `favicon-{theme}.svg` — tête de Blip sur fond du thème ; à swapper par `theme-manager.js` au changement de thème.
- `avatar-512.png` — LE MÊME avatar partout (GitHub, LinkedIn, email).
- `og-image.png` — 1200×630 (tagline + Blip en skate) pour `og:image` / `twitter:image`.

## Registre sobre (CV, propales, contextes corporate)

- `mark.svg` / `mark-16.svg` — monogramme T▮ monochrome en `currentColor`.
- `monogram-ta.svg`, `roue-mono.svg`, `roue-couleur.svg` (fonds contrôlés uniquement), `poincon.svg`.
- Même ADN que Blip : le curseur bloc, la baseline, le pixel.

Couleurs : encre `#1a1a1a` · papier `#f8f7f4` · noir CRT `#0a0a0a` · phosphore `#33ff00` · cyan `#00FFFF` · magenta `#FF00FF` · teal `#3d7a73` · ambre `#ffb000` (deck, encre light-safe `#805800`) · rouge incident `#ff3333` (échecs, roues du skate, Heartbit).
