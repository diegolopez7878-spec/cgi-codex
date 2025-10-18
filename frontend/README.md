# CGI Codex – Frontend

Interface Next.js inspirée de Medium.com pour explorer le Code Général des Impôts marocain.

## Démarrage

```bash
npm install
npm run dev
```

L’application se lance sur `http://localhost:3000` et consomme l’API Express (`http://localhost:4000`).

## Fonctionnalités

- Recherche instantanée avec suggestions contextuelles
- Filtrage par tags fiscaux (IS, IR, TVA…)
- Tri et pagination modernes
- Pages d’articles détaillées avec export PDF
- Modal interactif listant les références croisées
- Design responsive inspiré de Medium

## Variables d’environnement

- `NEXT_PUBLIC_API_BASE_URL` : URL de base de l’API (par défaut `http://localhost:4000`).
