# Brand assets — Tom Andrieu

Référence complète : [`/BRANDING.md`](../../../BRANDING.md). Règles rapides :

- **In-site : toujours le monochrome `currentColor`.** Les marks héritent de l'encre du thème actif (phosphore, blanc, navy, encre). Jamais de version multicolore dans le site.
- `mark.svg` — T▮, mark principal (viewBox 24). Le curseur peut clignoter in-site (`steps(2)` ~1.1s, respecter `prefers-reduced-motion`).
- `mark-16.svg` — variante grille entière pour ≤ 32px (favicon).
- `favicon-{theme}.svg` — couleurs figées pour l'onglet ; à swapper par `theme-manager.js` au changement de thème.
- `monogram-ta.svg` — monogramme alternatif TA (avatar rond de secours).
- `roue-mono.svg` / `roue-couleur.svg` — usage secondaire ; la version couleur UNIQUEMENT sur fonds contrôlés `#0a0a0a` / `#f8f7f4`.
- `poincon.svg` — tampon (fin d'article, badge « fait main », fonds bruités retro90s).
- `avatar-512.png` — LE MÊME avatar partout (GitHub, LinkedIn, email).
- `og-image.png` — 1200×630 pour les balises `og:image` / `twitter:image`.

Couleurs : encre `#1a1a1a` · papier `#f8f7f4` · noir CRT `#0a0a0a` · phosphore `#33ff00` (petite surface, jamais en fond, jamais sur papier) · ambre `#ffb000` (encre light-safe `#805800`) · rouge incident `#ff3333` (réservé aux échecs documentés).
