# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## À propos de l'utilisateur

- Pas de connaissances techniques — utiliser un langage simple, sans jargon
- Toujours expliquer ce que tu fais et pourquoi
- Si plusieurs choix : recommander le plus simple
- Toujours nommer le fichier touché avant de modifier
- Attendre la validation avant de commencer à coder

## Commandes utiles

**Lancer l'app en local :**
```
demarrer-serveur.bat
```
Ouvre `http://localhost:3000` dans le navigateur. Utilise Tailscale pour accès téléphone.

**Lancer le backend (si nécessaire séparément) :**
```
cd backend
npm install    ← une seule fois
npm start      ← démarre le serveur Express sur le port 3000
```

**Déploiement :** automatique via Vercel (push sur `main` = déploiement du frontend, dossier racine `frontend/`). Le backend est sur Render.com (déploiement séparé, manuel).

## Architecture générale

Application web sans framework, vanilla HTML / CSS / JS avec modules ES natifs. Pas de bundler, pas de compilation.

**Flux de données :**
1. L'utilisateur se connecte via `pages/login.html` → `js/login.js` → Supabase Auth
2. La session est stockée dans `localStorage` (clé `fdr_session`)
3. `main.js` vérifie la session au chargement et redirige selon le rôle :
   - `role = 'responsable'` → `pages/responsable.html`
   - sinon → formulaire technicien (`index.html`)

**Services externes :**
- **Supabase** : authentification + base de données + stockage PDF. URL et clé anon dans `frontend/js/modules/config.js`
- **Backend Express** (Render) : `https://feuilles-de-routes-hopteam.onrender.com` — sert uniquement à envoyer les emails via `/send-email` (multer + SendGrid)
- **html2pdf.js** : chargé depuis CDN dans `index.html`, utilisé par `pdf.js`

**Tables Supabase :**
- `profiles` : `id, nom, role, contrat` (35 ou 39)
- `feuilles_de_route` : en-tête de la feuille du jour (date, tech, heures…)
- `interventions` : lignes détail liées à une feuille (`feuille_id`)

## Structure des fichiers JS (frontend)

```
frontend/js/
├── main.js              ← point d'entrée technicien (events DOM, init app)
├── login.js             ← point d'entrée login
├── api/
│   └── api.js           ← envoi email + sauvegarde Supabase après envoi
├── modules/
│   ├── config.js        ← URL et clé Supabase
│   ├── auth.js          ← session localStorage, connexion/déconnexion Supabase Auth
│   ├── db.js            ← toutes les requêtes Supabase REST (feuilles, interventions, profils)
│   ├── db_responsable.js ← requêtes Supabase spécifiques vue responsable
│   ├── fdr.js           ← barrel file : réexporte tout depuis fdr_config, fdr_calculs, fdr_form, fdr_brouillon
│   ├── fdr_config.js    ← configuration locale (email responsable, company, logo, contrat)
│   ├── fdr_calculs.js   ← calcul des heures travaillées et heures supp
│   ├── fdr_form.js      ← ajout/suppression/déplacement d'interventions et pauses dans le DOM
│   ├── fdr_brouillon.js ← sauvegarde/restauration brouillon dans localStorage
│   ├── pdf.js           ← génération PDF (téléchargement local)
│   ├── pdf_layout.js    ← mise en page du document PDF
│   ├── pdfviewer.js     ← aperçu PDF dans la page
│   ├── dashboard.js     ← barrel : réexporte dashboard_calendar et dashboard_stats
│   ├── dashboard_calendar.js ← calendrier du tableau de bord
│   ├── dashboard_stats.js    ← statistiques heures du tableau de bord
│   ├── ui.js            ← barrel UI : réexporte ui_form, ui_history, ui_settings, ui_heures
│   ├── ui_form.js       ← actions formulaire (nouvelle feuille, réinitialiser)
│   ├── ui_history.js    ← modal historique des feuilles
│   ├── ui_settings.js   ← modal paramètres
│   ├── ui_heures.js     ← modal récap heures supp
│   ├── autocomplete.js  ← mémorisation et suggestion des champs client/ville
│   ├── toolbar.js       ← barre d'outils bas de page
│   ├── responsable.js   ← logique page responsable
│   ├── responsable_render.js ← rendu HTML page responsable
│   ├── admin_users.js   ← gestion des utilisateurs (admin)
│   ├── admin_users_ui.js ← rendu HTML gestion utilisateurs
│   └── resume.js        ← module résumé/récap
└── utils/
    └── utils.js         ← fonctions partagées (showToast, setBusy, validerFormulaire…)
```

## Règles de code

- Maximum 150 lignes par fichier JS — si dépassement, créer un nouveau fichier
- Un fichier = une seule responsabilité
- Jamais de style inline ni de script inline dans le HTML
- Séparer : logique métier → `modules/`, appels Supabase → `db.js` ou `db_responsable.js`, appels backend → `api/api.js`
- Les fichiers "barrel" (`fdr.js`, `dashboard.js`, `ui.js`) ne contiennent que des réexports — ne pas y mettre de logique

## Calcul des heures

- Contrat 35h → 7h par jour
- Contrat 39h → 8h les jours normaux, 7h le vendredi

## Pages et optimisation

- `index.html` → optimisé téléphone (techniciens)
- `pages/responsable.html` → optimisé ordinateur (lecture seule)
- `pages/login.html` → optimisé téléphone et ordinateur

## Réorganisation de fichiers

Quand on déplace un fichier :
1. Déplacer le fichier
2. Mettre à jour immédiatement TOUS les imports/liens dans tout le projet
3. Vérifier `manifest.json` et `sw.js` si un asset est déplacé
4. Vérifier `vercel.json` si la structure racine change
5. Procéder fichier par fichier

## Déploiement Vercel

Le build Vercel (voir `vercel.json`) exécute une commande `node` qui injecte l'ID de déploiement dans `sw.js` afin de forcer le rechargement du cache service worker à chaque déploiement. Le « Root Directory » du projet Vercel est réglé sur `frontend/`.
