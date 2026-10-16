# Teach Tools archivé

**Status**: completed
**Branch**: `claude/optimistic-hamilton-2tjzov`
**Started**: 2026-10-16 22:00

## Task
Teach Tools quitte Vercel/Supabase/teach-tools.com (renouvellement le 27/10) pour une démo
archivée sur Dokploy (https://teach-tools.tomandrieu.com, cf. Seeyko/Teacher-Tools#13).
Côté site perso : nouvelle URL + mention « Archivé » sur la carte projet.

## Files Being Modified
- frontend/data/{fr,en}/projects.json (url + `"status": "archived"`)
- frontend/js/core/card-renderer.js (badge pour `status: "archived"`)
- frontend/css/base.css (`.project-status-badge`)
- frontend/i18n/locales/{fr,en}.json (`ui.archived`)
- frontend/index.html, frontend/blog.html (cache-busting)

## Progress
- [x] Champ `status` + badge partagé par tous les thèmes
- [x] Testé dans Chromium : default, terminal, blueprint, retro90s, fps × FR/EN

## Notes/Discoveries
- `frontend/css/components/cards.css` n'est chargé par aucune page : les styles de cartes partagés sont dans `css/base.css`.
- Un projet peut désormais porter `"status": "archived"` dans projects.json pour afficher le badge.
