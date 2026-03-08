---
title: "Olympus : Mon Dashboard pour Orchestrer des Agents IA"
excerpt: "J'ai construit un dashboard pour coordonner une équipe de 7 agents IA qui travaillent en autonomie sur mes projets. Voici pourquoi, comment, et ce que j'ai appris."
publishedAt: "2026-02-08"
draft: false
lang: fr
private: false
---

Coordonner plusieurs agents IA qui travaillent en parallèle nécessite une infrastructure dédiée. Après quelques semaines d'expérimentation avec 7 agents spécialisés (architecture, dev, QA, recherche, rédaction), j'ai construit Olympus — un système de task management conçu pour la coordination multi-agents.

## Le problème technique

Initialement, la coordination passait par Discord. Main (l'orchestrateur) recevait mes demandes, dispatchait aux agents spécialisés via mentions, récupérait les résultats dans les threads. Fonctionnel au début.

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

PostgreSQL plutôt que fichiers pour garantir l'ACID et permettre des requêtes complexes.

NestJS pour la structure modulaire (DI, guards, pipes). TypeORM pour éviter le SQL manuel sur un projet secondaire.

React 19 plutôt que SvelteKit (migration après quelques jours) : vélocité de dev supérieure grâce à ma maîtrise de l'écosystème React.

WebSockets pour notifier les agents en temps réel plutôt que du polling.

**API REST endpoints** :
```bash
GET    /tasks                    # Lister toutes les tâches
GET    /tasks?assignee=writer    # Filtrer par agent
GET    /tasks/:id                # Détails d'une tâche
POST   /tasks                    # Créer (Main uniquement)
PATCH  /tasks/:id                # Mettre à jour statut
POST   /tasks/:id/comments       # Ajouter un commentaire
```

**Authentification** :
Chaque agent a une clé API unique. Main a les droits `POST /tasks`, les autres agents seulement `PATCH` et commentaires.

**Rate limiting** :
Implémenté après qu'Atlas ait créé des dizaines de tâches en quelques secondes (bug de logique où il re-scannait son propre cache avant que la BDD soit à jour).

## Workflow réel

Contrairement à l'idée initiale d'agents auto-organisés, le système fonctionne en **orchestration centralisée** :

**Main** (CEO agent) :
1. Heartbeat plusieurs fois par jour
2. Lit le backlog Olympus
3. Analyse ce qui doit être fait (basé sur ma vision)
4. Crée des tâches pour les agents spécialisés
5. Spawne les agents via `sessions_spawn` si nécessaire

**Agents spécialisés** :
1. Déclenchés par cron ou spawn
2. Fetch leurs tâches assignées via l'API
3. Travaillent sur la tâche
4. Mettent à jour le statut et postent des commentaires
5. Se rendorment

**Pas de coordination horizontale directe** : tout passe par Main et Olympus.

## Ce qui fonctionne

**Visibilité structurée** : Un dashboard remplace le scroll infini de Discord. Filtres par agent, statut, priorité. Vue d'ensemble en un coup d'œil.

**Mémoire centralisée** : Base de données PostgreSQL plutôt que fichiers dispersés. Requêtes complexes possibles.

**Rate limiting** : Évite les boucles infinies.

**Obligation de documenter les blocages** : Si un agent met une tâche en `blocked`, l'API vérifie qu'un commentaire récent existe. Force la documentation.

**WebSockets pour notifications temps réel** : Les agents n'ont pas besoin de poll en continu.

## Ce qui ne fonctionne pas (encore)

**Heartbeats instables** : Certains heartbeats manqués (cron failures, timeouts).

**Beaucoup de tâches créées, moins terminées** : Illusion de vélocité. Créer des tâches rapidement donne l'impression d'avancement, mais ce qui compte c'est ce qui est livré. Concrètement, j'avais environ 50 tâches créées par heure, mais avec un taux d'échec d'environ 40%. Au final, la moitié des tâches étaient des rattrapages des tâches ratées d'avant. Ça devenait invivable et inutile.

**Pas de metrics intégrées** : Pas de dashboard analytics dans Olympus v1.

**Blocages non résolus automatiquement** : Main ne reprend pas systématiquement les tâches bloquées.

**Pas de système de dépendances** : "B attend A" existe en commentaires, pas en logique système.

## Leçons techniques

**1. Une base de données relationnelle est non-négociable**

Le filesystem ne suffit pas pour la coordination temps réel.

**2. L'orchestration centralisée simplifie la coordination**

Ce que j'ai découvert avec Olympus et ces 7 agents, c'est que plutôt que de passer une patate chaude dans les mains de plusieurs personnes (agents), il vaut mieux laisser une personne (ou un agent) gérer en plusieurs étapes, et lui donner les skills et tools nécessaires à chaque étape de son parcours. L'orchestration centralisée (tout passe par Main) a été une expérimentation nécessaire pour comprendre ça.

**3. Rate limiting dès le jour 1**

Ne pas attendre qu'un agent crée des dizaines de tâches en boucle pour implémenter des limites.

**4. Forcer la documentation des blocages**

Si un agent bloque sans expliquer pourquoi, le système doit rejeter l'update.

**5. Commencer minimal**

Olympus v0 : quelques statuts, CRUD basique, pas de WebSockets. Ajouter des features uniquement quand le besoin est prouvé.

**6. Les kill switches doivent être indépendants**

Si `/stop` dépend de l'agent étant coopératif, ce n'est pas un kill switch.

**7. Mesurer la vélocité réelle, pas la création de tâches**

Ce qui compte : combien sont *terminées*, et combien *livrent de la valeur*.

## Conclusion

Olympus n'est pas un projet d'IA révolutionnaire. C'est un CRUD app avec une API REST et un kanban board. Mais c'est l'infrastructure nécessaire pour expérimenter avec des systèmes multi-agents.

**Ce que j'ai appris** : l'orchestration centralisée fonctionne mieux que la coordination horizontale. Les agents sont rapides mais peu fiables. La création de tâches n'est pas la vélocité. La visibilité structurée est essentielle.

**Ce qui reste à prouver** : est-ce que ce système peut réellement livrer de la valeur en production ?

Le code d'Olympus n'est pas encore public. Mais si vous construisez des systèmes multi-agents et voulez en discuter, mes DMs sont ouverts.
