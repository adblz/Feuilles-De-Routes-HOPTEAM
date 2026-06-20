# CLAUDE.md

## Qui je suis
Je ne suis pas développeur, je n'ai pas de connaissances 
techniques. Adapte ton langage en conséquence.

## Comment me parler
- Langage simple, pas de jargon
- Explique ce que tu fais et pourquoi
- Si plusieurs choix possibles : recommande le plus simple
- Dis-moi toujours quel fichier tu touches

## Organisation des fichiers
Toujours respecter une structure logique et me la montrer
Ne pas éparpiller les fichiers n'importe où
Me demander si tu n'es pas sûr où mettre quelque chose

## Architecture générale

Toujours respecter cette structure de dossiers :

feuille-de-route/
├── frontend/
│   ├── assets/
│   │   ├── css/          ← tous les fichiers CSS
│   │   └── images/       ← logos, icônes, images
│   ├── js/
│   │   ├── api/          ← appels API
│   │   ├── modules/      ← modules fonctionnels
│   │   └── utils/        ← fonctions utilitaires
│   ├── pages/            ← pages HTML secondaires (login.html, etc.)
│   ├── index.html        ← page principale
│   ├── manifest.json
│   └── sw.js
├── backend/
│   └── index.js
└── netlify.toml

## Frontend (OBLIGATOIRE)

- Le CSS doit être séparé dans des fichiers dédiés dans assets/css/
- Le JS doit être dans js/ avec les sous-dossiers appropriés
- Les images dans assets/images/
- Les pages HTML secondaires dans pages/
- Jamais de style inline ou de script inline dans le HTML

## Organisation du code

- Séparer clairement :
  - logique métier → js/modules/
  - manipulation DOM → js/modules/
  - appels API → js/api/
  - fonctions utilitaires → js/utils/
  - génération PDF → js/modules/

## Réorganisation de projet

Quand on déplace ou réorganise des fichiers :
1. Déplacer le fichier dans le bon dossier
2. Mettre à jour IMMÉDIATEMENT tous les chemins/imports/liens
   dans TOUS les fichiers du projet
3. Vérifier manifest.json et sw.js si des assets sont déplacés
4. Vérifier netlify.toml si la structure racine change
5. Procéder fichier par fichier, pas tout en même temps

## Calcul des heures (fdr.js)

- Contrat 35h → 7h par jour toujours
- Contrat 39h → 8h les jours normaux, 7h le vendredi

## Cohérence du projet

- Toujours respecter la structure existante
- Ne pas recréer une nouvelle architecture sans raison
- S'intégrer proprement dans les fichiers existants

## Interdictions

- Pas de mélange HTML / JS / CSS
- Pas de duplication de code
- Pas de fonctions inutilisées
- Pas de logique complexe dans index.html
- Pas de sections vides dans ce fichier
