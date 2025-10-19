# API CGI Codex

API Express qui expose les articles du Code Général des Impôts marocain à partir du fichier brut `cgi-2025-fr-brut.txt`.

## Démarrage

```bash
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:4000`.

## Exporter les données

Le script `src/exportData.js` permet de générer les données des articles au format JSON et/ou dans une base SQLite.

```bash
# Génère les deux formats dans backend/data
npm run export

# JSON uniquement
npm run export:json

# SQLite uniquement
npm run export:sqlite
```

Les fichiers sont écrits dans le dossier `backend/data` (ignoré par Git).

## Endpoints principaux

- `GET /api/articles` : liste paginée avec recherche, tri et filtrage par tag.
- `GET /api/articles/:id` : contenu détaillé d'un article.
- `GET /api/articles/:id/pdf` : export de l'article en PDF.
- `GET /api/search/suggestions` : suggestions instantanées pour la recherche.
- `GET /api/tags` : liste des tags détectés.

## Variables d'environnement

- `PORT` (optionnel) : port d'écoute du serveur.
