---
title: "Un hackathon IA à 15"
excerpt: "On a fait un hackathon IA au taff. 15 personnes, une semaine, du code de prod. Ce que ça a confirmé sur la coordination, les process, et ce qui change quand l'IA accélère tout."
publishedAt: "2026-03-15"
draft: false
lang: fr
private: true
passwordHash: "$2b$10$Dq9jJrrf32JE5Tw0WxWtiOuwOfH0b0M210sKYZdTrVAbKvywf4knS"
---

On a fait un hackathon IA au taff la semaine dernière. 15 personnes dans une salle, une semaine, objectif : tester ce que l'IA change concrètement dans notre façon de bosser. Pas un hackathon pour le fun. Un vrai test grandeur nature sur du code de prod.

Les résultats bruts sont impressionnants. Des modules legacy qu'on estimait à des semaines de refonte ont été migrés en quelques jours. Des features ont pris forme en une journée là où le process habituel aurait demandé des semaines de specs puis d'implémentation. Sur certaines tâches on était à plus de 200% de gain de productivité.

Mais honnêtement c'est pas ça qui m'a le plus marqué. Ce hackathon m'a rien appris de fondamentalement nouveau sur l'IA ou sur la technique. Ce que je voyais arriver en utilisant Claude Code sur mes side projects et sur des petits projets à plusieurs devs, ça s'est confirmé à l'échelle d'une équipe de 15. Travailler à plusieurs c'est plus complexe que seul. Et l'IA amplifie cette complexité autant qu'elle amplifie la productivité.

## La coordination, pas les outils

Les trois premiers jours ont été laborieux. On avait les outils, [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [BMAD](https://github.com/bmad-method/BMAD-METHOD) pour structurer les specs, des agents qui codent en autonomie. Mais le process n'était pas adapté. Les PO écrivaient des stories comme d'habitude : ils proposent, on ajuste au grooming. Ça marche en sprint classique. Mais avec les agents, les stories arrivaient sans concertation avec le design ni le dev. Les agents se retrouvaient avec des specs qui disaient un truc, des fichiers d'architecture qui disaient l'inverse, et un design qui n'avait pas été consulté. Résultat : du code avec un détail technique inventé et une UX bancale. C'est pas la faute des PO. Ils découvraient BMAD, ils appliquaient leur façon de travailler habituelle à un contexte qui ne la supporte plus. [L'IA ne corrige pas les dysfonctionnements, elle les rend plus visibles et plus rapides.](https://tomandrieu.com/blog/ia-amplifie)

Les deux derniers jours, on a juste itéré sur les stories existantes en laissant un peu plus de liberté au dev, et en étant côte à côte avec le PO et le designer. C'est tout. Le dev qui a une question UX, il tourne la tête et demande. Le PO qui voit un truc bizarre dans la démo, il le dit sur le moment. Le feedback loop passe de jours à minutes. Et le résultat est tellement meilleur.

Mais j'ai aussi eu le contre-exemple. J'ai voulu améliorer une UX que je trouvais pas bonne, en pensant que c'était un oubli de l'agent du PO qui avait déroulé de l'epic à la story sans tout relire. Un simple ajustement. Le lendemain le PO m'explique que cette UX avait été choisie en amont entre PM, PO et UX designer. Ils avaient déjà tranché. Et moi j'avais changé sans demander. Ça montre les deux côtés. D'un côté, être côte à côte et laisser de la liberté accélère tout. De l'autre, des fois la vision des autres te permet de mieux voir et comprendre des choix que tu aurais pas faits seul.

Dans le futur, il va falloir réduire cette friction entre les rôles. Soit en allant vers quelque chose de plus vertical comme [le product engineer](https://tomandrieu.com/blog/dev-shift-vision). Soit en rendant les specs plus robustes. Mais je trouve ça aliénant, autant pour le PO que pour le dev. Gabriel, un collègue avec qui je bosse beaucoup sur ces sujets, aime dire que le code va devenir un flux. J'accroche à cette vision. C'est pas grave si le dev se trompe une fois, si les dix autres fois ça porte ses fruits. Le coût de modification devient tellement faible que l'erreur n'est plus un drame, c'est une itération.

Certaines personnes restent réticentes. Pas à l'IA en soi, mais au changement d'outils, au terminal, à git. Je les comprends. Mais je pense vraiment que ces personnes vont se transformer aussi. Comme moi je me suis transformé quand j'ai découvert BMAD en perso et que je me suis rendu compte qu'on pouvait itérer et structurer sans tout casser, quand on prend le temps de pas tout vouloir one-shot.

## Ce que ça rend possible

Des chantiers qu'on repoussait depuis des années sont devenus viables du jour au lendemain. Du code legacy que tout le monde sait qu'il faut refaire mais que personne attaque. L'extraction du fonctionnel caché dans du vieux code, le reverse engineering des règles métier enfouies dans des if/else imbriqués sur 15 ans. Avec l'IA, ce boulot de fourmi est divisé par 5 ou 10. Des projets qui étaient dans la case "un jour peut-être" passent dans la case "on pourrait commencer le mois prochain".

Et malgré tous les couacs du début, en itérant jour après jour, on a sorti un bon résultat. C'était notre premier essai, sans préparation, en découvrant les outils. En prenant le temps de poser les process correctement, le potentiel est énorme.

Et un truc que j'ai réalisé en prenant du recul : ça fait des semaines, peut-être des mois, que j'ai quasi plus écrit une ligne de code. Pas juste pendant le hackathon. Sur mes projets perso aussi. Je conçois, je coordonne, je valide, j'itère avec les agents. Le code sort pas toujours bon du premier coup, mais c'est plus là-dessus qu'on itère. C'est sur la direction, les specs, la compréhension du besoin. Le code lui-même est devenu un sous-produit. Et je pense que ça ne m'arrivera plus, de coder manuellement. Ça me fait bizarre de le poser à l'écrit mais je le pense vraiment. Et ce que ça implique sur le métier, sur les rôles, sur ce qu'on devient quand le code n'est plus le travail, j'ai pas fini d'y réfléchir.
