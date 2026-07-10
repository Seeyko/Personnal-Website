# Motion — les scènes de vie de Blip & Cathode

Cinq scènes de character animation pixel-art (12 principes : anticipation, squash & stretch
en frames redessinées, arcs, follow-through, action secondaire). Chaque dossier contient :

- `fragment.html` — **le livrable d'intégration** : un unique `<div class="mscene" id="ms-<nom>">`
  autonome (460×420, classes préfixées, aucune fuite globale, `prefers-reduced-motion` géré).
  À poser tel quel sur fond sombre (#0a0a0a).
- `index.html` — démo standalone + harnais de debug `#t=MS` (fige le cycle à l'instant MS
  via `document.getAnimations()`, pour screenshoter une frame précise).
- `build.py` / `frames.py` (si présents) — pipeline de régénération des frames pixel et des keyframes.

| Scène | Cycle | JS | Usage site suggéré |
|---|---|---|---|
| `scene-idle` | ~15 s | IIFE optionnelle | Header / coin de page, présence permanente |
| `scene-jongle` | 12 s | aucun | Section contact ou footer (« built with heart ») |
| `scene-skate` | ~10 s | aucun | Easter egg Konami, page Ride My Park |
| `scene-cathode` | 16 s | aucun | Theme switcher, loading screen |
| `scene-duo` | ~18 s | IIFE optionnelle | 404 réconfortante, page /brand |
