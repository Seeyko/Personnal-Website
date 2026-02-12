---
title: "Olympus : Mon Dashboard pour Orchestrer des Agents IA"
excerpt: "J'ai construit un dashboard pour coordonner une équipe de 7 agents IA qui travaillent en autonomie sur mes projets. Voici pourquoi, comment, et ce que j'ai appris."
publishedAt: "2026-02-12"
draft: false
lang: fr
---

J'ai un problème que la plupart des gens n'ont pas encore : coordonner une équipe d'agents IA qui travaillent en autonomie sur des projets réels.

Depuis deux semaines, je fais tourner ce que j'appelle le **Pantheon** — une équipe de sept agents IA spécialisés (architecture, développement, QA, recherche, rédaction) qui collaborent sur mes side-projects. Ils écrivent du code, font des reviews, planifient des sprints, rédigent de la documentation. Ils communiquent entre eux, se bloquent, se débloquent, créent des tâches les uns pour les autres.

Le tout tourne sur un Mac Mini dans mon appartement. Je parle à l'orchestrateur (Main) via Discord. Lui dispatch le travail aux autres agents. Eux me livrent des PRs, des rapports, des analyses. Ça fonctionne. Mais ça ne fonctionne que parce que j'ai construit **Olympus**.

Olympus, c'est un dashboard de gestion de tâches pour agents IA. Un Jira pour machines. Une interface web où je vois en temps réel ce que fait chaque agent, sur quoi ils sont bloqués, ce qu'ils se disent. Et surtout, c'est l'API qui leur permet de se coordonner sans que j'intervienne dans chaque échange.

Cet article, c'est pourquoi j'ai construit ça, comment ça fonctionne, et ce que ça change dans ma façon de travailler avec des systèmes IA autonomes.

## Le problème : orchestrer sans perdre le contrôle

Quand j'ai lancé le Pantheon, la coordination passait par Discord. J'envoyais une demande à Main, il répondait, pingait un autre agent si nécessaire, celui-ci répondait dans le thread. Simple. Fonctionnel.

Pendant une semaine.

Puis les problèmes sont apparus :

**Pas de visibilité globale.** Pour savoir ce que faisait chaque agent, je devais scroller Discord. Si un agent était bloqué depuis trois jours, je ne le voyais pas à moins de relire tous les threads.

**Pas de priorisation claire.** Les agents travaillaient dans l'ordre des messages Discord. Pas de notion d'urgence, pas de backlog, pas de roadmap. Si trois tâches arrivaient dans la même heure, c'était first-in-first-out, sans réflexion.

**Pas de mémoire partagée structurée.** Chaque agent avait ses propres fichiers de mémoire (daily notes, décisions, apprentissages). Mais pas de vue unifiée. Si Héphaestos (le dev agent) apprenait quelque chose sur l'architecture d'un projet, Hermès (le scrum master) ne le voyait pas automatiquement.

**Pas de coordination inter-agents structurée.** Si Atlas (recherche) devait passer la main à Daedalus (architecture), il fallait que je joue l'intermédiaire. Les agents ne pouvaient pas signaler à Main qu'une tâche suivante était nécessaire. Ils passaient par moi. J'étais devenu le bottleneck.

J'avais construit une équipe autonome qui ne pouvait fonctionner qu'avec mon micro-management constant. Ça ne scale pas. Et franchement, ça me fatiguait.

## Les fausses solutions

J'ai d'abord pensé améliorer le système de fichiers. Ajouter des conventions de nommage, des scripts de sync, des templates YAML pour les tâches. Rendre le filesystem "self-service" pour les agents.

Mauvaise idée.

Le filesystem, c'est génial pour la mémoire et les livrables. Mais pour la coordination en temps réel ? C'est un cauchemar. Les agents devraient parser des fichiers Markdown pour savoir qui fait quoi. Gérer des conflits si deux agents modifient le même fichier. Implémenter leur propre logique de détection de changements.

Et surtout : **pas de notifications**. Un agent ne sait pas qu'une tâche a été créée pour lui à moins de poll en continu un dossier. Inefficace et fragile.

J'ai aussi envisagé de tout garder dans Discord. Structurer les threads, ajouter des conventions de nommage (type `[TASK]`, `[BLOCKED]`), utiliser des réactions comme système de statuts.

Pire idée.

Discord, c'est fait pour la communication asynchrone entre humains. Pas pour la gestion de tâches structurées. Pas de filtres, pas de vues par agent, pas de metrics. Et surtout, pas d'API propre pour que les agents créent et mettent à jour des tâches programmatiquement.

Il fallait un vrai système. Un hub centralisé. Une source de vérité unique.

## Olympus : un hub pour humains et machines

Olympus, c'est deux choses :

1. **Une interface web** où je vois tout ce qui se passe dans le Pantheon.
2. **Une API REST** que les agents utilisent pour se coordonner.

### Pour moi (l'interface web)

Un kanban board classique. Colonnes par statut (`backlog`, `in_progress`, `blocked`, `done`, `waiting_for_human`, `waiting_for_agent`, `in_review`). Chaque tâche a :

- Un titre, une description
- Un assigné (quel agent)
- Un créateur (moi ou un autre agent)
- Une priorité (`low`, `medium`, `high`, `critical`)
- Un historique de changements de statut
- Des commentaires (conversation entre agents, ou entre moi et les agents)

Je peux voir :
- Les tâches d'un agent spécifique
- Les tâches bloquées depuis plus de X jours
- Qui attend quoi de qui
- La charge de travail de chaque agent

Je peux aussi accéder à la **mémoire de chaque agent** (leurs daily notes, config, logs) directement depuis Olympus. Avant, je devais ouvrir VSCode et naviguer dans le filesystem. Maintenant, tout est indexé et consultable via une UI dédiée.

### Pour les agents (l'API)

Chaque agent a une clé API unique. Ils peuvent :

- **Lire leurs tâches** (`GET /tasks?assignee=agent_id`)
- **Mettre à jour le statut** (`PATCH /tasks/:id`)
- **Poster des commentaires** (`POST /tasks/:id/comments`)
- **Lire les tâches des autres** (pour comprendre le contexte global)

**Seul Main peut créer des tâches** (`POST /tasks`). Les agents spécialisés ne créent pas. Ils exécutent. Cette asymétrie est intentionnelle : elle évite le chaos de coordination horizontale non supervisée.

L'API est simple. Pas de GraphQL, pas de complexité inutile. Du REST pur. JSON in, JSON out. Rate limiting pour éviter les boucles infinies (leçon apprise après un bug de logique chez Main qui a tenté de créer 47 tâches en trois secondes).

Chaque changement de statut ou nouveau commentaire déclenche une notification WebSocket. Les agents n'ont pas besoin de poll. Ils sont notifiés en temps réel.

## Stack technique (et pourquoi ces choix)

**Backend : NestJS + TypeORM + PostgreSQL**

NestJS parce que j'aime TypeScript et que la structure modulaire rend le code maintenable. TypeORM parce que je ne veux pas écrire du SQL à la main pour ce projet. PostgreSQL parce que c'est solide, gratuit, et que j'héberge sur mon VPS via Dokploy (pas envie de payer Supabase ou Firebase pour un projet perso).

**Frontend : React 19 + Vite + Zustand + TanStack Query**

Initialement, j'avais commencé en SvelteKit. Puis j'ai migré vers React. Pourquoi ? Parce que React, je le connais par cœur. Je peux coder vite, débugger vite, et il y a 10x plus de ressources si je bloque. SvelteKit est élégant, mais pour un projet solo où la vélocité compte plus que l'élégance du framework, React gagne.

Zustand pour le state local (léger, pas de boilerplate). TanStack Query pour le server state (cache automatique, refetch, invalidation). shadcn/ui pour les composants (parce que je ne veux pas réinventer les modals et les dropdowns).

**Hébergement : Dokploy sur VPS**

Dokploy, c'est un Vercel/Railway self-hosted. Tu push sur `main`, ça build et déploie automatiquement. Zéro config. Frontend sur `olympus.tomandrieu.com`, backend sur `api.olympus.tomandrieu.com`. Base de données PostgreSQL managée par Dokploy aussi.

Pourquoi self-hosted et pas un PaaS ? **Contrôle total**. Je peux SSH dans la machine, inspecter les logs, tuer un process si nécessaire. Avec un PaaS, tu es dépendant de leur interface. J'ai appris l'importance d'avoir un vrai kill switch.

## La réalité : orchestration par Main, pas autonomie complète

La théorie était séduisante : des agents qui se coordonnent entre eux, créent des tâches, se débloquent mutuellement. L'idée d'un système auto-organisé.

La réalité est plus nuancée.

**Comment ça marche vraiment :**

Les agents ne tournent pas en continu. Ils sont déclenchés par des **crons** — des tâches planifiées qui les réveillent à intervalles réguliers. 

**Main = le CEO.** C'est lui l'orchestrateur. Il a des heartbeats 4 fois par jour (8h, 12:30, 17h, 21h). À chaque heartbeat, il :
1. Check les tâches Olympus (nouvelles, bloquées, en attente)
2. Identifie ce qui doit être fait
3. Crée des tâches pour les agents spécialisés
4. Spawne les agents si nécessaire (via `sessions_spawn`)
5. Suit l'avancement et relance si blocage

**Les agents spécialisés ne créent PAS de tâches.** Ils reçoivent une tâche de Main, travaillent dessus, mettent à jour le statut, postent des commentaires. C'est tout. Pas de coordination horizontale. Tout passe par Main.

Quand un agent spécialisé se réveille (cron ou spawn), il :
1. Fetch ses tâches assignées via l'API Olympus
2. Lit la dernière en `in_progress` (ou prend la suivante si rien en cours)
3. Travaille dessus
4. Met à jour le statut et poste un commentaire
5. Se rendort (ou termine si spawné)

**Mon rôle :**
- Je parle à **Main**, pas aux autres agents
- Je lui donne la **vision**, les **objectifs**, les **priorités**
- Main traduit ça en tâches Olympus et dispatch
- Je passe **5 heures par jour** à discuter avec Main, débloquer des situations, corriger des bugs, affiner des prompts

**Ce qui fonctionne :**
- La visibilité : je vois exactement ce que chaque agent fait via Olympus
- La coordination structurée : Main créé des tâches, les agents exécutent
- La mémoire partagée : tout est dans Olympus, pas dispersé dans Discord

**Ce qui ne fonctionne pas encore :**
- Les heartbeats sont trop espacés ou pas assez fiables
- Les agents ne sont pas réellement "autonomes" — ils attendent que Main valide, relance, corrige
- La vélocité n'est pas là : on crée beaucoup de tâches, on en termine peu

**Qui priorise vraiment ?**

Main. Lors de ses heartbeats, il analyse le backlog, identifie ce qui compte (basé sur ma vision), et crée/priorise les tâches en conséquence. Les agents exécutent. Ils ne décident pas de ce qui est important. Ils n'ont pas cette intelligence stratégique.

C'est loin de l'image idéalisée du "manager qui observe". Je suis dans les logs, dans les discussions avec Main, dans la validation. Olympus m'aide à structurer ce chaos. Mais le chaos reste.

## Les galères (et les leçons)

Construire Olympus n'a pas été un long fleuve tranquille.

**L'agent qui s'est bloqué sans expliquer pourquoi**

Hermès a mis une tâche en `blocked` sans poster de commentaire. J'ai passé 20 minutes à chercher pourquoi. Il attendait une décision de ma part sur une question d'architecture. Mais il ne l'avait pas écrit.

Leçon apprise : **obligation de commenter quand on change vers `blocked`.** Si un agent met une tâche en `blocked`, l'API vérifie qu'il y a un commentaire récent (moins de 2 minutes). Sinon, erreur 400. Force les agents à documenter le blocage.

**L'agent qui créait des tâches en boucle**

Atlas a créé 47 tâches en trois secondes. Bug dans sa logique de détection de tâches manquantes. Il voyait "pas de tâche de recherche pour X" et en créait une. Puis il re-scannait, voyait "pas de tâche de recherche pour X" (parce que la tâche venait d'être créée et n'était pas encore dans son cache), et en créait une autre. Boucle.

Leçon apprise : **rate limiting par agent.** Max 5 créations de tâches par minute. Au-delà, erreur 429. Et amélioration de la logique de cache côté agent.

**L'illusion de la vélocité**

Main peut créer des tâches vite. Très vite. Trop vite, parfois. Il analyse un projet et génère 15 tâches en deux minutes. Ça donne l'impression d'avancement. Mais créer des tâches n'est pas les terminer.

La réalité : **on n'a rien ship**. Des outils créés, des assets générés, des repos initialisés. Mais rien de tangible en production. Rien qui génère un euro.

Leçon en cours d'apprentissage : la vélocité de création de tâches n'est pas la vélocité du projet. C'est le **cap** qui compte. Et le cap, c'est moi qui le donne à Main. Via les objectifs hebdomadaires. Via les validations. Via les discussions Discord.

## Ce que ça change (vraiment)

**Visibilité structurée.** Avant, tout était dispersé : Discord, fichiers, logs. Maintenant, Olympus centralise. Je vois qui fait quoi, qui est bloqué, qui attend quoi. Ça n'a pas réduit ma charge cognitive, mais ça l'a **organisée**.

**Apprentissage intense.** Deux semaines à construire ce système, à voir les agents échouer, réussir, buguer, créer des tâches absurdes, livrer des trucs brillants. J'apprends énormément sur :
- Les limites des LLMs en coordination multi-agents
- Les patterns qui fonctionnent (et ceux qui explosent)
- Comment structurer des systèmes autonomes (ou presque)
- L'importance des kill switches, du rate limiting, de la supervision

**Rien de ship, mais des fondations.** On n'a rien mis en prod. Rien qui rapporte. Mais j'ai construit :
- Un système de coordination qui scale
- Une équipe d'agents avec des rôles clairs
- Une architecture qui permet l'expérimentation rapide
- Des outils, des repos, des assets

**Je pense différemment mes projets.** Pas en "tâches que je délègue", mais en "systèmes que je conçois". Olympus me force à architecturer la collaboration, pas juste la distribution de travail.

**5h par jour dans le système.** Pas de magie, pas d'autonomie totale. Je suis encore profondément impliqué. Mais chaque jour, je comprends mieux comment faire fonctionner ce bordel. Et l'expérience en vaut le détour.

## Ce qui reste à faire

Olympus v1 existe. Mais "fonctionne" serait généreux.

**Ce qui manque :**

- **Notifications.** Actuellement : rien. Je ping les agents sur Discord, ils me répondent. Les websockets Olympus envoient les updates en temps réel, mais pas de système de notifications push. Je dois aller voir le board.

- **Heartbeats fiables.** Les crons fonctionnent, mais les heartbeats des agents sont instables. Parfois ils ratent leur fenêtre. Parfois ils tournent trop souvent. J'ai besoin d'affiner la fréquence et la logique.

- **Métriques et analytics.** Temps moyen par tâche. Taux de blocage. Vélocité réelle (pas juste création de tâches, mais completion). Pour détecter les patterns et améliorer.

- **Templates de tâches.** Les tâches récurrentes (audits, rapports) sont recréées manuellement. Inefficace.

- **Dépendances entre tâches.** "B attend A" existe en commentaires, pas en logique système. Les agents gèrent ça manuellement (ou pas).

- **Vue calendrier.** Deadlines et sprints sont dans ma tête, pas dans Olympus.

Mais je n'implémenterai que ce dont j'ai vraiment besoin. Pas de features "au cas où". Olympus évolue au rythme de mes galères.

## Leçons pour quiconque orchestre des agents IA

Si vous construisez un système multi-agents — ou si vous y pensez —, voici ce que j'ai appris :

**1. Une source de vérité unique est non négociable.** Discord, Slack, fichiers, tout ça, ce sont des interfaces. Mais en dessous, il faut une base de données structurée. Sinon, vous perdez la cohérence.

**2. Un orchestrateur centralisé simplifie la coordination.** Si chaque interaction inter-agents passe par vous (humain), vous devenez le bottleneck. Avoir un agent orchestrateur (Main dans mon cas) qui gère la création et le dispatch des tâches centralise la logique. Les agents spécialisés peuvent commenter, mettre à jour leurs statuts, signaler des blocages. Mais la coordination reste supervisée, pas chaotique.

**3. Les kill switches doivent être indépendants du système qu'ils tuent.** Si votre commande `/stop` dépend de l'agent étant dans un état coopératif, ce n'est pas un kill switch. C'est une suggestion polie.

**4. Visibilité = contrôle.** Vous ne pouvez pas contrôler ce que vous ne voyez pas. Un dashboard en temps réel change tout. Vous détectez les problèmes avant qu'ils deviennent des catastrophes.

**5. Le cap vient de l'orchestrateur.** Les agents exécutent. Ils ne décident pas de la stratégie. C'est **Main** (le CEO agent) qui, lors de ses heartbeats, analyse le backlog et crée/priorise les tâches. Basé sur la vision que je lui donne. Les agents taffent tellement vite que la priorisation individuelle des tâches ne compte pas. Ce qui compte : **quoi faire** et **comment le faire**. Je le définis, Main l'orchestre.

**6. Les agents vont échouer.** Préparez-vous. Rate limiting. Hard limits. Watchdogs. Timeouts. Logs détaillés. Ne faites pas confiance aveuglément.

**7. Commencez simple.** Olympus v0 était un kanban board basique avec trois statuts. Aucune WebSocket. Aucun système de commentaires. Juste un CRUD de tâches. Ça a suffi pendant deux semaines. Itérez en fonction de vos besoins réels, pas de vos besoins imaginaires.

## Conclusion

Olympus, ce n'est pas un projet tech sexy avec des algorithms de pointe ou du machine learning complexe. C'est un CRUD app. Un kanban board. Une API REST.

Mais c'est **l'infrastructure qui permet l'expérimentation.**

Sans Olympus, le Pantheon serait ingérable. Avec Olympus, j'ai une visibilité structurée sur le chaos. Je peux tester des patterns de coordination. Je peux voir où ça casse. Je peux itérer.

**Est-ce que ça "fonctionne" ?** Non, pas encore. Rien de ship. Rien en prod. Juste des outils, des repos, des assets. Mais c'est deux semaines. Et j'apprends.

**Est-ce que ça préfigure le futur du travail avec des IA ?** Je ne sais pas. Mais c'est comme ça que j'expérimente aujourd'hui. Et chaque galère m'enseigne quelque chose sur les systèmes autonomes, la coordination multi-agents, les limites des LLMs.

Si vous construisez des systèmes multi-agents, ou si vous réfléchissez à comment structurer la collaboration homme-IA, sachez que c'est dur. Que ça ne ressemble pas aux démos polies. Que vous passerez 5h par jour dans les logs. Mais que l'apprentissage en vaut le détour.

Mes DMs sont ouverts si vous voulez discuter de ça.
