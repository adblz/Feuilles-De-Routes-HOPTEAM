# Audit capacité — 100 techniciens, plusieurs entreprises

Document de suivi. Résume l'audit fait pour savoir si l'appli tient à ~80-100
techniciens sur plusieurs entreprises, avec les plans gratuits (Supabase,
Vercel/Cloudflare, Render), les décisions prises, et l'avancement des travaux.

**Dernière mise à jour : 21 septembre 2026.**

---

## 1. Contexte et question de départ

Combien l'appli peut-elle tenir, en restant sur les plans gratuits, avec
~80 à 100 techniciens répartis sur plusieurs entreprises ?

## 2. Résultat de l'audit initial

### Ce qui tenait déjà très largement
- **Supabase (base de données, authentification)** : taille de base, nombre
  d'utilisateurs actifs, limites de connexion — tout est très loin des
  plafonds gratuits, même à 100 techniciens.
- **Render (backend)** : ne sert qu'à la création de comptes (admin) et aux
  notifications Telegram. Quasiment pas sollicité par les techniciens.
  Aucun souci de capacité.

### Ce qui ne tenait PAS
1. **Stockage des PDF (Supabase Storage, quota gratuit 1 Go).**
   Cause : chaque PDF est une "photo" haute résolution de la page
   (html2pdf.js / html2canvas), donc lourd. Mesure réelle communiquée par
   l'utilisateur : **630 à 840 Ko** pour une feuille de 2-3 pages.
   À 100 techniciens × ~25 feuilles/mois, le quota de 1 Go aurait été plein
   en quelques semaines.
2. **Vercel Hobby (hébergement du site) : usage commercial interdit.**
   Une appli utilisée par les salariés de plusieurs entreprises est un usage
   commercial — pas autorisé sur le plan gratuit Vercel.
3. **Confidentialité entre entreprises.** Le dossier de stockage des PDF est
   **public**, et le nom des fichiers est devinable
   (`feuille-route_prenom-nom_date.pdf`). N'importe qui connaissant le nom
   d'un technicien et une date pouvait télécharger sa feuille (clients,
   horaires...), même d'une entreprise à l'autre. Problème de sécurité, pas
   seulement de capacité.
4. Deux fuites de bande passante qui grossissent avec le temps :
   - le logo d'entreprise est retéléchargé à chaque ouverture de l'appli
     par chaque technicien (stocké en base64 en base, pas mis en cache) ;
   - la page responsable charge **tout l'historique** des feuilles à chaque
     ouverture, sans filtrer par période côté serveur.

## 3. Décisions prises

| Sujet | Décision |
|---|---|
| Hébergement du site | Migrer de Vercel vers **Cloudflare Pages** (gratuit, bande passante et requêtes illimitées pour un site statique, usage commercial autorisé). |
| Stockage des PDF | **Réécrire le générateur de PDF en "PDF texte"** (dessin direct via une bibliothèque type jsPDF) au lieu de "photographier" la page. Diminue le poids d'un facteur ~30-50. |
| Conservation des PDF | Ne garder que les **30 derniers jours** dans Supabase Storage ; au-delà, le PDF est **reconstruit à la demande** depuis les données déjà en base (feuille + interventions). Nécessite que le générateur PDF parte des données, pas du formulaire affiché à l'écran. |
| Confidentialité | Dossier de stockage PDF rendu **privé** + adresses de fichiers temporaires (quelques minutes) générées à la demande, réutilisant les règles de sécurité existantes (un technicien voit les siennes, un responsable celles de son entreprise). |
| Fichiers Excel (nouvelle fonctionnalité envisagée) | Règle validée : **ne jamais stocker le fichier lui-même**, importer/exporter uniquement les données qu'il contient. Le besoin précis (import planning ? export paie ?) reste à préciser avec l'utilisateur avant de coder quoi que ce soit sur ce point — pas commencé. |

### Vérifications faites (recherches + calculs)
- Limites Supabase gratuit (500 Mo base, 1 Go stockage, 5 Go transfert/mois,
  50 000 utilisateurs actifs, limite d'authentification 30 tentatives/5 min
  par IP) — confirmées via la doc officielle.
- Limites Cloudflare Pages gratuit (bande passante et requêtes illimitées
  pour du contenu statique, usage commercial autorisé, 500 builds/mois) —
  confirmées.
- Limites Vercel Hobby et Render gratuit — confirmées.
- Recalcul complet poste par poste avec le poids réel mesuré par
  l'utilisateur (630-840 Ko/feuille) : confirme que le PDF texte est
  nécessaire (pas juste un allègement de réglages, insuffisant).

## 4. Prototype PDF texte — validé par l'utilisateur

Un prototype (jsPDF, données fictives, dossier temporaire, **rien touché
dans le projet**) a été fabriqué et envoyé à l'utilisateur pour comparaison
visuelle avec le PDF actuel.

- Reproduit fidèlement la mise en page actuelle : titre + barre bleue, logo
  entreprise, ligne technicien grisée, les 4 cases colorées (bleu/orange/
  vert), bandeau vert heures supp, blocs intervention (en-tête bleu marine
  + badge type + grille Arrivée/Départ/Type/Main d'œuvre/Nb. becs + pavé
  détails), blocs pause orange, mentions bas de page, rappel date/technicien
  en haut des pages suivantes.
- **Poids obtenu : 16,8 Ko** pour une feuille de 2 pages avec 6
  interventions, 2 pauses, une sortie supplémentaire, logo et mentions —
  contre 630-840 Ko avec la méthode actuelle (**~40-50 fois plus léger**).
- Différences mineures assumées : flèche "→" remplacée par un tiret "–"
  dans l'affichage des pauses (police standard des PDF ne contient pas ce
  caractère ; faisable avec une police embarquée si besoin, ~15 Ko de plus).
- **Bug trouvé et corrigé pendant le prototypage** : le fichier
  `frontend/assets/images/logo.png` n'est pas vraiment un PNG, c'est une
  image **WebP** avec l'extension `.png` (le navigateur s'en accommode,
  mais un générateur PDF qui lit le vrai format échoue). Le logo affichait
  mal dans le prototype avant qu'on comprenne pourquoi. Correction retenue
  pour l'implémentation finale : faire passer le logo par un `<canvas>` du
  navigateur (qui gère n'importe quel format d'image) avant de l'insérer
  dans le PDF, plutôt que de faire confiance à l'extension du fichier.
- **Verdict utilisateur : validé.** "ok je trouve ça bien !"

Le prototype a été envoyé à l'utilisateur via fichier (pas conservé dans le
projet — c'était un fichier temporaire de démonstration).

## 5. Plan de travail (5 étapes, dans l'ordre convenu)

1. **PDF privés** ← *en cours, voir section 6*
2. **Réécrire le générateur de PDF en PDF texte**, à partir des données en
   base (pas du formulaire à l'écran), pour permettre la reconstruction des
   anciennes feuilles
3. **Nettoyage automatique à 30 jours** des PDF dans Supabase Storage +
   reconstruction à la demande pour les feuilles plus anciennes
4. **Logo non rechargé à chaque ouverture** + **page responsable filtrée par
   période côté serveur** (au lieu de charger tout l'historique)
5. **Migration du site vers Cloudflare Pages**

## 6. Où on s'est arrêté — Étape 1 : PDF privés

### Principe retenu
- Le dossier de stockage Supabase (`pdfs`) passe de public à **privé**.
- Pour afficher un PDF, l'appli demande une **adresse temporaire** (valable
  quelques minutes), accordée par Supabase seulement si la personne
  connectée a le droit de voir la feuille correspondante (réutilise les
  règles de sécurité déjà en place — pas de nouvelle logique de droits).
- **Bonus corrigé au passage** : les fichiers seront rangés par dossier
  technicien (`identifiant-du-compte/date.pdf`) au lieu du nom actuel
  `feuille-route_prenom-nom_date.pdf`, qui pouvait entrer en collision entre
  deux techniciens homonymes de deux entreprises différentes. Les fichiers
  déjà existants ne sont **pas** déplacés/migrés, ils restent lisibles tels
  quels via une nouvelle colonne `pdf_path`.

### Fichiers identifiés comme à toucher (pas encore codés)
| Fichier | Rôle |
|---|---|
| `database/migrations.sql` | Nouveau bloc SQL à exécuter manuellement dans Supabase : dossier `pdfs` en privé, nouvelle colonne `pdf_path`, règles de sécurité sur les fichiers |
| `frontend/js/modules/db_storage.js` **(nouveau fichier)** | Tout ce qui parle au stockage : envoi, adresse temporaire, suppression. Séparé de `db.js` qui est déjà proche de la limite de 150 lignes/fichier |
| `frontend/js/modules/db.js` | Utilise `db_storage.js` ; enregistre `pdf_path` ; `chargerPdfFeuille` renvoie une adresse temporaire ; supprime l'ancien PDF si une feuille est ré-enregistrée |
| `frontend/js/modules/db_responsable.js` | `chargerPdfResponsable` renvoie une adresse temporaire |

Fichiers qui ne bougent PAS (ils reçoivent juste une adresse et
l'utilisent, peu importe si elle est publique ou temporaire) :
`pdfviewer.js`, `pdf_partage.js`, `responsable_export.js`.

Backend Render : rien à changer.

### Ce qu'il restera à faire manuellement (utilisateur)
Copier le bloc SQL dans Supabase → SQL Editor → Run, comme pour les
migrations précédentes du fichier `database/migrations.sql`.

### ⚠️ Point bloquant — question posée, réponse pas encore reçue
Avant de coder, il fallait confirmer :

> Dans Supabase → Storage, y a-t-il **d'autres dossiers ("buckets") que
> `pdfs`** ? Le bloc SQL prévu remplace les règles de sécurité des
> fichiers ; s'il n'y a que `pdfs`, c'est sans risque. S'il y en a
> d'autres, il faut les traiter à part pour ne pas casser leurs règles.

**→ Prochaine étape dès la reprise : obtenir la réponse à cette question,
puis coder l'étape 1 (PDF privés).**

## 7. Points de vigilance à garder en tête pour la suite

- **Sauvegarde de la base** : pas de sauvegarde automatique sur le plan
  gratuit Supabase. Repose entièrement sur le script local
  `sauvegarder-base.bat` — à vérifier qu'il tourne réellement de façon
  régulière. Risque résiduel le plus sérieux du montage gratuit (sécurité
  des données, pas capacité).
- **Suivi mensuel recommandé** : un coup d'œil à la page "Usage" de
  Supabase une fois par mois. Si un quota dépasse 70 %, agir avant d'être
  bloqué (Supabase prévient par email, pas de coupure surprise).
- **Jour du déploiement à 100 techniciens** : éviter de faire connecter 40+
  personnes en 5 minutes depuis le même Wi-Fi (limite Supabase de 30
  tentatives de connexion / 5 min / adresse IP). Étaler les connexions ou
  utiliser des réseaux différents.
- **Fonctionnalité Excel** : besoin précis pas encore défini avec
  l'utilisateur. Règle déjà actée : ne jamais stocker le fichier lui-même,
  seulement les données qu'il contient.
- **Budget de repli** si jamais le gratuit devient trop juste : Supabase
  Pro (~25 $/mois, 100 Go stockage, sauvegardes 7 jours) et/ou Vercel Pro
  (~20 $/mois) — mais avec le plan ci-dessus (Cloudflare + PDF texte + 30
  jours), le gratuit devrait tenir confortablement à 100 techniciens.
- Dans 4-5 ans, la base de données Supabase (500 Mo gratuits) sera pleine
  au rythme actuel — pas une urgence, mais à surveiller sur le long terme.

## 8. Pour reprendre dans une nouvelle session

Donner ce fichier à lire, puis :
1. Répondre à la question de la section 6 (buckets Storage autres que
   `pdfs` ?).
2. Continuer l'étape 1 (PDF privés) : bloc SQL + les 4 fichiers listés.
3. Enchaîner sur les étapes 2 à 5 dans l'ordre de la section 5.

Ne pas modifier `sw.js` ni `vercel.json` sans relire les règles du
`CLAUDE.md` du projet (réorganisation de fichiers, déploiement Vercel).
