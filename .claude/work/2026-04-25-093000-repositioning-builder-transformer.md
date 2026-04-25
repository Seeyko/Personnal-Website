# Repositioning : Product Builder / Transformation IA

**Status**: in_progress
**Branch**: `feature/repositioning-builder-transformer`
**Started**: 2026-04-25 09:30

## Task

Repositionner éditorialement tomandrieu.com pour refléter le double positionnement de Tom :
- Product Builder (Lead Front-End @ CBA AgatheYOU + side projects)
- Transformation IA (Platform Architect @ CBA, mission 6 mois + Studio Manifeste)

À ne pas toucher : 4 thèmes + switcher, timeline git flow, ton perso.

## Décisions éditoriales validées

- **Hero titre** : `SALUT` (court, blog/perso)
- **Hero citation** : Piste P4
  > Je suis product builder.
  > Mais à force de construire avec l'IA,
  > j'ai commencé à transformer les équipes
  > qui construisent des produits.
  >
  > Maintenant je fais les deux.
- **Header brand** : `TOM ANDRIEU` (inchangé)
- **Nav** : Now · Work · Writing · History · About · Contact
- **Work** : 2 territoires empilés verticalement
  - Product Builder (AgatheYOU, side projects, freelance)
  - Transformation IA (Platform Architect @ CBA · mois 1/6, Studio Manifeste avec CTA externe)
- **/now** : section home, format "avril 2026", source `data/{fr,en}/now.json`
- **Mission CBA exacte** : Platform Architect (Plateforme & IA Agentique), date d'effet 2 avril 2026, durée 6 mois → mois 1/6 au 25 avril 2026

## Files Being Modified

- `frontend/index.html` (hero, nav, sections)
- `frontend/data/{fr,en}/content.json` (textes principaux)
- `frontend/data/{fr,en}/projects.json` (catégorisation Product Builder / Transformation IA)
- `frontend/data/{fr,en}/git-history.json` (ajout branches Platform Architect + Studio Manifeste)
- `frontend/data/{fr,en}/now.json` (NOUVEAU)
- `frontend/i18n/locales/{fr,en}.json` (nav, sections, ui)
- `frontend/i18n/themes/*/{fr,en}.json` (textes par thème)
- `frontend/themes/*/*.js` (rendu hero typewriter, etc.)
- `frontend/css/base.css` (styles hero + section /now)
- `frontend/js/core/content-loader.js` (chargement now.json)

## Progress

- [x] Branche créée
- [ ] Hero refactor
- [ ] Nav restructurée
- [ ] Section /now
- [ ] Work refactor (2 territoires)
- [ ] Writing intégré
- [ ] Contact actualisé
- [ ] Timeline enrichie
- [ ] Test 4 thèmes
- [ ] PR

## Notes/Discoveries

- Le PDF de mission n'est pas extractible automatiquement (pdftoppm absent), Tom a copié-collé le contenu dans le chat.
- L'ancienne section blog est commentée dans index.html mais blog.html existe en page séparée — réactivation prévue côté home.
- La nav passe de 4 items à 6, surveiller le rendu mobile.
