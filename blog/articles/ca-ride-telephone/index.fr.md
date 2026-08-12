---
title: "J'ai shippé « Ça ride » depuis mon téléphone"
excerpt: "Une migration en voiture, des vacances que j'aurais annulées, puis la maternité. Comment l'IA m'a permis d'avancer RideMyPark sans choisir entre le produit et les gens avec qui je vis."
publishedAt: "2026-08-12"
lang: fr
draft: false
private: true
visibility: password
passwordHash: "$2a$10$ETbH0aLpwd92h1XAxzRJjex87i/.iOQDYKPHAEU4LKkmZjJ153mX2"
coverImage: "cover.png"
---

Le 25 juillet on charge la voiture pour partir en vacances. Ma partenaire est à 34 semaines, et moi j'ai encore RideMyPark dans la tête parce que la migration de l'ancien WordPress vers le nouveau site est prête depuis un moment : le plan est écrit, les scripts aussi, il ne manquait surtout qu'une fenêtre pour surveiller la mise en prod. On a avancé le départ, donc cette fenêtre n'existait plus vraiment, et j'ai lancé la migration quand même avant de prendre la route.

## Sur l'autoroute

Dans la voiture ce n'est pas moi qui regarde les écrans, c'est ma partenaire sur son téléphone. Elle suit ce que disent les agents et l'état du site : la maintenance se met en place, elle se termine, le nouveau site est en ligne. Je lui demande d'ouvrir l'app mobile pour vérifier que les spots s'affichent encore et que rien d'évident n'est cassé. Globalement ça tient, sauf les avis qui ne remontent pas — le genre de détail agaçant qui, en temps normal, t'aurait collé au moins deux heures devant un ordi pour comprendre, patcher, redéployer et retester.

Là je décris le symptôme à un agent, il corrige, on reteste, et c'est bon. Ce n'est pas spectaculaire, mais c'est exactement le genre de grain de sable qui, avant, aurait mangé le début des vacances ou m'aurait fait hésiter à partir du tout.

## Une semaine dans les Pyrénées

On est dans une maison de famille, il y a la piscine, il y a du monde, et je ne sors pas un laptop sur une table pour « juste finir un truc ». Je sors le téléphone dans la voiture, le soir quand tout le monde dort, dans les moments creux de la journée. Ce n'est pas une journée de travail déguisée : ce sont des fenêtres courtes où je lance une session dans le cloud, je regarde le résultat, et je range.

Ça pose un vrai dilemme de déconnexion, et j'en parlerai dans un prochain article, parce que le sujet mérite mieux qu'une parenthèse. Ce que je peux dire ici, c'est qu'en temps normal j'aurais probablement annulé ces vacances. Je touchais tellement au but sur cette refonte que je traînais depuis cinq ans sans jamais réussir à la terminer, et la mise en prod ne pouvait plus attendre. Grâce à l'IA, cette refonte est passée en un mois, et du coup j'ai pu partir quand même — pas en lâchant tout à 100 %, mais en décrochant à peu près à 80 %, ce qui est déjà infiniment mieux que rester à la maison pour finir la migration pendant que tout le monde est ailleurs.

Dans ce même creux, je me suis aussi autorisé à reprendre le sujet que je remettais depuis des années : les sessions. Pas le gros event public, juste le « on se retrouve au spot » entre riders, tout de suite ou dans deux semaines parce que les gens taffent. Sur l'ancien monde WordPress, le terrain ne le permettait pas vraiment ; là le nouveau site était live, donc j'ai commencé par cadrer le produit avec Claude Code — qu'est-ce qu'on veut vraiment, éclair ou planifié, pour qui, où on s'arrête pour la V1 — plutôt que de demander à une IA de générer la feature d'un coup. En un ou deux jours on a figé « Ça ride », et surtout je l'ai fait au moment où l'énergie était là, sans attendre un sprint imaginaire au retour.

## À l'hôpital, sans en faire un manifeste

Ensuite plus rien ne se passe comme prévu : contractions, maternité, naissance le 2 août, puis la néonat. La majorité du temps, on nourrit, on dort, on recommence. Je ne raconte pas ça pour dire que j'ai « shippé depuis l'hôpital » comme une performance. Je le fais quand tout le monde dort, dans les moments calmes, le même genre de fenêtres où beaucoup de gens doomscrollent ou mettent une série. Moi, dans ces moments-là, je m'amuse à prototyper et à faire avancer RideMyPark. Ce n'est ni mieux ni pire moralement ; c'est juste ce que je fais.

Avant, j'aurais culpabilisé. J'aurais ressenti de l'angoisse à l'idée de choisir entre ma fille et le travail — et même si le choix semble évident sur le papier, mon cerveau ne le traite pas toujours aussi proprement. Là, je n'ai plus vraiment à choisir de la même façon. Je peux taffer une heure dans la journée, découpée en dix petites sessions, et le produit avance comme si j'avais passé une semaine devant un PC, tout en m'occupant de ma famille, en faisant du sport, en étant présent le reste du temps.

Certes, c'est moins relaxant que tout lâcher. Mais dans certains moments on n'a pas le luxe du tout-lâcher, et l'IA m'a permis de trouver un juste milieu nettement plus avantageux pour mes proches que d'être celui qui vient en vacances (ou à l'hôpital) avec son ordinateur et qui ne joue pas vraiment avec eux.

Les collègues ont testé sur le staging, il n'y a pas eu énormément de retours, et j'ai mis en production en n'allumant d'abord la feature que pour eux, histoire de voir si c'était carré sans exposer tout le monde d'un coup. Aujourd'hui je suis encore dans la boucle sur le polish — le timer d'une session à venir, ce genre de détail qui change la sensation du produit — en prenant leurs feedbacks Discord, en les donnant à Claude Code, en itérant et en retestant au fil de l'eau.

## Ce que ça change pour moi

Si je mets les étapes bout à bout, ce n'est pas une méthode à copier. C'est une suite de moments où l'exécution a cessé d'exiger que je sois collé à un bureau.

La migration a tenu pendant qu'on était sur la route, et le bug mobile s'est réglé sans me voler la journée. Les vacances ont eu lieu alors que j'aurais annulé, parce que cinq ans de refonte venaient enfin de basculer en un mois. Le cadrage des sessions est sorti dans le creux, pas dans un calendrier idéal. Et pendant la période la plus chargée, je n'ai pas eu à transformer chaque heure creuse en culpabilité : une heure éclatée sur la journée a suffi à faire avancer le produit sans en faire le centre de tout.

Dans [Identity shift](https://tomandrieu.com/blog/identity-shift), je disais que coder n'est plus la partie difficile. Je n'avais pas encore cette preuve-là dans les mains. Maintenant si : le jugement peut tenir dans une poche, et l'exécution n'a plus besoin que je sacrifie les gens autour de moi pour avancer.
