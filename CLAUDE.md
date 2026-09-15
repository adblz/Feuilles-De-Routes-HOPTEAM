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
- **Backend Express** (Render) : `https://feuilles-de-routes-hopteam.onrender.com` — gestion des comptes avec la clé `service_role` Supabase : `/admin/create-user`, `/admin/delete-user/:id`, `/admin/update-user/:id` (nom, contrat), `/admin/reset-password/:id`. Accessible à l'admin, et au **responsable uniquement pour les techniciens de sa propre entreprise** (règles dans `backend/controllers/adminGuard.js` : rôle forcé à technicien, entreprise forcée à la sienne). La fonction d'envoi d'email a été retirée (pas de service d'email configuré).
- **html2pdf.js** : chargé depuis CDN dans `index.html`, utilisé par `pdf.js`

**Tables Supabase :**
- `profiles` : `id, nom, role, contrat` (35 ou 39)
- `feuilles_de_route` : en-tête de la feuille du jour (date, tech, heures…)
- `interventions` : lignes détail liées à une feuille (`feuille_id`)
- `clients_planning` : clients à visiter (import Excel « sanitation » par le responsable), une ligne par PDV affecté à un technicien (`user_id`) ; `fait_le` null = à faire
- `clients_secteurs` : correspondance « Secteur technicien » (texte Excel) → compte technicien, mémorisée par entreprise
- `clients_imports` : journal des imports du planning
- `validations_heures_supp` : heures supp validées par le responsable, une ligne par (`user_id`, `date`) — pas par feuille, car une feuille ré-enregistrée est supprimée puis recréée (nouvel id)

## Structure des fichiers JS (frontend)

```
frontend/js/
├── main.js              ← point d'entrée technicien (events DOM, init app)
├── login.js             ← point d'entrée login
├── api/
│   ├── admin_api.js     ← appels backend (création de comptes) + requêtes admin Supabase
│   └── responsable_api.js ← appels backend de la page responsable (techniciens : créer, modifier, mot de passe)
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
│   ├── responsable.js   ← point d'entrée page responsable (session, profil, 4 onglets)
│   ├── responsable_nav.js ← onglets de la barre latérale (feuilles / heures / techs / import)
│   ├── responsable_password.js ← modale « mon mot de passe » du responsable
│   ├── responsable_liste.js ← chargement des feuilles + rendu de la liste (onglet Feuilles)
│   ├── responsable_render.js ← cartes techniciens (liste des feuilles)
│   ├── responsable_feuilles.js ← lignes de feuilles par semaine + badge de validation
│   ├── responsable_evenements.js ← événements de la liste (période, sélection, ouverture)
│   ├── responsable_detail.js ← vue numérique d'une feuille (modale) + validation heures supp
│   ├── responsable_detail_render.js ← HTML de la vue numérique (en-tête, frise, interventions)
│   ├── responsable_validations.js ← cache mémoire des validations de la période
│   ├── responsable_heures.js ← onglet Heures supp (récap déclaré / validé)
│   ├── responsable_heures_render.js ← HTML de l'onglet Heures supp
│   ├── responsable_techs.js ← onglet Techniciens (créer / modifier / mot de passe / supprimer)
│   ├── responsable_techs_ui.js ← modales de l'onglet Techniciens
│   ├── responsable_techs_table.js ← tableau des techniciens
│   ├── db_validations.js ← requêtes Supabase de validations_heures_supp
│   ├── admin_users.js   ← gestion des utilisateurs (admin)
│   ├── admin_users_ui.js ← rendu HTML gestion utilisateurs
│   ├── resume.js        ← module résumé/récap
│   ├── db_clients.js    ← requêtes Supabase du planning clients (tech + responsable)
│   ├── clients_excel.js ← lecture du fichier Excel (SheetJS, 1er onglet, statuts actifs)
│   ├── clients_regles.js ← règles d'import : correspondance secteurs, clients déjà faits (une ligne Excel = un poste, jamais un doublon)
│   ├── clients_import.js ← enchaînement des 3 étapes d'import (page responsable)
│   ├── clients_import_ui.js ← HTML des 3 étapes d'import
│   ├── clients_data.js  ← listing tech : regroupement des postes par client, tri, retard, exclusion des brouillons, cache
│   ├── clients_render.js ← HTML du listing clients (boutons d'appel, badges retard)
│   ├── clients_liste.js ← vue « Mes clients » (chargement, filtres)
│   ├── clients_valider.js ← « Valider ce client » → intervention pré-remplie
│   └── dashboard_clients.js ← carte « Clients à faire » de l'accueil
└── utils/
    └── utils.js         ← fonctions partagées (showToast, setBusy, validerFormulaire…)
```

## Règles de code

- Maximum 150 lignes par fichier JS — si dépassement, créer un nouveau fichier
- Un fichier = une seule responsabilité
- Jamais de style inline ni de script inline dans le HTML
- Séparer : logique métier → `modules/`, appels Supabase → `db.js` ou `db_responsable.js`, appels backend → `api/admin_api.js`
- Les fichiers "barrel" (`fdr.js`, `dashboard.js`, `ui.js`) ne contiennent que des réexports — ne pas y mettre de logique

## Calcul des heures

- Contrat 35h → 7h par jour
- Contrat 39h → 8h les jours normaux, 7h le vendredi

## Pages et optimisation

- `index.html` → optimisé téléphone (techniciens)
- `pages/responsable.html` → optimisé ordinateur, même ossature que la page admin (`admin.css` : barre latérale + onglets). Les styles de frise chronologique sont dans `timeline.css`, partagé avec `index.html`.
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
