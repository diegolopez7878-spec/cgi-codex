# API CGI Codex

API Express qui expose les articles du Code Général des Impôts marocain à partir du fichier brut `cgi-2025-fr-brut.txt`.
Les données sont prétraitées dans une base SQLite afin d'améliorer les temps de démarrage et les performances de recherche.

## Démarrage

```bash
npm install
npm run build:db # (à relancer si le fichier source change)
npm run dev
```

Le serveur démarre sur `http://localhost:4000`.

## Endpoints principaux

- `GET /api/articles` : liste paginée avec recherche, tri et filtrage par tag.
- `GET /api/articles/:id` : contenu détaillé d'un article.
- `GET /api/articles/:id/pdf` : export de l'article en PDF.
- `GET /api/search/suggestions` : suggestions instantanées pour la recherche.
- `GET /api/tags` : liste des tags détectés.

## Structure des données

Le script `npm run build:db` génère la base SQLite `data/cgi.db` à partir du fichier texte `cgi-2025-fr-brut.txt`. Les tables principales sont :

- `articles` : métadonnées, contenu et contexte de chaque article.
- `tags` et `article_tags` : association des tags détectés par article.
- `article_references` : liens croisés entre articles.

## Variables d'environnement

- `PORT` (optionnel) : port d'écoute du serveur.
