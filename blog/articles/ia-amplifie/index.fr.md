---
title: "L'IA amplifie ce qui existait déjà"
excerpt: "Deux semaines à construire avec des agents IA. Ce que j'ai appris sur mes propres process — et pourquoi mes problèmes n'ont pas attendu ChatGPT."
publishedAt: "2026-02-15"
draft: false
lang: fr
private: true
passwordHash: "$2b$10$Gcd/rVDo9AKWCKFFWrMniuBI69zciDjaQHGjXKPaMxByO49jf6dZ."
---

J'ai passé les deux dernières semaines à construire avec des agents IA. Pas juste utiliser Claude pour debugger du code — vraiment construire avec eux. Des agents qui architecturent. Qui développent. Qui se coordonnent entre eux via un système de tâches que j'ai construit.

**Et voilà ce que j'ai appris : l'IA ne crée pas mes problèmes. Elle les expose.**

Quand l'agent peine à comprendre ce que je veux, ce n'est pas parce qu'il est incompétent. C'est parce que je n'ai pas été clair. Quand il génère du code qui part dans la mauvaise direction, c'est parce que mes specs étaient floues. Quand il se perd dans mon codebase, c'est parce que ma logique métier n'est écrite nulle part.

**L'IA amplifie.** Le bon comme le mauvais. Et ces deux semaines m'ont forcé à regarder en face ce qui était déjà cassé dans ma façon de travailler.

## Ce que j'ai vu ces deux semaines

J'ai construit un système que j'appelle le Pantheon. Sept agents spécialisés : un orchestrateur (Main), un architecte (Daedalus), un dev (Héphaestos), un QA (Hygieia), un chercheur (Atlas), un scrum master (Hermès), un writer (Homère). Ils collaborent via Olympus, un dashboard de tâches que j'ai codé pour les coordonner.

**Résultat ?** Sur certaines tâches, c'est magique. Un scaffold de projet complet en 15 minutes. Une architecture documentée en 10 minutes. Des specs techniques générées à partir d'une conversation.

Sur d'autres ? Un bordel total. L'agent qui génère 200 messages Discord en 13 minutes parce qu'il est coincé dans une boucle. L'architecte qui propose une stack que je dois corriger 3 fois parce que le contexte n'était pas clair. Le dev qui code pendant 20 minutes pour se rendre compte qu'il n'a pas les bonnes specs.

**La différence entre les deux ?** Pas l'IA. Mon process.

## Le savoir tribal que j'ai dans la tête

Pendant des années, j'ai codé en gardant tout dans ma tête. "Je sais ce que je veux faire, pas besoin d'écrire des specs." "C'est évident, pas besoin de documenter." "Je me souviens pourquoi j'ai fait ça comme ça."

Ça marchait. Jusqu'à maintenant.

Parce que l'IA n'a pas accès à ma tête. Elle ne peut pas deviner que quand je dis "un système de paiement", je pense à Stripe avec webhooks + gestion des subscriptions + retry logic sur les failed payments. Pour elle, "système de paiement" pourrait être n'importe quoi.

**Et soudain, je me rends compte : c'était déjà un problème avant.**

Quand un nouveau dev arrivait sur un de mes projets, il galérait. Parce que la moitié de la logique métier était "dans ma tête". Il devait me demander. Exactement comme l'IA doit me demander maintenant.

La différence ? L'IA me demande 50 fois par jour. Ça rend le problème impossible à ignorer.

## Process solide = IA magique. Process flou = amplification du chaos.

J'ai remarqué un pattern.

**Quand j'ai pris le temps de formaliser :**
- Specs claires ("voici les scénarios utilisateurs, voici l'archi, voici les contraintes")
- Conventions documentées ("on utilise Drizzle, pas TypeORM, voici pourquoi")
- Contexte explicite ("ce projet est un MVP, pas de sur-engineering")

→ L'IA brille. Elle code vite, proprement, dans la bonne direction. Elle documente. Elle teste. Le code qu'elle produit est souvent meilleur que ce que j'aurais écrit moi-même.

**Quand j'ai été flou :**
- "Fais-moi un truc pour gérer les capacités de l'équipe"
- "Utilise une stack moderne"
- "Tu verras, c'est évident"

→ Chaos. L'IA part dans tous les sens. Elle propose une stack que je n'utilise jamais. Elle code des features dont je ne veux pas. Elle génère de la dette technique parce qu'elle devine mes intentions.

**La formule est simple : Process solide + IA = accélération. Process flou + IA = chaos x10.**

Et c'est exactement la même chose sans l'IA. Un nouveau dev avec des specs floues produit du code flou. La différence, c'est que l'IA le fait 10x plus vite.

## Ce que ça m'a appris sur moi

Je pensais que je savais spécifier. Que j'étais rigoureux. Que j'avais de bonnes pratiques.

**Ces deux semaines m'ont montré que non.**

J'ai réalisé que je prenais des raccourcis. Que je sautais des étapes. Que je considérais les specs comme "optionnelles" si je savais déjà ce que je voulais dans ma tête.

**Le problème ?** Ma tête n'est pas accessible. Ni pour l'IA, ni pour le dev qui arrive dans 6 mois, ni pour moi-même quand je relis mon code un an plus tard.

J'ai appris que je dois écrire. Tout. Avant de coder.

Pas parce que c'est une "bonne pratique". Parce que si je ne le fais pas, l'IA me force à le faire après — en me posant 50 questions, en générant du code à côté de la plaque, en me faisant perdre du temps.

**Écrire les specs avant le code, c'est plus rapide que de corriger l'IA après.**

## Les seniors qui me font réfléchir

J'ai remarqué quelque chose dans mes équipes.

Les seniors qui galèrent avec l'IA, ce sont ceux qui "codent vite". Qui tapent du code sans réfléchir. Qui ne documentent jamais. Qui gardent tout dans leur tête.

Les seniors qui excellent avec l'IA, ce sont ceux qui formalisent. Qui écrivent des specs techniques par réflexe. Qui posent les bonnes questions avant de coder. Qui vivent dans le produit, pas juste dans le code.

**Et je me suis demandé : dans quelle catégorie je suis ?**

Honnêtement ? Entre les deux. J'ai les réflexes de formalisation, mais je les court-circuite souvent. "Pas besoin, c'est simple." "Je sais ce que je veux." "Ça ira plus vite si je code direct."

Ces deux semaines m'ont forcé à ralentir. À écrire. À structurer ma pensée avant d'exécuter.

Et paradoxalement, **ça va plus vite.**

## Ce qui est en train de changer (et ça me fascine)

Une observation qui me trotte dans la tête.

Le métier de dev, c'était : PM → specs → dev → code. Des étapes séparées. Des rôles distincts.

Avec l'IA, **cette chaîne se compresse.**

Je peux maintenant couvrir du besoin utilisateur jusqu'au code en production. Seul. En quelques jours. Parce que l'IA accélère l'exécution.

**Mais ça ne marche que si je sais faire le boulot du PM aussi.**

Comprendre le besoin utilisateur. Formaliser le problème. Définir les scénarios. Prioriser. Valider avec de la data.

Si je ne sais faire que "coder", l'IA me remplace. Si je sais "penser le problème ET coder la solution", l'IA me multiplie.

**Et là, il y a une asymétrie.**

Un dev qui apprend à penser produit, c'est accessible. Il a déjà la rigueur analytique. Il comprend les contraintes techniques. Il sait ce qui est faisable.

Un PM qui apprend à coder avec l'IA, c'est... plus dur. Parce que prototyper une app en 15 minutes avec l'IA, tout le monde peut le faire. Mais la mettre en production ? Avec de la sécu, du scaling, de l'observabilité ? C'est un autre niveau.

**Je pense que les profils techniques ont un avantage structurel.** À condition de ne pas rester "juste codeurs".

## Ma conclusion (pour l'instant)

Deux semaines, c'est court. Je ne prétends pas avoir tout compris.

Mais voilà ce que je retiens :

**L'IA révèle mes failles.** Mes specs floues. Mon savoir tribal. Mes raccourcis. Elle me force à être rigoureux. Et c'est bien.

**Le code n'est plus l'artefact principal.** C'est la spec. Le code, l'IA peut le générer. La spec claire, non. C'est là que je dois investir mon énergie.

**Le métier change.** Pas demain. Maintenant. Je ne suis plus "juste un dev". Je dois penser produit. Comprendre les users. Formaliser les problèmes. Et utiliser l'IA comme un outil parmi d'autres pour exécuter.

Est-ce que je sais exactement où ça va ? Non.

Est-ce que ça me fait un peu flipper ? Oui.

Est-ce que c'est fascinant ? Absolument.

---

*Tom Andrieu — Vaucluse, février 2026*

**Ressources qui m'ont aidé à réfléchir :**
- Les posts LinkedIn de Gabriel Desbouis sur le savoir tribal
- Le blog de PostHog sur le product engineering
- Les newsletters de Steve Yegge sur l'agentic engineering
- Mes propres galères ces deux dernières semaines
