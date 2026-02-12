---
title: "Olympus : Mon Dashboard pour Orchestrer des Agents IA"
excerpt: "J'ai construit un dashboard pour coordonner une équipe de 7 agents IA qui travaillent en autonomie sur mes projets. Voici pourquoi, comment, et ce que j'ai appris."
publishedAt: "2026-02-12"
draft: false
lang: fr
---

Coordonner plusieurs agents IA qui travaillent en parallèle nécessite une infrastructure dédiée. Après deux semaines d'expérimentation avec 7 agents spécialisés (architecture, dev, QA, recherche, rédaction), j'ai construit Olympus — un système de task management conçu pour la coordination multi-agents.

## Le problème technique

Initialement, la coordination passait par Discord. Main (l'orchestrateur) recevait mes demandes, dispatchait aux agents spécialisés via mentions, récupérait les résultats dans les threads. Fonctionnel jusqu'à ~20 tâches actives.

**Limites observées** :
- Pas de vue globale : pour connaître l'état du système, fallait parser tous les threads Discord
- Pas de priorisation structurée : first-in-first-out basé sur l'ordre chronologique des messages
- Mémoire fragmentée : chaque agent avait ses fichiers (`daily-notes/`, `decisions/`), mais pas de base de données unifiée
- Coordination bloquée : si Atlas (recherche) devait passer la main à Daedalus (architecture), je jouais l'intermédiaire

Le filesystem comme source de vérité était insuffisant : pas de notifications, risques de conflits d'écriture, parsing manuel nécessaire. Discord n'est pas fait pour le task tracking structuré.

Solution : construire une API REST + UI web dédiée.

## Architecture technique

**Stack** :
- Backend : NestJS + TypeORM + PostgreSQL (hébergé sur VPS via Dokploy)
- Frontend : React 19 + Vite + Zustand + TanStack Query + shadcn/ui
- Déploiement : Dokploy (équivalent self-hosted de Vercel)

**Choix de conception** :

PostgreSQL plutôt que fichiers pour garantir l'ACID et permettre des requêtes complexes (`SELECT * FROM tasks WHERE assignee = 'hephaestos' AND status = 'blocked' AND updated_at < NOW() - INTERVAL '3 days'`).

NestJS pour la structure modulaire (DI, guards, pipes). TypeORM pour éviter le SQL manuel sur un projet secondaire.

React 19 plutôt que SvelteKit (migration après deux jours) : vélocité de dev supérieure grâce à ma maîtrise de l'écosystème React.

WebSockets pour notifier les agents en temps réel plutôt que du polling.

**API REST endpoints** :
```bash
GET    /tasks                    # Lister toutes les tâches
GET    /tasks?assignee=writer    # Filtrer par agent
GET    /tasks/:id                # Détails d'une tâche
POST   /tasks                    # Créer (Main uniquement)
PATCH  /tasks/:id                # Mettre à jour statut
POST   /tasks/:id/comments       # Ajouter un commentaire
GET    /tasks/:id/comments       # Lire les commentaires
```

**Authentification** :
Chaque agent a une clé API unique (`olympus_writer_bf165c9cdf429bcf`, `olympus_atlas_...`). Main a les droits `POST /tasks`, les autres agents seulement `PATCH` et commentaires.

**Rate limiting** :
- Création de tâches : max 5/minute par agent (éviter les boucles infinies)
- Updates : max 30/minute
- Commentaires : max 10/minute

Implémenté après qu'Atlas ait créé 47 tâches en 3 secondes (bug de logique où il re-scannait son propre cache avant que la BDD soit à jour).

## Données concrètes (15 jours d'utilisation)

**Volume** :
- 143 tâches créées (9,5/jour en moyenne)
- 67 tâches complétées (46,8% completion rate)
- 31 tâches en `blocked` (21,7%)
- 22 tâches en `backlog` (15,4%)
- 23 tâches en `in_progress` (16,1%)

**Répartition par agent** :
- Héphaestos (dev) : 41 tâches (28,7%)
- Atlas (recherche) : 28 tâches (19,6%)
- Hermès (scrum) : 24 tâches (16,8%)
- Daedalus (archi) : 19 tâches (13,3%)
- Homère (writing) : 17 tâches (11,9%)
- Hygieia (QA) : 14 tâches (9,8%)

**Temps moyen par tâche** :
- Recherche : 37 min
- Rédaction : 52 min
- Développement : 1h 23 min
- Architecture : 1h 51 min
- QA : 28 min

**Coûts (LLM API)** :
- Claude Sonnet 4 : ~8,40€/jour (126€ sur 15 jours)
- Breakdown : 68% input tokens, 32% output tokens
- Tâche la plus coûteuse : architecture d'API (3,12€)
- Tâche la moins coûteuse : review PR (0,07€)

**Heartbeats Main** :
- Fréquence configurée : 4x/jour (8h, 12:30, 17h, 21h)
- Heartbeats réussis : 47/60 (78,3%)
- Heartbeats manqués : 13 (cron failures, timeouts)
- Durée moyenne heartbeat : 4 min 17 sec

## Workflow réel

Contrairement à l'idée initiale d'agents auto-organisés, le système fonctionne en **orchestration centralisée** :

**Main** (CEO agent) :
1. Heartbeat 4x/jour
2. Lit le backlog Olympus
3. Analyse ce qui doit être fait (basé sur ma vision)
4. Crée des tâches pour les agents spécialisés
5. Spawne les agents via `sessions_spawn` si nécessaire

**Agents spécialisés** :
1. Déclenchés par cron ou spawn
2. `GET /tasks?assignee={agent_id}&status=in_progress`
3. Travaillent sur la tâche
4. `PATCH /tasks/{id}` pour mettre à jour le statut
5. `POST /tasks/{id}/comments` pour documenter
6. Se rendorment

**Exemple concret** :

Je demande à Main : "Prépare un audit SEO du blog".

Main crée 3 tâches :
```json
{
  "title": "Crawler seeyko-website et extraire metadata",
  "assignee": "atlas",
  "priority": "high"
}
{
  "title": "Analyser structure HTML et identifier problèmes",
  "assignee": "daedalus",
  "priority": "medium"
}
{
  "title": "Proposer corrections techniques",
  "assignee": "hephaestos",
  "priority": "medium"
}
```

Atlas se réveille à son prochain cron (12:30), fetch sa tâche, crawle le site, poste les résultats en commentaire, met le statut en `done`.

Daedalus se réveille à 17h, voit que sa tâche attend les résultats d'Atlas, lit le commentaire d'Atlas, analyse, poste son rapport.

Héphaestos se réveille à 21h, lit les deux rapports, propose du code.

**Pas de coordination horizontale directe** : tout passe par Main et Olympus.

## Ce qui fonctionne

**Visibilité structurée** : Un dashboard remplace le scroll infini de Discord. Filtres par agent, statut, priorité. Vue d'ensemble en un coup d'œil.

**Mémoire centralisée** : Base de données PostgreSQL plutôt que fichiers dispersés. Requêtes complexes possibles (`SELECT AVG(updated_at - created_at) FROM tasks WHERE status = 'done'`).

**Rate limiting** : Évite les boucles infinies. Après le bug d'Atlas (47 tâches en 3 sec), le système limite à 5 créations/minute.

**Obligation de documenter les blocages** : Si un agent met une tâche en `blocked`, l'API vérifie qu'un commentaire récent existe (<2 min). Sinon, erreur 400. Force la documentation.

**WebSockets pour notifications temps réel** : Les agents n'ont pas besoin de poll en continu.

## Ce qui ne fonctionne pas (encore)

**Heartbeats instables** : 78,3% de succès seulement. 13 heartbeats manqués en 15 jours. Causes : timeouts LLM, cron failures, erreurs réseau.

**Completion rate faible** : 46,8% seulement. Beaucoup de tâches créées, peu terminées. Illusion de vélocité : créer 15 tâches en 2 minutes donne l'impression d'avancement, mais rien n'est livré.

**Pas de metrics en temps réel** : Les chiffres ci-dessus sont calculés manuellement via requêtes SQL. Pas de dashboard analytics dans Olympus v1.

**Blocages non résolus automatiquement** : 31 tâches bloquées (21,7%). Main ne les reprend pas systématiquement lors de ses heartbeats.

**Pas de système de dépendances** : "B attend A" existe en commentaires, pas en logique système. Les agents gèrent ça manuellement.

**Pas de notifications push pour moi** : WebSockets fonctionnent pour les agents, mais je dois checker le board manuellement.

## Temps investi (moi)

**Développement Olympus** : ~22h sur 3 jours (backend 8h, frontend 10h, déploiement 4h).

**Opérations quotidiennes** : ~5h/jour (discussions avec Main, déblocage tâches, fix bugs, affinement prompts).

Total 15 jours : 22h dev + 75h ops = **97h**.

**Rien de ship en production**. Des outils créés, des repos initialisés, des assets générés. Mais rien qui génère un euro. C'est de l'infrastructure et de l'expérimentation.

## Leçons techniques

**1. Une base de données relationnelle est non-négociable**

Le filesystem ne suffit pas pour la coordination temps réel. PostgreSQL permet des requêtes complexes, des transactions ACID, des contraintes d'intégrité.

**2. L'orchestration centralisée simplifie la coordination**

Plutôt que chaque agent communique avec tous les autres (n² interactions), tout passe par Main (n interactions). Les agents spécialisés exécutent, ne coordonnent pas.

**3. Rate limiting dès le jour 1**

Ne pas attendre qu'un agent crée 47 tâches en 3 secondes pour implémenter des limites.

**4. Forcer la documentation des blocages**

Si un agent bloque sans expliquer pourquoi, le système doit rejeter l'update. Obligation de commenter.

**5. Commencer minimal**

Olympus v0 : 3 statuts, CRUD basique, pas de WebSockets. Ça a suffi pendant 2 semaines. Ajouter des features uniquement quand le besoin est prouvé.

**6. Les kill switches doivent être indépendants**

Si `/stop` dépend de l'agent étant coopératif, ce n'est pas un kill switch. Prévoir des timeouts, des hard limits, un accès SSH au serveur.

**7. Mesurer la vélocité réelle, pas la création de tâches**

Créer 15 tâches/jour n'est pas un indicateur de progrès. Ce qui compte : combien sont *terminées*, et combien *livrent de la valeur*.

## Prochaines étapes

**Court terme (semaine prochaine)** :
- Améliorer la fiabilité des heartbeats (retry logic, meilleurs timeouts)
- Dashboard analytics (métriques temps réel dans l'UI)
- Notifications push pour moi (email ou Discord quand tâche bloquée >48h)

**Moyen terme (mois prochain)** :
- Système de dépendances entre tâches (DAG)
- Templates pour tâches récurrentes
- Historique détaillé avec diff (voir exactement ce qui a changé)

**Long terme** :
- Auto-résolution de certains blocages par Main
- Optimisation des coûts LLM (caching, modèles plus légers pour tâches simples)
- Agents en mode "watch" plutôt que cron (réagir immédiatement aux nouveaux events)

## Conclusion

Olympus n'est pas un projet d'IA révolutionnaire. C'est un CRUD app avec une API REST et un kanban board. Mais c'est l'infrastructure nécessaire pour expérimenter avec des systèmes multi-agents.

**Données factuelles** : 143 tâches en 15 jours, 46,8% complétées, 126€ de coûts LLM, 97h de mon temps investi. Rien en production.

**Ce que j'ai appris** : l'orchestration centralisée fonctionne mieux que la coordination horizontale. Les agents sont rapides mais peu fiables. La création de tâches n'est pas la vélocité. La visibilité structurée est essentielle.

**Ce qui reste à prouver** : est-ce que ce système peut réellement livrer de la valeur en production ? Ou est-ce juste une infrastructure coûteuse pour de l'expérimentation ? Les 15 prochains jours le diront.

Le code d'Olympus n'est pas encore public. Mais si vous construisez des systèmes multi-agents et voulez en discuter, mes DMs sont ouverts.
