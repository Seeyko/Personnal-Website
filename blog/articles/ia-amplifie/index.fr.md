---
title: "L'IA amplifie ce qui existait déjà"
excerpt: "Deux semaines à construire avec des agents IA. Confirmation : les specs, la doc, la rigueur. Pas du perfectionnisme. De l'anticipation."
publishedAt: "2026-02-15"
draft: false
lang: fr
private: false
---

Deux semaines à creuser comment fonctionnent les systèmes multi-agents. Pas juste utiliser Claude pour debugger, mais vraiment construire : architecture, développement, coordination via un dashboard de tâches que j'ai codé.

Résultat : l'IA ne crée rien. Elle amplifie. Vos bonnes pratiques comme vos mauvaises habitudes.

## BMAD, skills, ADE

BMAD (Brief, Mission, Architecture, Development). Un pattern spec-driven où chaque étape produit des specs formalisées avant la suivante. Atlas fait le brief. Daedalus l'architecture. Héphaestos le code. Hygieia les tests. Chaque agent consomme un livrable documenté. Pas de devinettes.

Claude Code en interne : **skills** (modules encapsulés que l'agent invoque), **agent team** (plusieurs agents spécialisés collaborent), **ADE** (Agentic Development Environment, contexte formalisé pour l'agent).

Ces concepts ne sont pas des "bonnes pratiques". **Ce sont des contraintes architecturales qui forcent la rigueur.** Si tu ne formalises pas tes specs, BMAD ne peut pas fonctionner. Si tu ne structures pas ton environnement, l'ADE devine. Si tu ne documentes pas tes conventions, les skills ne s'appliquent pas de façon cohérente.

L'IA ne compense pas un process flou. Elle l'expose.

## Specs floues, résultats flous

Exemple classique : un PO arrive avec "En tant qu'utilisateur, je veux gérer mes documents."

OK. Mais "gérer" veut dire quoi ? Upload ? Download ? Versionning ? Permissions ? Partage ? Et "documents", c'est quoi ? PDF uniquement ? Tous les formats ? Taille max ?

Deux options viables : **specs précises** (le dev exécute) ou **pas de specs** (le dev a la liberté de décider).

Le pire scénario : **pas de specs claires ET pas de liberté**. Le dev qui pense produit et veut faire un truc propre se fait dire "non, fais pas ce que tu voulais faire, on fera une évol plus tard". On termine le sprint avec une feature qui ne correspond pas à ce que le PM voulait, parce que le PO n'avait pas posé les bonnes questions et le dev n'avait pas la liberté de décider.

Avec l'IA, ce problème est multiplié par dix. Tu lui donnes "fais-moi un système de gestion de documents", elle devine. Ses devinettes sont aussi aléatoires que les miennes. Peut-être pires, parce qu'elle n'a pas le contexte métier accumulé depuis six mois.

Mais tu lui donnes des specs claires (scénarios utilisateurs, contraintes techniques, cas limites, objectif produit), elle code exactement ce qu'il faut. Vite. Proprement. Avec de la doc. Avec des tests.

**Les specs floues ne sont pas un gain de temps.** Elles sont une dette qui explose au moment de l'implémentation. Avec l'IA, cette explosion arrive juste plus vite.

## Ship fast vs ship smart

PostHog a écrit sur [The Hidden Danger of Shipping Fast](https://posthog.com/newsletter/hidden-danger-of-shipping-fast). Ship pour ship, ça crée de la dette produit. Mais Peter Steinberger parle de [Shipping at Inference Speed](https://steipete.me/posts/2025/shipping-at-inference-speed) : avec l'IA, la vélocité change tout. Tu peux tester des hypothèses en quelques jours au lieu de quelques semaines.

Les deux visions sont vraies. L'IA amplifie la vélocité. Mais elle n'amplifie pas le discernement.

Si tu ne sais pas ce qui compte, tu vas juste produire plus vite des choses qui ne comptent pas. Par contre, si tu as une hypothèse claire et des métriques définies, tu peux ship vite, mesurer, apprendre, tuer ou itérer.

Il faut ralentir en amont pour accélérer en aval. Poser les bonnes questions. Définir ce qu'on mesure. Comprendre le besoin utilisateur réel. Et ensuite, laisser l'IA exécuter à vitesse inference.

## Documentation : le savoir tribal, ce fléau

Le savoir tribal : toute la logique métier qui vit dans la tête de trois personnes. Ça casse quand quelqu'un part, quand quelqu'un arrive, quand le projet grandit.

J'ai vu trop de projets où la moitié des décisions d'architecture ne sont écrites nulle part. "Demande à Julien, il saura." Sauf que Julien est en vacances. Ou Julien a démissionné. Ou Julien ne se souvient plus pourquoi il a fait ce choix il y a deux ans.

ADR (Architecture Decision Records). Conventions de code. Guides d'onboarding. Tout ce qui permet à quelqu'un de comprendre le projet sans avoir à interroger les anciens.

L'IA n'a pas accès à ma tête. Elle ne peut pas deviner pourquoi j'ai choisi telle stack, pourquoi telle logique existe, pourquoi telle convention s'applique. Si ce n'est pas écrit, elle devine. Et ses devinettes sont aléatoires.

**Si votre système nécessite du savoir tribal pour être compris, il ne peut pas être amplifié par l'IA.** Il peut juste être cassé plus vite.

## L'asymétrie dev/PM

L'IA compresse la chaîne de production. Avant : un PM pour définir le besoin, un PO pour écrire les user stories, un lead pour valider l'architecture, un dev pour coder, un QA pour tester. Chaque étape était un handoff. Chaque handoff, une perte d'information.

Maintenant, je peux couvrir cette chaîne presque seul. Parce que l'IA accélère l'exécution. Mais ça ne fonctionne que si je sais faire le boulot de tout le monde. Comprendre le besoin utilisateur comme un PM. Formaliser les specs comme un PO. Architecturer comme un lead. Et laisser l'IA coder.

Il y a une asymétrie. Un dev qui apprend à penser produit, c'est accessible. Il a déjà la rigueur analytique. Il comprend les contraintes techniques. Il sait ce qui est faisable. Un PM qui apprend à coder avec l'IA, c'est plus dur. Parce que prototyper une app en 15 minutes, tout le monde peut le faire. Mais la mettre en production avec de la sécu, du scaling, de l'observabilité, c'est un autre niveau.

Les profils techniques ont un avantage structurel. À condition de ne pas rester "juste codeurs".

## Conclusion

L'IA ne m'a rien appris de nouveau sur comment travailler. Elle a confirmé que les specs claires, la doc complète, la data avant les features, le contexte explicite, c'était déjà la bonne direction. C'est juste devenu critique maintenant.

Parce que l'IA amplifie. Si vos pratiques sont solides, elle les multiplie. Si elles sont floues, elle multiplie le chaos.
