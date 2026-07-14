# Brand assets — Tom Andrieu

Référence complète : [`/BRANDING.md`](../../../BRANDING.md). Règles rapides :

## Blip — la mascotte (mark principal)

Silhouette **curseur de souris** (pointe haut-gauche, bord gauche vertical, diagonale) sur corps bloc terminal. Grille 24×24, pixel-art complet : rampe 4 tons, lumière sur la diagonale, dithering, scanlines CRT, contour encre `#12120f` constant.

- `blip.svg` — version universelle (corps phosphore, smirk, blush, pattes).
- `blip-{terminal,blueprint,retro90s,default}.svg` — reskin par thème (swap de palette) + costume : lunettes noires / casque or sur la pente / casquette rouge à l'envers + visière / teal nature.
- `blip-skate.svg` — pose héro (deck ambre, roues rouges) : bannières, og:image, easter egg Konami.
- `blip-error.svg` — pose 404/erreur (palette rouge, bras de T-Rex, bouche ouverte + langue).
- **Rituel blink (contractuel)** : visage éteint 1 frame toutes les ~1.06 s (`steps(1)`) → Blip redevient un simple curseur, puis rouvre les yeux. Respecter `prefers-reduced-motion`.
- **Règle anti-générique** : jamais publié sans au moins un marqueur propriétaire (smirk asymétrique, pattes, ou costume).

## Props

- `prop-coffee.svg` — le café du builder de nuit : mug crème à liseré ambre, 2 frames de vapeur (`.s1`/`.s2`, à alterner en `steps(1)` 1.2 s). Accessoire d'idle de Blip.
- `heartbit.svg` fait aussi office de ballon : la jongle rebondit sur la pointe de Blip (specs dans BRANDING.md §Animations).

## Cathode — le compagnon

Moniteur CRT sur pattes dont l'écran-visage suit le thème : `cathode.svg` (terminal) + `cathode-{blueprint,retro90s,default}.svg`. Territoire : theme switcher, loading screen, illustrations, easter eggs. Jamais en logo/avatar (c'est Blip).

## Autres assets

- `heartbit.svg` — sceau « Built with heart » : cœur pixel rouge, bit-curseur vert clignotant à la place du pixel manquant. Footer, fin d'article, stickers. (Contraste rouge/vert validé en niveaux de gris : lum 0.24 vs 0.72.)
- `favicon-{theme}.svg` — tête de Blip aux couleurs du thème, fond transparent, viewBox recadré pile sur le sprite ; à swapper par `theme-manager.js` au changement de thème.
- `avatar-512.png` — LE MÊME avatar partout (GitHub, LinkedIn, email).
- `og-image.png` — 1200×630 (tagline + Blip en skate) pour `og:image` / `twitter:image`.

## Registre sobre (CV, propales, contextes corporate)

- `mark.svg` / `mark-16.svg` — monogramme T▮ monochrome en `currentColor`.
- `monogram-ta.svg`, `roue-mono.svg`, `roue-couleur.svg` (fonds contrôlés uniquement), `poincon.svg`.
- Même ADN que Blip : le curseur bloc, la baseline, le pixel.

Couleurs : encre `#1a1a1a` · papier `#f8f7f4` · noir CRT `#0a0a0a` · phosphore `#33ff00` · cyan `#00FFFF` · magenta `#FF00FF` · teal `#3d7a73` · ambre `#ffb000` (deck, encre light-safe `#805800`) · rouge incident `#ff3333` (échecs, roues du skate, Heartbit).
