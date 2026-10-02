# Plan : repositionnement éditorial « aider les gens à traverser l'IA »

**Date :** 2026-10-02
**Branche :** `claude/personal-site-ai-text-bb6cae`

## Intention à faire passer

- Ce qui anime Tom : aider les gens à mieux traverser les changements que l'IA amène dans leur travail et leur quotidien.
- L'IA ne doit pas seulement accélérer le travail existant : c'est l'occasion de repartir d'une feuille blanche et de repenser notre rapport au travail.
- La plupart des équipes s'en servent pour aller un peu plus vite sans rien repenser. Le vrai frein n'est pas technique, c'est la peur de ne pas s'y retrouver.
- Le moteur n'est pas de faire grossir le capital des entreprises, c'est d'apporter sa pierre à un rapport au travail plus sain.

## Règle éditoriale

On ne parle que d'intention. Aucune offre de services, aucune structure, aucun associé, aucun produit en préparation n'est mentionné sur le site tant que ce n'est pas officiel.

## Périmètre (textes uniquement, aucun changement de layout)

| Fichier | Clés |
|---|---|
| `frontend/i18n/locales/{fr,en}.json` | meta, hero.quote, about.*, footer.headline*, ui CTA, cro.exitModal, blog.subtitle |
| `frontend/data/{fr,en}/content.json` | meta, hero, about, specs |
| `frontend/data/{fr,en}/now.json` | paragraphe « où j'en suis », octobre 2026 |
| `frontend/data/{fr,en}/git-history.json` | description de la mission Platform Architect |
| `frontend/index.html` | meta description, og:description |

## Contraintes d'écriture

Skill `tom-writing-style` : première personne, nuance, aucun buzzword, pas de tirets cadratins dans le corps, pas de staccato, aucun chiffre inventé.

## Étapes

1. [x] Réécrire FR
2. [x] Adapter EN
3. [x] Valider JSON
4. [x] Vérifier dans le navigateur (FR/EN, thèmes default, terminal, blueprint, retro90s), console propre
5. [ ] Validation du texte par Tom, puis commits atomiques + PR

## Rollback

Textes uniquement : `git revert` des commits suffit.
