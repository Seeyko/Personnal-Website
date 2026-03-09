---
title: "Un an après Hello World : le train à pleine vitesse"
excerpt: "Deux mois après Hello World, tout a changé. Olympus abandonné, Claude Code seul, OpenClaw en sursis. Voilà où j'en suis."
publishedAt: "2026-03-05"
draft: false
lang: fr
private: false
---

J'ai écrit [Hello World](https://tomandrieu.com/blog/hello-world) en janvier 2026. J'y racontais ma découverte progressive de l'IA en 2025. Cursor, Claude Code, l'idée du Product Engineer. Nous sommes en mars 2026. Deux mois plus tard. Mais ce qui s'est passé depuis ressemble plus à deux ans qu'à deux mois.

## Olympus, Pantheon, et pourquoi j'ai tout arrêté

Entre janvier et mars, j'ai construit Olympus et Pantheon. L'idée : orchestrer 7 agents IA spécialisés qui travaillent en autonomie sur mes projets. Olympus, c'était un dashboard de task management pour coordonner les agents. API REST, PostgreSQL, interface React. Pantheon, c'était 7 agents spécialisés. Architecture (Daedalus), développement (Héphaestos), QA (Hygieia), recherche (Atlas), rédaction (Homère). Chacun avec sa propre expertise, son workflow, sa mémoire. L'idée était séduisante. Une équipe d'agents autonomes qui collaborent, se passent la main, itèrent ensemble. La réalité a été différente.

C'était trop complexe. Gérer 7 agents qui communiquent entre eux, c'est un overhead énorme. Debugging difficile. Quand quelque chose ne marche pas, c'est quel agent qui a merdé ? Quelle interaction a foiré ? Les gains de productivité n'étaient pas clairs. Pire, parfois c'était plus lent qu'un seul agent bien piloté. Pendant que j'expérimentais avec Olympus/Pantheon, Claude Code continuait d'évoluer. Terminal-first. Remote-control. SSH. MCP (Model Context Protocol). J'ai réalisé qu'un agent bien piloté fait le job. Pas besoin de 7.

Le pattern BMAD que j'avais formalisé (Brief → Main → Agent → Deliver) fonctionne. Mais pas besoin d'un orchestrateur externe. Tout peut se faire dans Claude Code. Petit à petit, j'ai arrêté d'utiliser Olympus. Les tâches étaient de moins en moins assignées. Les agents dormaient. Claude Code devenait mon outil unique. Résultat : Olympus/Pantheon, expérience utile, j'ai beaucoup appris sur l'orchestration et la complexité, mais abandonnée. Un seul agent bien piloté vaut mieux que 7 agents mal coordonnés.

## OpenClaw, et pourquoi ça va probablement disparaître

Mais alors, pourquoi OpenClaw ? Si Claude Code suffit pour le dev, pourquoi un autre système ? Aujourd'hui, OpenClaw fait quelque chose que Claude Code ne fait pas nativement : se souvenir. Knowledge Graph : un arbre de ma vie. Projets, décisions, préférences, conversations. Tout interconnecté. Je peux demander "c'était quand déjà que j'avais dit X sur Y ?" et OpenClaw retrouve, contextualise, me rappelle pourquoi j'avais dit ça. Il connaît mon style d'écriture (guide complet dans le KG). Il référence mes articles passés. Il sait ce que je déteste. Il applique automatiquement. Il me connaît.

Mais Anthropic ne dort pas. Les dernières news : `/loop` (mode conversation persistante), `/voice` (interaction vocale native), et surtout memory improvements, la mémoire long terme en cours d'intégration. Claude qui se souvient nativement des conversations passées, des préférences, des décisions.

Ma vision c'est qu'OpenClaw va probablement disparaître. Claude Code va intégrer la mémoire nativement. Pas besoin d'un système externe. Ce qui restera probablement : une instance Claude Code sur mon Mac Mini et une connexion à une app de chat (Discord, Telegram, peu importe). Pourquoi une app de chat externe ? Parce que les apps de chat sont mieux que les apps construites par les LLM. On les utilise déjà au quotidien. L'intégration dans les workflows existants est plus naturelle. OpenClaw devient juste un pont entre Claude et mes outils quotidiens. C'est normal. C'est l'évolution. Les wrapper layers disparaissent. On se rapproche de l'essentiel.

## Claude Code au quotidien, et ce qui manque

Claude Code est devenu mon outil principal, pas juste pour de l'autocomplétion mais pour piloter des projets entiers. Mon workflow est terminal-first, tout passe par le terminal avec remote-control pour les serveurs, SSH pour les environnements de prod, MCP pour connecter les outils. J'écris la spec avant le code, les tests en premier, Claude implémente en suivant les specs.

Les résultats sont concrets. MVP BVN en 3 semaines, scanr/autoscan en quelques jours, site perso reconstruit from scratch, features livrées en heures au lieu de jours. J'en ai parlé dans [Dev Shift Vision](https://tomandrieu.com/blog/dev-shift-vision), le rôle du dev évolue vers quelque chose de plus large. Claude Code accélère cette évolution, mais ça ne change pas le fond. Les specs comptent plus que jamais, l'architecture compte plus que jamais, comprendre le "pourquoi" derrière le "comment" compte plus que jamais. Claude peut coder à ma place, mais il ne peut pas architecturer à ma place ni prendre les décisions techniques critiques à ma place.

Ce qui me manque encore : monitoring des instances (je lance plusieurs Claude en parallèle, mais pas de vue d'ensemble), context management (gérer les dépendances entre features), et integration IDE native. C'est exactement ce que MnM, un projet en cours, essaie de résoudre. Dashboard spec-driven, test-driven, drift analysis. Pas encore prêt, mais c'est ce qu'il faut.

Un an après Hello World, voilà où j'en suis. Olympus/Pantheon abandonnés. Claude Code seul pour le dev. OpenClaw qui va probablement disparaître dans les prochains mois. De nouveaux outils en cours. Les choses évoluent très vite, et je ne sais pas où ça va. Mais j'adore cette vitesse et j'adore apprendre aussi vite.
