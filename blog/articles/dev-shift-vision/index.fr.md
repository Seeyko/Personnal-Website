---
title: "Le shift du métier de développeur"
excerpt: "Le métier de développeur est en train de changer. Voilà comment je le vois, ce que j'observe, et vers quoi je veux aller."
publishedAt: "2026-02-15"
draft: false
lang: fr
private: false
---

Le métier de développeur est en train de changer. L'IA accélère tout, mais le mouvement est plus profond. C'est une question de rôle, de responsabilité, et de sens. Cet article, c'est ma vision de ce vers quoi le métier pourrait évoluer. Ce n'est pas une vérité absolue. Tous les développeurs ne voudront pas prendre ce chemin. Mais c'est ce que j'observe dans les organisations où mes amis et moi avons travaillé, ce que j'expérimente, et ce qui me semble la direction la plus intéressante pour construire de meilleurs produits.

## Exécuter sans comprendre

Développer, aujourd'hui, dans beaucoup d'organisations, ça ressemble à ça. On te donne une user story, tu l'estimes, tu la développes, tu pousses en prod. Repeat. Le problème, c'est que tu ne sais pas pourquoi tu fais ce que tu fais. La décision a été prise ailleurs, par d'autres personnes. Si la feature ne marche pas, si personne ne l'utilise, ce n'est pas ton problème. Tu as livré 100% du sprint, mission accomplie.

Chez CBA, on vise 100% de completion rate sur les sprints. C'est l'objectif. Mais livrer 100% des sprints, ce n'est pas la même chose qu'avoir un impact réel. Quand tu codes pendant des mois sans jamais voir cet impact, sans jamais parler aux gens qui utilisent ce que tu construis, ça devient creux. Et moi, je ne veux pas de ça.

Cette déconnexion vient des silos. Les PM définissent le "quoi", les designers le "comment", les devs construisent ce qu'on leur a donné. En théorie, c'est propre. En pratique, c'est absurde. Les développeurs ont souvent une compréhension technique qui pourrait améliorer le produit, mais on ne leur demande jamais leur avis avant que tout soit décidé. Les PM ont parfois des idées brillantes, mais déconnectées de la réalité technique. Et au final, personne n'est vraiment responsable du résultat. Le PM dit "j'ai défini le besoin". Le dev dit "j'ai livré la feature". Mais si ça ne marche pas ? Personne. Ou tout le monde. Ce qui revient au même.

Ce que je veux, et ce qui motive beaucoup de développeurs seniors que je connais, c'est de l'ownership. Être responsable d'un bout de produit, pas juste du code. Si ça marche, c'est grâce à moi. Si ça ne marche pas, c'est à moi de fixer. De l'autonomie. La liberté de décider comment résoudre un problème, sans me contenter d'appliquer une solution déjà choisie par quelqu'un d'autre. De la vision. Comprendre où on va et pourquoi. Beaucoup d'organisations ne sont pas structurées pour offrir ça. Elles sont structurées pour contrôler. Sprints, story points, vélocité, daily stand-ups, burn-down charts.

Il y a un pattern que je vois revenir partout, chez moi et chez mes amis. On estime une feature, souvent mal parce qu'on n'a pas toutes les infos. On promet une deadline. La réalité frappe, c'est plus complexe que prévu, les specs changent. On crunch pour tenir la deadline. La feature sort décevante. On blâme le process. On ajoute du process. Plus de meetings, plus de reviews. On devient encore plus lent. Et on retourne au début. La vraie cause, c'est pas le manque de process. C'est le manque de confiance. Quand on ne fait pas confiance aux devs pour livrer, on ajoute du contrôle. Quand on ajoute du contrôle, on ralentit. Et la boucle continue.

## Ce que l'IA change dans tout ça

Avec Cursor, Windsurf, Claude, et les dizaines d'outils qui sortent chaque semaine, écrire du code devient une fraction du travail. Ce qui compte de plus en plus, c'est l'architecture, comment tout s'articule. Les specs, quoi construire et pourquoi. Et le contexte utilisateur, comprendre les vrais problèmes.

Est-ce que tous les développeurs veulent ce shift ? Non. Certains veulent rester exécutants. D'autres veulent devenir des experts ultra-spécialisés d'une techno. Mais ce que j'observe, c'est qu'à mesure que l'IA évolue, l'expertise pure sur une stack se commodifie. L'IA génère du code de qualité dans n'importe quelle techno. L'exécution pure s'automatise quand l'IA prend des specs et produit du code fonctionnel.

Aujourd'hui déjà dans mon équipe chez CBA, si tu penses que tech pure, l'IA te remplace quasiment. Il faut soit avoir un très bon niveau et review (rajouter de la valeur en architecture, design patterns, sécurité, performance), soit commencer à penser produit. Je pense que d'ici 2-3 ans, les ingénieurs qui ne savent pas penser produit vont avoir du mal.

Ce qui reste, et ce qui me semble de plus en plus important, c'est la capacité à comprendre les utilisateurs, prendre des décisions basées sur de la data, et architecturer des solutions qui tiennent.

## Vers le product engineer

Les équipes que je suis en ligne, PostHog, Linear, et d'autres startups qui font du build-in-public, ont une approche différente. Leurs ingénieurs parlent aux utilisateurs, font du support, recrutent des testeurs, analysent les données, développent des opinions sur ce qui doit exister, et agissent avec urgence pour le réaliser. Le cycle "problème → fix" est direct, sans téléphone arabe entre quatre départements.

Concrètement, ça veut dire écrire du code, oui, mais le code n'est qu'une partie du travail. Parler aux utilisateurs. Concevoir des solutions, pas juste les implémenter. Définir des KPIs. Itérer en fonction du feedback réel. Être responsable de l'outcome, pas juste de l'output.

Pourquoi le dev qui évolue vers le product, et pas l'inverse ? Parce que l'asymétrie d'apprentissage ne joue pas dans le même sens. Un PM sans formation technique qui code avec l'IA peut prototyper vite, mais sans la compréhension profonde de l'architecture et des trade-offs système, ça produit du code qui fonctionne mais ne scale pas. Mon but n'est pas de dire qu'on va remplacer les PM, mais qu'on peut beaucoup plus faire chevaucher les métiers. Les PM peuvent coder et les devs peuvent prendre des décisions produits.

Un ingénieur qui apprend le product combine une fondation technique solide avec l'intelligence produit. Il code avec une vision claire du pourquoi. Il prend de meilleures décisions d'architecture parce qu'il comprend le contexte utilisateur. Il itère plus vite parce qu'il n'attend pas qu'un PM lui dise quoi faire.

Pour que ça marche, il faut que les organisations évoluent aussi. Des objectifs clairs plutôt que des sprints remplis. De la transparence par défaut. Des roadmaps accessibles, des décisions documentées, des données ouvertes. Du temps pour comprendre. Le temps qu'on gagne avec l'IA ne doit pas servir à produire encore plus de features, mais à mieux comprendre les utilisateurs. Du feedback direct, brut, pas filtré par un PM ou résumé dans un rapport.

Le métier de développeur senior tel que je le vois, ce n'est plus vraiment "développeur". C'est quelqu'un qui utilise le code comme un outil parmi d'autres, qui comprend les utilisateurs, qui prend des décisions, qui assume la responsabilité du résultat. Certaines boîtes l'ont compris. D'autres sont encore dans le modèle "waterfall déguisé en agile". Moi, je sais vers quel modèle je veux aller.
