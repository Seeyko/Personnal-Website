# Personal branding & logo system

**Status**: completed
**Branch**: `claude/personal-branding-logo-ytdk6j`
**Started**: 2026-07-10 10:30

## Task
Analyser le site, rechercher les principes du personal branding fort, proposer une plateforme de marque et un système de logo.

## Files Being Modified
- BRANDING.md (nouveau — plateforme de marque complète)
- frontend/assets/brand/* (nouveau — système de logos SVG, favicons thémés, avatar, og:image, scènes motion)
- frontend/js/core/effects/blip-cursor.js + frontend/css/blip-cursor.css (en cours — curseur Blip interactif)
- frontend/js/core/effects/cathode-guide.js + frontend/css/cathode-guide.css (en cours — guide par section)
- frontend/index.html, frontend/js/theme-manager.js (en cours — favicon thémé, og meta, chargement modules)
- i18n/locales/fr.json + en.json (en cours — textes des bulles cathodeGuide)

## Progress
- [x] Analyse contenu + ADN visuel des 4 thèmes
- [x] Recherche web (81 sources) : frameworks, exemples de devs, principes logo, marché IA
- [x] Panel de 3 directions de marque + 3 juges — « EN BUILD / L'Atelier Ouvert » gagnante à l'unanimité
- [x] Design du système de marks (T▮, TA, roue, poinçon) validé visuellement sur les 4 thèmes, 16→200px
- [x] Génération avatar-512.png et og-image.png (1200×630)
- [x] BRANDING.md + README assets
- [x] Round 2 (feedback client « plus créatif, coloré, goofy ») : 15 concepts (5 designers) + 3 juges → mascotte **Blip** (curseur apprivoisé, fusion BLIP×KICKCURSOR), garde-robe par thème, pose skate, pose erreur T-Rex, sceau Heartbit ; avatar/og régénérés ; le T▮ sobre reste en registre corporate

## Notes/Discoveries
- Le site n'a AUCUN favicon ni balise og:/twitter: — quick win prioritaire.
- L'ancien tom-andrieu-logo.png est orphelin (référencé nulle part) — conservé pour l'instant, remplacé conceptuellement par la « roue des angles ».
- Contradiction à purger : CRO « J'accepte de nouveaux clients Q2 » vs now.json « pas de fenêtre freelance ».
- Aucune modification de code du site dans cette branche : uniquement assets + docs (l'implémentation favicon/header/og est listée en roadmap dans BRANDING.md).
