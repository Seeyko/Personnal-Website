---
title: "Un an après Hello World : le train à pleine vitesse"
excerpt: "Deux mois après Hello World, tout a changé. Olympus abandonné, Claude Code seul, OpenClaw qui va disparaître. Les choses vont vite. Très vite."
publishedAt: "2026-03-08"
draft: false
lang: fr
private: true
passwordHash: "$2a$10$rpI8Eg912NE7ujSMZ/xPouaPAC/M7vFWTZVfLfBjILCiYT8bXYfi."
---

J'ai écrit [Hello World](https://tomandrieu.com/blog/hello-world) en janvier 2026. J'y racontais ma découverte progressive de l'IA en 2025. Cursor, Claude Code, l'idée du Product Engineer. Nous sommes en mars 2026. Deux mois plus tard. Mais ce qui s'est passé depuis ressemble plus à deux ans qu'à deux mois.

## L'expérience Olympus/Pantheon — et le drift vers Claude Code

Entre janvier et mars, j'ai construit Olympus et Pantheon. L'idée : orchestrer 7 agents IA spécialisés qui travaillent en autonomie sur mes projets. Olympus, c'était un dashboard de task management pour coordonner les agents. API REST, PostgreSQL, interface React. Un système complet de gestion de tâches, priorisation, statuts, commentaires. Pantheon, c'était 7 agents spécialisés. Architecture (Daedalus), développement (Héphaestos), QA (Hygieia), recherche (Atlas), rédaction (Homère). Chacun avec sa propre expertise, son workflow, sa mémoire. L'idée était séduisante. Une équipe d'agents autonomes qui collaborent, se passent la main, itèrent ensemble. La réalité a été différente.

C'était trop complexe. Gérer 7 agents qui communiquent entre eux, c'est un overhead énorme. Debugging difficile. Quand quelque chose ne marche pas, c'est quel agent qui a merdé ? Quelle interaction a foiré ? Quel contexte a été mal transmis ? Les gains de productivité n'étaient pas clairs. Pire, parfois c'était plus lent qu'un seul agent bien piloté. Pendant que j'expérimentais avec Olympus/Pantheon, Claude Code continuait d'évoluer. Terminal-first. Remote-control. SSH. MCP (Model Context Protocol). Intégration profonde avec les outils quotidiens. J'ai réalisé quelque chose. Un agent bien piloté fait le job. Pas besoin de 7.

Le pattern BMAD que j'avais formalisé (Brief → Main → Agent → Deliver) fonctionne. Mais pas besoin d'un orchestrateur externe. Tout peut se faire dans Claude Code. Petit à petit, j'ai arrêté d'utiliser Olympus. Les tâches étaient de moins en moins assignées. Les agents dormaient. Claude Code devenait mon outil unique. Pourquoi gérer 7 agents quand 1 suffit ? Résultat : Olympus/Pantheon, expérience utile, mais abandonnée. Claude Code : mon seul outil de dev maintenant. J'ai appris beaucoup. Sur l'orchestration. Sur la complexité. Sur ce qui marche et ce qui ne marche pas. Mais la conclusion est claire. Simplicité > orchestration complexe.

## Pourquoi j'utilise encore OpenClaw (et pourquoi ça va changer)

Mais alors, pourquoi OpenClaw ? Si Claude Code suffit pour le dev, pourquoi un autre système ? Aujourd'hui, OpenClaw fait quelque chose que Claude Code ne fait pas nativement : se souvenir. Knowledge Graph : un arbre de ma vie. Projets, décisions, préférences, conversations. Tout interconnecté. Je peux demander "c'était quand déjà que j'avais dit X sur Y ?" et OpenClaw retrouve, contextualise, me rappelle pourquoi j'avais dit ça. Gestion de vie : rappels contextuels précis. Pas juste "faire X", mais "faire X parce que tu as dit Y la semaine dernière et Z dépend de ça". Écriture d'articles : il connaît mon style (guide tom-writing-style dans le KG). Il référence mes articles passés. Il sait ce que je déteste (buzzwords, phrases staccato, dividers). Il applique automatiquement. Il me connaît. Pas juste un outil, un assistant qui grandit avec moi.

Cette semaine, exemple concret. OpenClaw a analysé mes articles existants, extrait mon style, créé un guide complet (SKILL.md, style-guide.md, examples.md, checklist.md). Maintenant, il l'applique automatiquement quand j'écris. Mais ça va probablement changer. Anthropic ne dort pas. Les dernières news : `/loop` (mode conversation persistante, plus besoin de redemander le contexte), `/voice` (interaction vocale native, plus fluide que les wrappers externes), memory improvements (mémoire long terme en cours d'intégration, Claude qui se souvient nativement des conversations passées, des préférences, des décisions).

Ma vision : OpenClaw va probablement disparaître. Pourquoi ? Parce que selon moi, Claude Code va intégrer la mémoire nativement. Pas besoin d'un système externe. Une instance Claude Code suffira. Ce qui restera probablement : une instance Claude Code sur mon Mac Mini, une connexion à une app de chat (Discord, Telegram, peu importe). Pourquoi une app de chat externe ? Parce que les apps de chat sont mieux que les apps construites par les LLM. On les utilise déjà au quotidien. L'intégration dans les workflows existants est plus naturelle. OpenClaw devient juste un pont entre Claude et mes outils quotidiens. La vraie valeur sera dans Claude Code + memory native. Les systèmes externes comme OpenClaw deviendront probablement obsolètes. C'est normal. C'est l'évolution. Je ne suis pas nostalgique. C'est exactement ce qui devait arriver. Claude intègre ce qui manquait. Les wrapper layers disparaissent. On se rapproche de l'essentiel.

## Mon expérience Claude Code — et ce qui manque encore

Claude Code est devenu mon outil principal. Mais pas juste pour de l'autocomplétion. Pour piloter des projets entiers. Mon workflow actuel : terminal-first. Tout dans le terminal. Remote-control pour les serveurs distants. SSH pour les environnements de prod. MCP pour connecter les outils (GitHub, Linear, bases de données). Spec-driven, test-driven. J'écris la spec avant le code. Tests en premier. Claude implémente en suivant les specs. Itération rapide basée sur les tests qui passent ou échouent.

Résultats concrets : MVP BVN : 3 semaines. scanr/autoscan : quelques jours. Site perso : reconstruit from scratch. Features en heures vs jours avant. J'en ai parlé dans [Dev Shift Vision](https://tomandrieu.com/blog/dev-shift-vision). Le rôle du dev évolue. Pas juste exécuter, piloter. Pas juste coder, architecturer + livrer. Claude Code accélère cette évolution. Mais ça ne change pas le fond. Un bon dev reste un bon dev. L'IA amplifie, elle ne remplace pas. Les specs comptent plus que jamais. L'architecture compte plus que jamais. Comprendre le "pourquoi" derrière le "comment" compte plus que jamais. Claude peut coder à ma place. Mais pas architecturer à ma place. Pas prendre les décisions techniques critiques à ma place.

Ce qui me manque encore : monitoring des instances. Je lance plusieurs instances Claude en parallèle. Mais pas de vue d'ensemble. Ce que je veux : dashboard ("Feature X : 70% terminé"), spec-driven tracking (avancée par rapport aux specs que j'ai données), test-driven visibility ("12/20 tests passent, voilà lesquels échouent"), drift value ("tu as demandé A, mais Claude a fait A' parce que B"). Context management : gérer le contexte entre plusieurs features. "Feature X dépend de Y, attention si tu changes Y." Auto-detect des dépendances. Integration IDE native : aujourd'hui c'est terminal + remote-control. Demain : intégration profonde dans VSCode/Cursor. Mais sans perdre la puissance du terminal.

Ce qui arrive : MnM (projet en cours). Dashboard de monitoring pour instances Claude. Spec-driven, test-driven, drift analysis. Pas encore prêt. Mais c'est exactement ce qui manque.

## Keep learning, on voit où on va

Un an après Hello World, voilà où j'en suis : sur un train à pleine vitesse. Olympus/Pantheon abandonnés. Claude Code seul pour le dev. OpenClaw qui va disparaître dans les prochains mois. Nouveaux outils en cours (MnM). Les choses évoluent vite. Très vite. Je ne sais pas où ça va. Mais j'adore cette vitesse. J'adore cette incertitude. J'adore apprendre aussi vite. Keep learning. On voit où on va. Le train est lancé.
