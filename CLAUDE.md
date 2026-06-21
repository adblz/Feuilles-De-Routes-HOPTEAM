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

## Taille des fichiers et découpage

- Maximum 150 lignes par fichier JS
- Si tu dois dépasser, STOP : crée un nouveau fichier et dis-moi pourquoi
- Un fichier = une seule responsabilité (ex: pas calendrier + heures supp dans le même fichier)

## Avant de coder : toujours expliquer le plan

Avant chaque modification ou nouvelle fonctionnalité :
1. Dis-moi dans quel(s) fichier(s) tu vas écrire
2. Dis-moi pourquoi ce fichier et pas un autre
3. Si tu crées un nouveau fichier, dis-moi comment il s'appellera et où
4. Attends ma validation avant de commencer

## Ne jamais mélanger dans le même fichier

- La logique de calcul et l'affichage à l'écran
- Les appels Supabase et les événements de l'interface
- Deux fonctionnalités indépendantes

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
  - logique métier (calculs, règles) → js/modules/
  - manipulation DOM (affichage, événements clics) → js/modules/
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

## Projet complet
- application metier pour une equipe de 10 techniciens environ
- les techniciens seront les utilisateurs principaux de l'appli
- roles : les techniciens auront quasi tout les droits en ce qui concerne leurs informations, mais pas celles des autres; un ou plusieurs responsable auront un acces a toutes les pdf des feuilles de routes de chaque techniciens mais en lecture seule
