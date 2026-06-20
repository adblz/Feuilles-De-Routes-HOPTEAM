# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🚨 RÈGLES STRICTES DE DÉVELOPPEMENT (À RESPECTER IMPÉRATIVEMENT)

## Architecture générale

- Toujours organiser le code proprement en séparant frontend et backend
- Créer de nouveaux fichiers si nécessaire pour éviter les fichiers trop longs ou surchargés
- Refactoriser automatiquement tout code existant qui ne respecte pas ces नियम

## Frontend (OBLIGATOIRE)

- Interdiction totale de JavaScript inline dans le HTML (pas de onclick, oninput, etc.)
- Tout le JavaScript doit être dans des fichiers séparés (/js/)
- Utiliser uniquement addEventListener pour gérer les événements
- Le HTML doit contenir uniquement la structure (aucune logique)
- Le CSS doit être séparé dans des fichiers dédiés

## Organisation du code

- Ne jamais dépasser ~300-400 lignes par fichier JS sans proposer une séparation en modules
- Créer des sous-modules dans `/js/modules/` si une fonctionnalité devient complexe
- Séparer clairement :
  - logique métier
  - manipulation DOM
  - appels API
  - génération PDF

## Refactoring automatique

- Si du code est mal structuré :
  → le corriger automatiquement
  → déplacer le code dans les bons fichiers
  → créer les fichiers manquants si nécessaire

## Cohérence du projet

- Toujours respecter la structure existante du projet
- Ne pas recréer une nouvelle architecture sans raison
- S'intégrer proprement dans les fichiers existants

## Interdictions

- Pas de mélange HTML / JS / CSS
- Pas de duplication de code
- Pas de fonctions inutilisées
- Pas de logique complexe dans index.html


## Project overview

**Feuille de Route** is a web app for French field technicians to fill out and submit daily intervention reports. The frontend is a static PWA; the backend is a small Express server that handles email sending via SendGrid.

## Structure

```
feuille-de-route/
├── frontend/                    ← deployed on Netlify
│   ├── index.html               ← app shell (authenticated users)
│   ├── login.html               ← login page (Supabase Auth)
│   ├── styles.css               ← all CSS, including .pdf-* print classes
│   ├── manifest.json            ← PWA manifest
│   ├── sw.js                    ← service worker (cache versioned by Netlify build)
│   ├── logo.png / logo-512.png
│   └── js/
│       ├── main.js              ← entry point: auth guard, event wiring, initApp()
│       ├── login.js             ← login page logic (connexion, redirect)
│       ├── api/
│       │   └── api.js           ← email sending via backend (Render.com)
│       ├── modules/
│       │   ├── fdr.js           ← core logic: cfg, state, interventions, calcHeures, brouillon
│       │   ├── ui.js            ← DOM/modals: settings, historique panel, heures-supp recap
│       │   ├── db.js            ← Supabase REST API: historique & interventions persistence
│       │   ├── auth.js          ← Supabase Auth: connexion, session, refresh, deconnexion
│       │   ├── pdf.js           ← PDF generation with html2pdf.js
│       │   └── autocomplete.js  ← city/client suggestions stored in localStorage
│       └── utils/
│           └── utils.js         ← shared helpers: showToast, validerFormulaire, parseDuree
└── backend/                     ← deployed on Render.com (free tier, cold starts)
    ├── index.js                 ← Express server: /ping + /send-email (SendGrid)
    └── package.json             ← express, cors, multer, express-rate-limit
```

All JS files use ES modules (`import`/`export`). External dependency: `html2pdf.js` from cdnjs CDN.

## Authentication (auth.js + login.js)

- Users must log in via `login.html` before accessing `index.html`.
- Auth is handled via Supabase Auth REST API (no SDK) — credentials are `email/password`.
- Session is persisted in `localStorage` under `fdr_session` (JWT access token + expiry).
- `isSessionValid()` checks token expiry with a 60s safety margin.
- `refreshSession()` refreshes a stale token via Supabase `/auth/v1/token?grant_type=refresh_token`.
- `main.js` guards the app: if no valid session → redirects to `login.html`.
- The technician name field is locked to `user.user_metadata.nom` after login.

## Frontend — fdr.js key globals

- `cfg` — runtime settings persisted in `localStorage` (`cfg_company`, `cfg_email`, `cfg_tech_email`, `cfg_contrat`). `saveCfg()` updates both the object and localStorage.
- `intCount` / `pauseCount` — monotonically incrementing counters used as IDs for intervention and pause cards. IDs are never reassigned after deletion; `rawId` (stripped from the element's `id` attribute) is the stable per-element key.
- `lireTousLesElements()` — walks `#interventions-list > div` in DOM order and returns an array of intervention/pause objects. DOM order is the source of truth for the PDF.
- `sauvegarderBrouillon()` / `restaurerBrouillon()` — auto-save/restore current form state to `localStorage` (`fdr_brouillon`).

## Hour calculation logic (fdr.js)

`seuilJour()` returns the daily threshold in minutes based on `cfg.contrat`:
- Contrat 35h → 7h always.
- Contrat 39h → 7h on Fridays, 8h other days.

`calcHeures()` deducts a fixed 1-hour travel allowance plus the lunch break from total worked time. Overtime (`heures-supp`) is auto-computed unless the user has manually overridden it (`suppManuel = true`). `resetSuppAuto()` reverts to automatic calculation.

## Database (db.js — Supabase)

History is stored in Supabase (not localStorage). Two tables:
- `feuilles_de_route` — one row per daily report (`user_id`, `date`, `tech`, `company`, `contrat`, `heure_debut`, `heure_fin`, `repas_min`, `heures_travail`, `heures_supp`, `mode`).
- `interventions` — child rows per feuille (`feuille_id`, `order_index`, `kind`, plus intervention or pause fields). ON DELETE CASCADE keeps them in sync.

Key exports: `chargerHistorique()`, `chargerDetailFeuille(id)`, `supprimerFeuille(id)`, `chargerHeuresSupp(debut, fin)`, `sauvegarderEnBase({...})`.

`sauvegarderEnBase()` deletes any existing entry for the same `date/user_id` before reinserting (anti-duplicate strategy).

## Email flow (api/api.js)

1. Pings `/ping` on the Render backend to wake it from cold start (free tier sleeps after inactivity).
2. Generates a PDF blob via `html2pdf.js` from an offscreen DOM element built by `pdf.js`.
3. Posts the blob as `multipart/form-data` to `/send-email` on the backend.
4. The backend sends the PDF as an attachment via the SendGrid API using `SENDGRID_API_KEY` and `SENDGRID_SENDER_EMAIL` env vars.

There is no `mailto:` fallback — email is fully server-side.

## Backend (backend/index.js)

- Rate-limited to 10 requests per 15 minutes per IP (`express-rate-limit`).
- CORS restricted to Netlify origin and localhost (see `allowedOrigins`).
- Serves the `frontend/` folder as static files (useful for local dev).
- `POST /send-email` expects `multipart/form-data` with fields: `file` (PDF blob), `to`, `techName`, `techEmail` (optional).

## Deployment

- **Frontend** → Netlify. Build command: `sed -i "s/fdr-v[0-9a-z]*/fdr-$DEPLOY_ID/g" frontend/sw.js` — stamps the service worker cache version with the Netlify deploy ID to bust the cache on each deploy.
- **Backend** → Render.com (`https://feuilles-de-routes-hopteam.onrender.com`). Free tier, hence the `/ping` wake-up call before sending.

## Local development

Run `node backend/index.js` — it serves the frontend at `http://localhost:3000` and exposes the API endpoints. Or open `frontend/index.html` directly in a browser (email sending will fail without the backend running).
