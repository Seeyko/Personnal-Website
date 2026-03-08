---
title: "L'IA amplifie ce qui existait déjà"
excerpt: "Deux semaines à construire avec des agents IA. Et la confirmation que tout ce que je pousse depuis des années — les specs, la doc, la rigueur — ce n'était pas du perfectionnisme. C'était de l'anticipation."
publishedAt: "2026-02-15"
draft: false
lang: fr
private: false
---

J'ai passé les deux dernières semaines à construire avec des agents IA. Pas juste utiliser Claude pour debugger du code, mais vraiment construire un système où des agents architecturent, développent, se coordonnent entre eux via un dashboard de tâches que j'ai codé. Et honnêtement, ce que j'ai découvert, c'est que l'IA ne m'a rien appris de nouveau. Elle m'a juste confirmé que tout ce que je poussais depuis des années dans mes équipes était la bonne direction.

Parce que l'IA ne crée rien. Elle amplifie. Mes bonnes pratiques comme mes mauvaises habitudes. Si mon process est solide, elle le multiplie. Si mon process est flou, elle multiplie le chaos. Ces deux semaines m'ont donné raison sur à peu près tout ce que je défends depuis longtemps, parfois contre l'avis général, et ça me fait réfléchir.

## Ce que j'ai vraiment découvert

En creusant les mécanismes internes de Claude Code et des systèmes multi-agents, j'ai découvert la méthode BMAD (Breakthrough Method for Agile AI Driven Development). Un workflow où chaque étape produit des specs formalisées avant de passer à la suivante. Brief → PRD (Product Requirements Document) → Architecture → Développement. Chaque phase produit un livrable documenté que la suivante consomme. Pas de devinettes. Pas d'implicite. Tout est écrit. Dans mon système, Atlas fait le brief et la recherche. Daedalus conçoit l'architecture. Héphaestos développe. Hygieia teste.

J'ai aussi exploré les skills, ces modules encapsulés que l'agent peut invoquer, l'agent team où plusieurs agents spécialisés collaborent, et les Agentic Development Environments, des environnements structurés où les agents évoluent avec du contexte formalisé. Et ce qui m'a frappé, c'est que ce ne sont pas juste des "bonnes pratiques". Ce sont des contraintes architecturales qui forcent la rigueur. Si je ne formalise pas mes specs, la méthode BMAD ne peut pas fonctionner. Si je ne structure pas mon environnement, l'ADE n'a pas de contexte et l'agent devine. Si je ne documente pas mes conventions, les skills ne s'appliquent pas de façon cohérente.

Et là, tout se rejoint avec ce que je défends depuis des années. Ces systèmes ne fonctionnent que si le process est solide. L'IA ne compense pas un process flou. Elle l'expose. Brutalement.

## Pourquoi je pose toujours des questions quand les specs ne sont pas claires

Depuis des années, je pose des questions quand un PO débarque avec des user stories vagues. "En tant qu'utilisateur, je veux pouvoir gérer mes documents." OK, mais ça veut dire quoi "gérer" ? Upload ? Download ? Versionning ? Permissions ? Partage ? Et "documents", c'est quoi ? PDF uniquement ? Tous les formats ? Quelle taille max ? Je ne fais pas ça pour emmerder le monde. Je le fais parce que j'ai appris à mes dépens que les specs floues, ça se paie toujours au moment de l'implémentation.

Il y a deux options viables : soit on a des specs précises et je les exécute, soit on n'a pas de specs et on me laisse la liberté de décider. Le pire scénario, c'est le mélange des deux. Pas de specs claires ET pas de liberté. Je pense produit, je veux faire un truc propre, et on me dit "non, fais pas ce que tu voulais faire, on fera une évol plus tard". On termine le sprint avec une feature qui ne correspond pas à ce que le PM voulait, parce que le PO n'avait pas posé les bonnes questions et moi je n'avais pas la liberté de décider.

Avec l'IA, ce problème est multiplié par dix. Si je lui donne "fais-moi un système de gestion de documents", elle va deviner. Ses devinettes vont être aussi aléatoires que les miennes. Peut-être pires, parce qu'elle n'a pas le contexte métier que j'ai accumulé en travaillant sur le projet depuis six mois. Mais si je lui donne des specs claires, des scénarios utilisateurs, des contraintes techniques, des cas limites, un objectif produit, elle va coder exactement ce qu'il faut. Vite. Proprement. Avec de la doc. Avec des tests. Souvent mieux que ce que j'aurais fait moi-même, parce qu'elle ne prend pas de raccourcis par flemme.

Les specs floues ne sont pas un gain de temps. Elles sont une dette qui explose au moment de l'implémentation. Avec l'IA, cette explosion arrive juste plus vite. Et ces deux semaines me l'ont prouvé.

## La tension entre ship fast et ship smart

Je lis beaucoup sur ces deux approches. PostHog a écrit sur [The Hidden Danger of Shipping Fast](https://posthog.com/newsletter/hidden-danger-of-shipping-fast). Ship pour ship, sans mesurer, sans savoir si ça sert vraiment, ça crée de la dette produit. Des features que personne n'utilise mais qu'il faut maintenir. Peter Steinberger, de son côté, parle de [Shipping at Inference Speed](https://steipete.me/posts/2025/shipping-at-inference-speed). Avec l'IA, la vélocité change tout. Tu peux tester des hypothèses en quelques jours au lieu de quelques semaines. Itérer plus vite. Apprendre plus vite.

J'apprécie les deux visions. Les deux sont vraies. L'IA amplifie la vélocité, mais elle n'amplifie pas le discernement. Si je ne sais pas ce qui compte, je vais juste produire plus vite des choses qui ne comptent pas. Par contre, si j'ai une hypothèse claire, des métriques définies, je peux ship vite, mesurer, apprendre, tuer ou itérer. Je pense qu'il faut ralentir en amont pour accélérer en aval. Poser les bonnes questions. Définir ce qu'on mesure. Comprendre le besoin utilisateur réel, pas fantasmé. Et ensuite, laisser l'IA exécuter à vitesse inference.

## Le savoir tribal, ce fléau que j'essaie d'éliminer depuis toujours

Un combat de longue date dans mes équipes : documenter. Tout. Pas parce que c'est joli. Parce que le savoir tribal, toute la logique métier qui vit dans la tête de trois personnes, ça casse quand quelqu'un part, quand quelqu'un arrive, quand le projet grandit. J'ai vu trop de projets où la moitié des décisions d'architecture ne sont écrites nulle part. "Demande à Julien, il saura." Sauf que Julien est en vacances. Ou Julien a démissionné. Ou Julien ne se souvient plus pourquoi il a fait ce choix il y a deux ans.

Alors je pousse la doc. Les ADR (Architecture Decision Records). Les conventions de code. Les guides d'onboarding. Tout ce qui permet à quelqu'un de comprendre le projet sans avoir à interroger les anciens. Avec l'IA, c'est encore plus évident. L'IA n'a pas accès à ma tête. Elle ne peut pas deviner pourquoi j'ai choisi telle stack, pourquoi telle logique existe, pourquoi telle convention s'applique. Si ce n'est pas écrit, elle devine. Et ses devinettes sont aléatoires.

Si mon système nécessite du savoir tribal pour être compris, il ne peut pas être amplifié par l'IA. Il peut juste être cassé plus vite. Ces deux semaines me l'ont prouvé.

## Ce qui me fascine : l'asymétrie entre dev et PM

Ce qui me fascine, c'est que l'IA compresse la chaîne de production. Avant, il fallait un PM pour définir le besoin, un PO pour écrire les user stories, un lead pour valider l'architecture, un dev pour coder, un QA pour tester. Chaque étape était un handoff. Chaque handoff, une perte d'information. Maintenant, je peux couvrir cette chaîne presque seul. Parce que l'IA accélère l'exécution. Mais ça ne fonctionne que si je sais faire le boulot de tout le monde. Comprendre le besoin utilisateur comme un PM. Formaliser les specs comme un PO. Architecturer comme un lead. Et laisser l'IA coder.

Il y a une asymétrie ici. Un dev qui apprend à penser produit, c'est accessible. J'ai déjà la rigueur analytique. Je comprends les contraintes techniques. Je sais ce qui est faisable. Un PM qui apprend à coder avec l'IA, c'est plus dur. Parce que prototyper une app en 15 minutes, tout le monde peut le faire. Mais la mettre en production avec de la sécu, du scaling, de l'observabilité, c'est un autre niveau.

Je pense que les profils techniques ont un avantage structurel. À condition de ne pas rester "juste codeurs". Et ça, ça me fait réfléchir sur la direction que je veux prendre.

## Ma conclusion (pour l'instant)

Deux semaines, c'est court. Je ne prétends pas avoir tout compris. Mais voilà ce que je retiens. L'IA ne m'a rien appris de nouveau sur comment travailler. Elle m'a juste confirmé que ce que je faisais déjà était la bonne direction. Les specs claires. La doc complète. La data avant les features. Le contexte explicite. Tout ça, c'était déjà important avant. C'est juste devenu critique maintenant.

Parce que l'IA amplifie. Si mes pratiques sont solides, elle les multiplie. Si elles sont floues, elle multiplie le chaos. Et peut-être que c'est pour ça que je poserai toujours des questions quand les specs ne sont pas claires. Pas par perfectionnisme. Par pragmatisme. Parce que je sais que tôt ou tard, le flou se paie. Avec ou sans IA.
