---
title: "Le shift du métier de développeur"
excerpt: "Entre exécution et vision produit, le métier de développeur senior évolue. Réflexions sur ce qui change, ce qui manque, et ce qui pourrait être mieux."
publishedAt: "2026-02-12"
draft: false
lang: fr
---

Le métier de développeur est en train de changer. L'IA accélère tout, bien sûr, mais le mouvement est plus profond — c'est une question de **rôle**, de **responsabilité**, et de **sens**.

Après quelques années à observer (et vivre) les dynamiques d'équipes de développement, j'ai commencé à voir des patterns. Des choses qui fonctionnent, d'autres qui coincent. Des modèles qui libèrent les équipes, et d'autres qui les enferment dans un cycle sans fin de sprints et de frustration.

Cet article, c'est **ma vision** de ce vers quoi le métier pourrait — et devrait, selon moi — évoluer. Ce n'est pas une vérité absolue, et je sais que tous les développeurs ne voudront pas prendre ce chemin. Mais c'est ce que j'observe, ce que j'expérimente, et ce qui me semble être la direction la plus intéressante pour construire de meilleurs produits.

## Le constat : on exécute, mais on ne construit pas vraiment

Développer, aujourd'hui, dans beaucoup d'organisations, ça ressemble à ça :
1. On te donne une user story
2. Tu l'estimes
3. Tu la développes
4. Tu testes (si tu as le temps)
5. Tu pousses en prod
6. Repeat

Le problème, c'est que **tu ne sais pas pourquoi tu fais ce que tu fais.** La décision a été prise ailleurs, dans une autre salle, par d'autres personnes. Toi, tu exécutes. Et si la feature ne marche pas, si personne ne l'utilise, si elle résout le mauvais problème — ce n'est pas ton problème. Tu as livré 100% du sprint, mission accomplie.

Sauf que livrer 100% des sprints, ce n'est pas la même chose qu'avoir un **impact réel** sur les utilisateurs. Quand tu codes pendant des mois sans jamais voir cet impact, sans jamais parler aux gens qui utilisent ce que tu construis, ça devient creux. Ça devient un job comme un autre.

## Le problème des silos

Beaucoup d'organisations fonctionnent avec des silos bien définis :
- **Product Owners / Product Managers** → Définissent le "quoi"
- **Designers** → Définissent le "comment" (UX/UI)
- **Développeurs** → Construisent ce qu'on leur a donné

En théorie, c'est propre — chacun son domaine. En pratique, c'est **absurde**.

Les développeurs ont souvent une compréhension technique qui pourrait drastiquement améliorer le produit, mais on ne leur demande jamais leur avis avant que tout soit déjà décidé. Les PM/PO ont parfois des idées brillantes, mais déconnectées de la réalité technique, et ça finit en négociations stériles ou en features trop complexes pour ce qu'elles apportent.

Le vrai problème : **personne n'est vraiment responsable du résultat final.** Le PM dit "j'ai défini le besoin". Le dev dit "j'ai livré la feature". Mais si ça ne marche pas ? Qui est responsable ? Personne. Ou tout le monde. Ce qui revient au même.

Les meilleures équipes que je connais (ou dont j'ai lu les post-mortems, ou suivi les newsletters) cassent cette barrière. Chez PostHog, Linear, ou d'autres startups modernes, les ingénieurs sont **product engineers** : ils parlent aux utilisateurs, ils font du support, ils recrutent des testeurs, ils analysent les données, ils développent des opinions sur ce qui doit exister — et ils agissent avec urgence pour le réaliser.

Le cycle "problème → fix" est direct, sans téléphone arabe entre quatre départements.

## Ce qu'un dev senior veut vraiment

Je me suis rendu compte que ce qui me motive — et ce qui motive beaucoup de développeurs seniors que je connais — ce n'est pas juste coder. C'est avoir :

### Ownership
Être **responsable** d'un bout de produit. Être responsable du **résultat utilisateur**, pas juste du code. Si ça marche, c'est grâce à moi. Si ça ne marche pas, c'est à moi de fixer.

### Impact
Savoir que ce que je construis **change vraiment** quelque chose pour les gens qui l'utilisent. Des vrais game-changers, pas des features marketing juste pour dire qu'on a fait quelque chose.

### Autonomie
Avoir la liberté de **décider comment** résoudre un problème, sans me contenter d'appliquer une solution déjà choisie par quelqu'un d'autre. Définir mes objectifs trimestriels, mes priorités, mes méthodes.

### Vision
Comprendre **où on va** et pourquoi on fait ce qu'on fait. Voir comment ça s'inscrit dans une roadmap claire et cohérente, sans changements de direction toutes les deux semaines.

Beaucoup d'organisations ne sont pas structurées pour offrir ça. Elles sont structurées pour **contrôler** : sprints, story points, vélocité, daily stand-ups, burn-down charts. Des métriques qui mesurent l'activité, jamais l'impact.

## L'impact de l'IA sur le métier

L'IA change tout, et elle le fait maintenant.

Avec Cursor, Windsurf, v0, Bolt, Claude Sonnet 4.5, et les dizaines d'autres outils qui sortent chaque semaine, écrire du code devient une fraction du travail. Ce qui compte vraiment, c'est :
- **L'architecture** : avoir une vision claire de comment tout s'articule
- **Les specs** : savoir exactement ce qu'on veut construire et pourquoi
- **Le contexte** : comprendre les utilisateurs, leurs besoins, leurs problèmes
- **Les décisions** : choisir les bonnes abstractions, les bons trade-offs

Le code lui-même ? De plus en plus généré, assisté, automatisé. Et c'est tant mieux, parce que ça libère du temps pour ce qui compte vraiment : **réfléchir**.

**Est-ce que tous les développeurs veulent ce shift ?** Non. Certains veulent rester exécutants. D'autres veulent devenir des experts ultra-spécialisés d'une techno spécifique. Et il y a encore de la place pour ces rôles — du moins aujourd'hui.

Mais à mesure que l'IA évolue, je pense que ces rôles auront de moins en moins d'importance. L'expertise pure sur une stack devient commodifiée quand l'IA peut générer du code de qualité dans n'importe quelle techno. L'exécution pure devient automatisée quand l'IA peut prendre des specs et produire du code fonctionnel.

Ce qui reste — et ce qui devient de plus en plus critique — c'est la capacité à :
- Comprendre les utilisateurs et leurs vrais problèmes
- Prendre des décisions éclairées basées sur de la data
- Architecturer des solutions qui scalent (techniquement ET humainement)
- Itérer rapidement en fonction de feedback réel

C'est pour ça que je crois au modèle **product engineer** : c'est celui qui survivra le mieux à l'évolution de l'IA.

## Le "deadline doom loop"

Un pattern que je vois revenir dans beaucoup d'organisations :

1. On **estime** une feature (souvent mal, parce qu'on n'a pas toutes les infos)
2. On **promet** une deadline basée sur cette estimation
3. La **réalité frappe** : c'est plus complexe que prévu, les specs changent, il y a de la dette technique
4. On **crunch** pour tenir la deadline
5. La feature sort, mais elle est **décevante** (bugs, UX bâclée, features coupées)
6. On **blâme le process** : "on manque de planification, de tests, de documentation"
7. On **ajoute du process** : plus de meetings, plus de reviews, plus de validation
8. On devient **encore plus lent**
9. Retour à l'étape 1

C'est un cercle vicieux, et la vraie cause ce n'est pas le manque de process — c'est le **manque de confiance**.

Quand on ne fait pas confiance aux devs pour livrer, on ajoute du contrôle. Quand on ajoute du contrôle, on ralentit. Quand on ralentit, on crunch pour rattraper. Quand on crunch, la qualité baisse. Quand la qualité baisse, on perd encore plus confiance. Et la boucle continue.

## Trust and feedback over process

La solution que je vois dans les équipes qui fonctionnent vraiment bien : **faire confiance par défaut**.

Confiance que les développeurs vont faire le bon choix. Confiance que si on leur donne un objectif clair et de l'autonomie, ils trouveront la meilleure solution. Confiance que s'ils se plantent, ils apprendront et s'amélioreront.

Mais la confiance sans feedback, c'est du laisser-aller. Le feedback doit être constant :
- Les utilisateurs utilisent-ils la feature ?
- Est-ce que ça résout leur problème ?
- Quels sont les bugs reportés ?
- Qu'est-ce qui pourrait être amélioré ?

Et surtout, **les développeurs doivent voir ce feedback directement** — pas filtré par un PM, pas résumé dans un rapport. Directement. C'est comme ça qu'on apprend, c'est comme ça qu'on développe une intuition produit.

## Le shift vers product engineer

Tout ça me fait penser que le métier de développeur senior — en tout cas, celui qui m'intéresse — n'est plus vraiment "développeur". C'est **product engineer**.

Qu'est-ce que ça veut dire ?
- Écrire du code, oui, mais le code n'est qu'une **partie** du travail
- Parler aux utilisateurs, comprendre leurs problèmes
- Concevoir des solutions (pas juste les implémenter)
- Définir des KPIs, analyser les données, itérer
- Prendre des décisions sur ce qui doit exister dans le produit
- Être **responsable de l'outcome**, pas juste de l'output

### Pourquoi pas l'inverse ? (PM qui code avec l'IA)

Une question légitime : si l'IA rend le code plus accessible, pourquoi ne pas avoir des **PM qui codent** plutôt que des **devs qui font du product** ?

Parce que **l'asymétrie d'apprentissage** ne joue pas dans le même sens.

Pour un PM, apprendre à coder avec l'IA revient à apprendre à utiliser des outils. Mais sans la compréhension profonde de l'architecture, de la dette technique, des trade-offs système, ça produit du code qui *fonctionne* mais qui ne *scale* pas. C'est comme apprendre à piloter avec un assistant qui corrige toutes tes erreurs : tu peux décoller, mais tu ne sais pas vraiment piloter.

Pour un ingénieur, apprendre à comprendre les users, c'est apprendre à **observer**, **écouter**, **analyser**. C'est lire de la data, faire du support, recruter des testeurs, poser les bonnes questions. Ce sont des skills humaines qui se construisent par l'expérience, pas par un outil. Et une fois acquises, elles sont **complémentaires** à l'expertise technique existante.

**Un ingénieur qui apprend le product devient un meilleur ingénieur.** Il code avec une vision claire du *pourquoi*. Il prend de meilleures décisions d'architecture parce qu'il comprend le contexte utilisateur. Il itère plus vite parce qu'il n'attend pas qu'un PM lui dise quoi faire.

**Un PM qui apprend à coder avec l'IA reste un PM qui code parfois.** Sans la profondeur technique, il reste dépendant de l'IA pour les décisions complexes. Et quand l'IA se plante (et elle se plante), il ne sait pas comment débugger.

C'est pour ça que je crois plus à l'ingénieur qui évolue vers le product qu'au PM qui évolue vers le code. La fondation technique combinée à l'intelligence produit, c'est un multiplicateur. La fondation produit plus un peu de code assisté par IA, c'est un PM qui peut prototyper vite, mais pas construire des systèmes durables.

Certaines organisations l'ont compris. D'autres sont encore dans le modèle "waterfall déguisé en agile" : les décisions se prennent en haut, les devs exécutent en bas, et tout le monde fait semblant que c'est collaboratif parce qu'il y a des daily stand-ups.

## Ce qui pourrait être mieux

Je ne prétends pas avoir toutes les réponses. Mais voici ce que j'aimerais voir évoluer dans l'industrie :

### Des objectifs clairs, pas des sprints remplis
Donne-moi un objectif trimestriel, un problème à résoudre, et laisse-moi trouver comment. Je n'ai pas besoin de 15 user stories découpées au millimètre avec des story points et une vélocité cible.

### De la transparence par défaut
Roadmap publique (au moins en interne). Décisions documentées. Données accessibles. Les décisions ne devraient jamais tomber du ciel sans qu'on comprenne le pourquoi.

### Du temps pour comprendre, pas juste pour produire
Le temps qu'on gagne avec l'IA ne doit pas servir à produire encore plus de features. Il doit servir à **mieux comprendre les utilisateurs** et à construire les bonnes choses.

### Des POCs avant les gros chantiers
Tester une idée avec un effort minimal. Construire un MVP. Voir si quelqu'un en a vraiment besoin **avant** de mobiliser une équipe pendant 6 mois.

### De la confiance
Arrêter de micro-manager les sprints, les story points, les heures. Donner de l'ownership, de la responsabilité, et du feedback. Faire confiance. Apprendre ensemble.

## Conclusion

Le métier de développeur évolue. On n'est plus juste des "codeurs" — on devient des **architectes de solutions**, des **product engineers**, des **problem solvers** qui utilisent le code comme un outil parmi d'autres.

Mais ça ne marchera que si les organisations évoluent aussi. Il faudra casser les silos, faire confiance, donner de l'ownership et de la responsabilité.

Certaines boîtes l'ont compris. D'autres y viendront. Ou pas. Mais moi, je sais vers quel modèle je veux aller.

Et vous ?

---

*Cet article reflète mes observations personnelles après quelques années dans le dev. Il ne vise aucune organisation en particulier — juste des patterns que j'ai vus se répéter. Si ça résonne avec vous, ou si vous pensez que je me plante complètement, n'hésitez pas à me le dire. J'apprends encore.*
