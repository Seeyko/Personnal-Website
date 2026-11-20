# Archive des publications (`posts.json`)

Source de la page **Posts** (`/posts`, son propre onglet dans le menu ; ancienne adresse `/contenu`, redirigée).
Chaque post X y est affiché avec [react-xeet](https://react-xeet.vercel.app) via `GET {API_URL}/api/xeet/{id}` (backend Go), la carte construite depuis cette archive restant affichée si le tweet ne charge pas.
Servi tel quel sur `https://tomandrieu.com/data/social/posts.json`.

Un seul fichier pour toutes les plateformes. Aujourd'hui X ; YouTube et TikTok
s'ajoutent avec le même format, la page affiche alors un filtre par plateforme.

## Format

```jsonc
{
  "version": 1,
  "updated": "2026-09-27T00:00:00Z",          // date de la dernière synchro (ISO 8601, UTC)
  "accounts": {
    "x": { "handle": "TomAndrieu96707", "url": "https://x.com/TomAndrieu96707" }
  },
  "posts": [                                    // du plus récent au plus ancien
    {
      "id": "x:2104121658533630362",            // "<plateforme>:<id natif>", unique
      "platform": "x",                          // x | youtube | tiktok
      "kind": "reply",                          // post | reply | quote | thread | video
      "url": "https://x.com/TomAndrieu96707/status/2104121658533630362",
      "publishedAt": "2026-09-27T08:11:10Z",    // ISO 8601, UTC
      "lang": "en",                             // fr | en
      "text": "@davekiss Thanks for writing this…", // texte brut, \n pour les retours à la ligne
      "inReplyTo": ["davekiss"],                // optionnel, handles sans @ (kind = reply)
      "thread": { "id": "x:2104…", "index": 1, "total": 5 }, // optionnel : id = premier post du thread (calculé par x_to_posts.py), la page en fait une seule carte
      "hasMedia": false,                        // optionnel
      "hasLink": false,                         // optionnel
      "title": "…",                             // optionnel, vidéos
      "thumbnail": "https://…",                 // optionnel, vidéos
      "metrics": { "views": 177, "likes": 0, "replies": 0, "reposts": 0, "bookmarks": 0 }
    }
  ]
}
```

## Règles de mise à jour (synchro)

- **Fusionner, jamais remplacer** : on garde tous les anciens posts, on ajoute les
  nouveaux, et pour un `id` déjà présent on met à jour `metrics` (et `text` s'il a été édité).
- Trier par `publishedAt` décroissant, mettre `updated` à l'heure de la synchro.
- Garder des clés stables et l'indentation à 2 espaces pour des diffs lisibles.
- `main` est la prod : la synchro pousse sur une branche et ouvre une PR.

Le fichier est produit par `tools/social-sync/` (synchro X deux fois par semaine).
Pour les tweets, la date exacte se déduit aussi de l'id (snowflake :
`(id >> 22) + 1288834974657` ms).
