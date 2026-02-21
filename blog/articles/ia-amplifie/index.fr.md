---
title: "L'IA amplifie ce qui existait déjà"
excerpt: "Deux semaines à construire avec des agents IA. Et la confirmation que tout ce que je pousse depuis des années dans mes équipes — les specs, la doc, la rigueur — n'était pas du perfectionnisme. C'était de l'anticipation."
publishedAt: "2026-02-15"
draft: false
lang: fr
private: true
passwordHash: "$2b$10$Gcd/rVDo9AKWCKFFWrMniuBI69zciDjaQHGjXKPaMxByO49jf6dZ."
---

J'ai passé les deux dernières semaines à construire avec des agents IA. Pas juste utiliser Claude pour debugger du code, mais vraiment construire un système où des agents architecturent, développent, se coordonnent entre eux via un dashboard de tâches que j'ai codé.

Et voilà ce que ça m'a confirmé : tout ce que je pousse depuis des années dans mes équipes — la doc, les specs claires, la rigueur sur le contexte — ce n'était pas du perfectionnisme inutile. C'était de l'anticipation.

Parce que l'IA ne crée rien. Elle amplifie ce qui existe déjà. Vos bonnes pratiques comme vos mauvaises habitudes. Et ces deux semaines m'ont donné raison sur à peu près tout ce que je défends depuis longtemps, parfois contre l'avis général.

## Ce que j'ai construit

J'ai monté ce que j'appelle le Pantheon. Sept agents spécialisés qui collaborent via Olympus, un système de tâches en mode Jira que j'ai développé pour les orchestrer. Un agent orchestrateur (Main), un architecte (Daedalus), un dev (Héphaestos), un QA (Hygieia), un chercheur (Atlas), un scrum master (Hermès), un writer (Homère).

Sur certaines tâches, c'est magique. Un scaffold de projet complet en 15 minutes. Une architecture documentée en 10 minutes. Des specs techniques générées à partir d'une conversation. Le genre de vélocité qu'on n'atteint jamais avec une équipe humaine.

Sur d'autres, c'est le chaos total. L'agent qui génère 200 messages Discord en 13 minutes parce qu'il est coincé dans une boucle générative. L'architecte qui propose une stack que je dois corriger trois fois. Le dev qui code pendant 20 minutes dans la mauvaise direction parce que les specs n'étaient pas assez précises.

La différence entre les deux ? Ce n'est pas l'IA. C'est mon process. Quand j'ai pris le temps de formaliser le contexte, de documenter les conventions, d'écrire des specs claires, l'IA a brillé. Quand j'ai été flou, elle a amplifié le flou.

## Pourquoi je pose des questions quand les specs ne sont pas claires

Depuis des années, je pose des questions quand un PO débarque avec des user stories vagues. "En tant qu'utilisateur, je veux pouvoir gérer mes documents." OK, mais ça veut dire quoi "gérer" ? Upload ? Download ? Versionning ? Permissions ? Partage ? Et "documents", c'est quoi ? PDF uniquement ? Tous les formats ? Quelle taille max ?

J'essaie de comprendre pourquoi les specs sont floues. Et j'essaie d'expliquer pourquoi c'est mieux avec des specs claires. Parce qu'il y a deux options viables : soit on a des specs précises et le dev exécute, soit on n'a pas de specs et on laisse la liberté au dev de décider.

Le pire scénario, c'est le mélange des deux. Pas de specs claires ET pas de liberté. Le dev qui pense produit et veut faire un truc propre se fait dire "non, fais pas ce que tu voulais faire, on fera une évol plus tard". C'est droit dans le mur. On termine le sprint avec une feature qui ne correspond pas à ce que le PM voulait, parce que le PO n'avait pas posé les bonnes questions et le dev n'avait pas la liberté de décider.

Avec l'IA, ce problème est multiplié par dix. Si je lui donne "fais-moi un système de gestion de documents", elle va deviner. Et ses devinettes vont être aussi aléatoires que les miennes. Peut-être pires, parce qu'elle n'a pas le contexte métier que j'ai accumulé en travaillant sur le projet depuis six mois.

Mais si je lui donne des specs claires — scénarios utilisateurs, contraintes techniques, cas limites, objectif produit — elle va coder exactement ce qu'il faut. Vite. Proprement. Avec de la doc. Avec des tests. Souvent mieux que ce que j'aurais fait moi-même, parce qu'elle ne prend pas de raccourcis par flemme.

Ces deux semaines m'ont prouvé ce que je dis depuis longtemps : les specs floues ne sont pas un gain de temps. Elles sont une dette qui explose au moment de l'implémentation. Avec l'IA, cette explosion arrive juste plus vite.

## La tension entre ship fast et ship smart

Autre truc que je pousse depuis des années : je demande de la data aux PM avant de coder une feature. Combien d'utilisateurs vont l'utiliser ? À quelle fréquence ? Quelles sont les métriques de succès ? Qu'est-ce qu'on mesure pour savoir si ça marche ?

Souvent, la réponse est "on verra après le lancement". Sauf qu'après le lancement, personne ne mesure rien. La feature existe, on passe à la suivante, et six mois plus tard on se rend compte que personne ne l'utilise. PostHog a écrit là-dessus : [The Hidden Danger of Shipping Fast](https://posthog.com/newsletter/hidden-danger-of-shipping-fast). Ship pour ship, ça crée de la dette produit.

Mais il y a l'autre côté. Stefan Petre écrit sur [Shipping at Inference Speed](https://steipete.me/posts/2025/shipping-at-inference-speed) — avec l'IA, la vélocité change tout. Tu peux tester des hypothèses en quelques jours au lieu de quelques semaines. Itérer plus vite. Apprendre plus vite.

J'apprécie les deux visions. Et j'essaie d'en tirer quelque chose.

L'IA amplifie la vélocité. Ça, c'est clair. Mais elle n'amplifie pas le discernement. Si tu ne sais pas ce qui compte, tu vas juste produire plus vite des choses qui ne comptent pas. Par contre, si tu as une hypothèse claire et des métriques définies, tu peux ship vite, mesurer, apprendre, tuer ou itérer.

Ces deux semaines m'ont confirmé qu'il faut ralentir en amont pour accélérer en aval. Poser les bonnes questions. Définir ce qu'on mesure. Comprendre le besoin utilisateur réel, pas fantasmé. Et ensuite, laisser l'IA exécuter à vitesse inference.

## Le savoir tribal, ce fléau que j'essaie d'éliminer depuis toujours

Un combat de longue date dans mes équipes : documenter. Tout. Pas parce que c'est joli. Parce que le savoir tribal — toute la logique métier qui vit dans la tête de trois personnes — ça casse quand quelqu'un part, quand quelqu'un arrive, quand le projet grandit.

J'ai vu trop de projets où la moitié des décisions d'architecture ne sont écrites nulle part. "Demande à Julien, il saura." Sauf que Julien est en vacances. Ou Julien a démissionné. Ou Julien ne se souvient plus pourquoi il a fait ce choix il y a deux ans.

Alors je pousse la doc. Les ADR (Architecture Decision Records). Les conventions de code. Les guides d'onboarding. Tout ce qui permet à quelqu'un de comprendre le projet sans avoir à interroger les anciens.

Avec l'IA, c'est encore plus évident. L'IA n'a pas accès à ma tête. Elle ne peut pas deviner pourquoi j'ai choisi telle stack, pourquoi telle logique existe, pourquoi telle convention s'applique. Si ce n'est pas écrit, elle devine. Et ses devinettes sont aléatoires.

Ces deux semaines m'ont donné raison sur un point simple : si votre système nécessite du savoir tribal pour être compris, il ne peut pas être amplifié par l'IA. Il peut juste être cassé plus vite.

## Ce que ça change pour moi (et pourquoi ça me fascine)

Honnêtement, je ne découvre rien. Je confirme. Tout ce que je défends depuis des années — specs claires, doc complète, data avant features, contexte explicite — c'était déjà la bonne approche. L'IA rend juste les conséquences de ne pas le faire beaucoup plus visibles, beaucoup plus rapides.

Ce qui me fascine, c'est autre chose. C'est que l'IA compresse la chaîne de production. Avant, il fallait un PM pour définir le besoin, un PO pour écrire les user stories, un lead pour valider l'architecture, un dev pour coder, un QA pour tester. Chaque étape était un handoff. Chaque handoff, une perte d'information.

Maintenant, je peux couvrir cette chaîne presque seul. Parce que l'IA accélère l'exécution. Mais ça ne fonctionne que si je sais faire le boulot de tout le monde. Comprendre le besoin utilisateur comme un PM. Formaliser les specs comme un PO. Architecturer comme un lead. Et laisser l'IA coder.

Il y a une asymétrie ici. Un dev qui apprend à penser produit, c'est accessible. Il a déjà la rigueur analytique. Il comprend les contraintes techniques. Il sait ce qui est faisable. Un PM qui apprend à coder avec l'IA, c'est plus dur. Parce que prototyper une app en 15 minutes, tout le monde peut le faire. Mais la mettre en production avec de la sécu, du scaling, de l'observabilité, c'est un autre niveau.

Je pense que les profils techniques ont un avantage structurel. À condition de ne pas rester "juste codeurs".

## Ma conclusion (pour l'instant)

Deux semaines, c'est court. Je ne prétends pas avoir tout compris. Mais voilà ce que je retiens.

L'IA ne m'a rien appris de nouveau sur comment travailler. Elle m'a juste confirmé que ce que je faisais déjà était la bonne direction. Les specs claires. La doc complète. La data avant les features. Le contexte explicite. Tout ça, c'était déjà important avant. C'est juste devenu critique maintenant.

Parce que l'IA amplifie. Si vos pratiques sont solides, elle les multiplie. Si elles sont floues, elle multiplie le chaos.

Et peut-être que c'est pour ça que je poserai toujours des questions quand les specs ne sont pas claires. Pas par perfectionnisme. Par pragmatisme. Parce que je sais que tôt ou tard, le flou se paie. Avec ou sans IA.

---

*Tom Andrieu — Vaucluse, février 2026*
