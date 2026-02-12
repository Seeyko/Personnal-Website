---
title: "Le shift du métier de développeur"
excerpt: "L'IA change le métier. Les développeurs qui s'impliquent dans le produit survivront. Les autres seront automatisés."
publishedAt: "2026-02-12"
draft: false
lang: fr
private: true
passwordHash: "$2a$10$rpI8Eg912NE7ujSMZ/xPouaPAC/M7vFWTZVfLfBjILCiYT8bXYfi."
---

Le métier de développeur est en train de changer. L'IA accélère tout, mais le mouvement est plus profond — c'est une question de rôle, de responsabilité, et de sens.

Cet article, c'est ma vision de ce vers quoi le métier pourrait évoluer. Ce n'est pas une vérité absolue. Tous les développeurs ne voudront pas prendre ce chemin. Mais c'est ce que j'observe, ce que j'expérimente, et ce qui me semble la direction la plus intéressante pour construire de meilleurs produits.

## Le problème : exécuter sans comprendre

Développer, aujourd'hui, dans beaucoup d'organisations, ça ressemble à ça : on te donne une user story, tu l'estimes, tu la développes, tu pousses en prod. Repeat. Le problème, c'est que tu ne sais pas pourquoi tu fais ce que tu fais. La décision a été prise ailleurs, par d'autres personnes. Si la feature ne marche pas, si personne ne l'utilise — ce n'est pas ton problème. Tu as livré 100% du sprint, mission accomplie.

Sauf que livrer 100% des sprints, ce n'est pas la même chose qu'avoir un impact réel. Quand tu codes pendant des mois sans jamais voir cet impact, sans jamais parler aux gens qui utilisent ce que tu construis, ça devient creux. Ça devient un job comme un autre.

## Le problème des silos

Cette déconnexion vient des silos : les PM définissent le "quoi", les designers le "comment", les devs construisent ce qu'on leur a donné. En théorie, c'est propre — chacun son domaine. En pratique, c'est absurde.

Les développeurs ont souvent une compréhension technique qui pourrait drastiquement améliorer le produit, mais on ne leur demande jamais leur avis avant que tout soit décidé. Les PM ont parfois des idées brillantes, mais déconnectées de la réalité technique, et ça finit en négociations stériles ou en features trop complexes pour ce qu'elles apportent.

Le vrai problème : **personne n'est vraiment responsable du résultat final.** Le PM dit "j'ai défini le besoin". Le dev dit "j'ai livré la feature". Mais si ça ne marche pas ? Personne. Ou tout le monde. Ce qui revient au même.

## Ce qu'un dev senior veut vraiment

Je me suis rendu compte que ce qui me motive — et ce qui motive beaucoup de développeurs seniors — ce n'est pas juste coder. C'est avoir :

**Ownership.** Être responsable d'un bout de produit. Pas juste responsable du code — responsable du résultat utilisateur. Si ça marche, c'est grâce à moi. Si ça ne marche pas, c'est à moi de fixer.

**Impact.** Savoir que ce que je construis change vraiment quelque chose pour les gens qui l'utilisent. Des vrais game-changers, pas des features marketing.

**Autonomie.** La liberté de décider comment résoudre un problème, sans me contenter d'appliquer une solution déjà choisie par quelqu'un d'autre.

**Vision.** Comprendre où on va et pourquoi on fait ce qu'on fait. Voir comment ça s'inscrit dans une roadmap claire, sans changements de direction toutes les deux semaines.

Beaucoup d'organisations ne sont pas structurées pour offrir ça. Elles sont structurées pour contrôler : sprints, story points, vélocité, daily stand-ups, burn-down charts. Des métriques qui mesurent l'activité, jamais l'impact.

## L'IA change la donne

Avec Cursor, Windsurf, Claude, et les dizaines d'outils qui sortent chaque semaine, écrire du code devient une fraction du travail. Ce qui compte maintenant, c'est l'architecture (comment tout s'articule), les specs (quoi construire et pourquoi), et le contexte utilisateur (comprendre les vrais problèmes). Le code lui-même ? De plus en plus généré, assisté, automatisé. Et c'est tant mieux, parce que ça libère du temps pour ce qui compte vraiment : réfléchir.

Est-ce que tous les développeurs veulent ce shift ? Non. Certains veulent rester exécutants. D'autres veulent devenir des experts ultra-spécialisés d'une techno. Mais à mesure que l'IA évolue, ces rôles auront de moins en moins d'importance. L'expertise pure sur une stack devient commodifiée quand l'IA génère du code de qualité dans n'importe quelle techno. L'exécution pure devient automatisée quand l'IA prend des specs et produit du code fonctionnel.

Ce qui reste — et devient critique — c'est la capacité à comprendre les utilisateurs, prendre des décisions basées sur de la data, et architecturer des solutions qui scalent.

## Le "deadline doom loop"

Un pattern que je vois revenir dans beaucoup d'organisations :

1. On **estime** une feature (souvent mal, parce qu'on n'a pas toutes les infos)
2. On **promet** une deadline basée sur cette estimation
3. La **réalité frappe** : c'est plus complexe que prévu, les specs changent
4. On **crunch** pour tenir la deadline
5. La feature sort, mais elle est **décevante** (bugs, UX bâclée)
6. On **blâme le process** : "on manque de planification, de tests"
7. On **ajoute du process** : plus de meetings, plus de reviews
8. On devient **encore plus lent**
9. Retour à l'étape 1

C'est un cercle vicieux. La vraie cause, ce n'est pas le manque de process — c'est le manque de confiance.

Quand on ne fait pas confiance aux devs pour livrer, on ajoute du contrôle. Quand on ajoute du contrôle, on ralentit. Quand on ralentit, on crunch pour rattraper. Quand on crunch, la qualité baisse. Quand la qualité baisse, on perd encore plus confiance. Et la boucle continue.

## Confiance et feedback plutôt que process

La solution que je vois dans les équipes qui fonctionnent vraiment bien : **faire confiance par défaut.**

Confiance que les développeurs vont faire le bon choix. Confiance que si on leur donne un objectif clair et de l'autonomie, ils trouveront la meilleure solution. Confiance que s'ils se plantent, ils apprendront et s'amélioreront.

Mais la confiance sans feedback, c'est du laisser-aller. Le feedback doit être constant et direct :
- Les utilisateurs utilisent-ils la feature ?
- Est-ce que ça résout leur problème ?
- Quels sont les bugs reportés ?
- Qu'est-ce qui pourrait être amélioré ?

Et surtout, **les développeurs doivent voir ce feedback directement** — pas filtré par un PM, pas résumé dans un rapport. Directement. C'est comme ça qu'on apprend, c'est comme ça qu'on développe une intuition produit.

## Le product engineer

Les meilleures équipes que je connais (PostHog, Linear, et d'autres startups modernes) ont compris ça. Leurs ingénieurs sont des **product engineers** : ils parlent aux utilisateurs, font du support, recrutent des testeurs, analysent les données, développent des opinions sur ce qui doit exister, et agissent avec urgence pour le réaliser. Le cycle "problème → fix" est direct, sans téléphone arabe entre quatre départements.

Qu'est-ce que ça veut dire concrètement ? Écrire du code, oui, mais le code n'est qu'une partie du travail. Parler aux utilisateurs, concevoir des solutions (pas juste les implémenter), définir des KPIs, itérer en fonction du feedback réel. Être responsable de l'outcome, pas juste de l'output.

**Pourquoi le dev qui évolue vers le product, et pas l'inverse ?** Parce que l'asymétrie d'apprentissage ne joue pas dans le même sens. Un PM qui code avec l'IA peut prototyper vite, mais sans la compréhension profonde de l'architecture et des trade-offs système, ça produit du code qui fonctionne mais ne scale pas. C'est comme piloter avec un assistant qui corrige toutes tes erreurs : tu peux décoller, mais tu ne sais pas vraiment piloter.

Un ingénieur qui apprend le product, lui, combine une fondation technique solide avec l'intelligence produit. Il code avec une vision claire du *pourquoi*. Il prend de meilleures décisions d'architecture parce qu'il comprend le contexte utilisateur. Il itère plus vite parce qu'il n'attend pas qu'un PM lui dise quoi faire. C'est un multiplicateur.

## Ce que ça demande aux organisations

Le modèle product engineer ne peut fonctionner que si les organisations évoluent aussi.

**Des objectifs clairs, pas des sprints remplis.** Donne-moi un objectif trimestriel, un problème à résoudre, et laisse-moi trouver comment. Je n'ai pas besoin de 15 user stories découpées au millimètre avec une vélocité cible.

**De la transparence par défaut.** Roadmap publique (au moins en interne). Décisions documentées. Données accessibles. Les décisions ne devraient jamais tomber du ciel sans qu'on comprenne le pourquoi.

**Du temps pour comprendre.** Le temps qu'on gagne avec l'IA ne doit pas servir à produire encore plus de features. Il doit servir à mieux comprendre les utilisateurs et à construire les bonnes choses.

**Des POCs avant les gros chantiers.** Tester une idée avec un effort minimal. Construire un MVP. Voir si quelqu'un en a vraiment besoin avant de mobiliser une équipe pendant 6 mois.

**Du feedback direct.** Les développeurs doivent avoir accès aux métriques, aux retours utilisateurs, aux tickets support. Pas filtré, pas résumé — brut. C'est comme ça qu'on apprend.

## Le choix

Le métier de développeur senior — celui qui m'intéresse — n'est plus vraiment "développeur". C'est product engineer : un architecte de solutions qui utilise le code comme un outil parmi d'autres, qui comprend les utilisateurs, qui prend des décisions, qui assume la responsabilité du résultat.

Certaines boîtes l'ont compris. D'autres sont encore dans le modèle "waterfall déguisé en agile" : les décisions se prennent en haut, les devs exécutent en bas, et tout le monde fait semblant que c'est collaboratif parce qu'il y a des daily stand-ups.

Moi, je sais vers quel modèle je veux aller. Et vous ?

*Cet article reflète mes observations personnelles après quelques années dans le dev. Si ça résonne avec vous, ou si vous pensez que je me plante, n'hésitez pas à me le dire. J'apprends encore.*
