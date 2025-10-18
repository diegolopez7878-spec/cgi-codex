# API CGI Codex

API Express qui expose les articles du Code Général des Impôts marocain à partir du fichier brut `cgi-2025-fr-brut.txt`.

## Démarrage

```bash
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:4000`.

## Endpoints principaux

- `GET /api/articles` : liste paginée avec recherche, tri et filtrage par tag.
- `GET /api/articles/:id` : contenu détaillé d'un article.
- `GET /api/articles/:id/pdf` : export de l'article en PDF.
- `GET /api/search/suggestions` : suggestions instantanées pour la recherche.
- `GET /api/tags` : liste des tags détectés.

## Variables d'environnement

- `PORT` (optionnel) : port d'écoute du serveur.
