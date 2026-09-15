-- Migrations SQL à exécuter MANUELLEMENT dans Supabase (menu « SQL Editor »).
-- Ce projet ne gère pas les migrations automatiquement : quand le code
-- introduit un nouveau besoin côté base, on note et on exécute le SQL ici.
-- (Copier le bloc concerné, le coller dans Supabase, cliquer « Run ».)

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-10 — Autoriser le type « rappel » (sortie supplémentaire)
--
-- Sans ça, toute feuille contenant une sortie supplémentaire est rejetée à
-- l'enregistrement (erreur Postgres 23514, contrainte interventions_kind_check :
-- « new row violates check constraint »). Le code enregistre la sortie
-- supplémentaire comme une ligne interventions avec kind = 'rappel'.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE interventions DROP CONSTRAINT IF EXISTS interventions_kind_check;
ALTER TABLE interventions ADD CONSTRAINT interventions_kind_check
    CHECK (kind IN ('intervention', 'pause', 'rappel'));

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-11 — Mode astreinte (heures comptées sans retirer le trajet)
--
-- Deux drapeaux : la journée principale (feuilles_de_route.astreinte) qui change
-- le calcul (pas de −1h trajet), et la sortie supplémentaire (interventions.astreinte)
-- qui n'est qu'une étiquette. Sans ces colonnes, l'enregistrement échoue.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE feuilles_de_route ADD COLUMN IF NOT EXISTS astreinte boolean NOT NULL DEFAULT false;
ALTER TABLE interventions     ADD COLUMN IF NOT EXISTS astreinte boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────
-- Note sécurité (RLS) : le Row Level Security est déjà activé et correctement
-- configuré directement dans Supabase (menu Authentication → Policies), pas via
-- ce fichier. Vérifié le 2026-07-11 : chaque technicien n'accède qu'à ses
-- propres feuilles/interventions, les responsables lisent tout, l'admin gère
-- profils et suggestions. Rien à exécuter ici pour le RLS.
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-15 — Cloisonnement par entreprise (le champ profiles.company sert
-- enfin à quelque chose) : un responsable ne doit voir que les feuilles des
-- techniciens de SA PROPRE entreprise, plus pour "tout voir" comme avant.
-- Motif : ouverture de l'appli à un technicien d'une autre entreprise, dont
-- les feuilles ne doivent pas être visibles par les responsables HopTeam.
--
-- Étapes manuelles (interface Supabase, dans l'ordre) :
--   1. SQL Editor → exécuter le bloc "uniformisation" ci-dessous.
--   2. Table Editor → feuilles_de_route → onglet Policies → supprimer
--      l'ancienne règle SELECT "responsable voit tout".
--   3. Idem sur la table interventions.
--   4. SQL Editor → exécuter le bloc "fonction + nouvelles règles" ci-dessous.
-- Ne pas toucher aux règles des techniciens (accès à leurs propres feuilles).
-- ─────────────────────────────────────────────────────────────────────────

-- Uniformisation : tous les comptes existants sans "company" deviennent HopTeam.
update profiles
set company = 'HopTeam'
where company is null or company = '';

-- Fonction utilitaire : l'utilisateur connecté est-il un responsable de la
-- même entreprise que le technicien target_user_id ?
create or replace function public.same_company_as_caller(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from profiles caller
    join profiles target on target.company = caller.company
    where caller.id = auth.uid()
      and caller.role = 'responsable'
      and target.id = target_user_id
  )
$$;

create policy "responsable_lit_meme_entreprise"
on feuilles_de_route
for select
to authenticated
using ( public.same_company_as_caller(feuilles_de_route.user_id) );

create policy "responsable_lit_interventions_meme_entreprise"
on interventions
for select
to authenticated
using (
  exists (
    select 1
    from feuilles_de_route fdr
    where fdr.id = interventions.feuille_id
      and public.same_company_as_caller(fdr.user_id)
  )
);
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-15 (bis) — Responsable "spécial" qui voit toutes les entreprises
--
-- Certains responsables doivent pouvoir suivre les techniciens de plusieurs
-- entreprises (ex : HopTeam ET DAV), alors que le cloisonnement ci-dessus
-- limite normalement chaque responsable à sa propre entreprise. On ajoute
-- un drapeau sur son profil qui débloque l'accès à tout.
--
-- Étapes manuelles (interface Supabase, dans l'ordre) :
--   1. SQL Editor → exécuter tout le bloc ci-dessous (colonne + fonction +
--      nouvelle règle sur profiles).
--   2. Rien à supprimer : la fonction same_company_as_caller est simplement
--      remplacée (create or replace), les règles existantes continuent de
--      fonctionner pour les responsables normaux (drapeau = false par défaut).
-- ─────────────────────────────────────────────────────────────────────────

alter table profiles add column if not exists voit_toutes_entreprises boolean not null default false;

create or replace function public.same_company_as_caller(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from profiles caller
    join profiles target
      on (target.company = caller.company or caller.voit_toutes_entreprises)
    where caller.id = auth.uid()
      and caller.role = 'responsable'
      and target.id = target_user_id
  )
$$;

-- Permet à un responsable de lire les profils des techniciens qu'il a le
-- droit de voir (sa propre entreprise, ou toutes si voit_toutes_entreprises).
-- Nécessaire pour afficher le nom de l'entreprise de chaque technicien dans
-- la page responsable.
create policy "responsable_lit_profils_autorises"
on profiles
for select
to authenticated
using ( public.same_company_as_caller(profiles.id) );
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-21 — Table des entreprises (page admin : bouton "+ Ajouter une
-- entreprise" et champ entreprise devenu libre/optionnel sur les comptes).
--
-- Avant, "HopTeam" et "DAV" étaient juste des valeurs tapées à la main sur
-- profiles.company. Cette table sert à proposer/gérer la liste depuis
-- l'admin. Elle est pré-remplie avec les entreprises déjà utilisées, pour
-- ne rien perdre. Seul un compte admin peut la lire/modifier.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz not null default now()
);

alter table public.entreprises enable row level security;

create policy "admin_gere_entreprises"
on public.entreprises
for all
to authenticated
using ( exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin') )
with check ( exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin') );

insert into public.entreprises (nom)
select distinct company from public.profiles where company is not null and company <> ''
on conflict (nom) do nothing;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-22 — Confort de lecture (debug dans Supabase) : nom du tech et
-- date directement visibles sur chaque ligne "interventions", sans avoir à
-- remonter manuellement via feuille_id.
--
-- Colonnes purement informatives : l'appli ne les lit ni ne les écrit, donc
-- aucun risque de casser le code existant. Un trigger les remplit tout seul
-- à chaque nouvel enregistrement (recopie depuis la feuille liée), et la
-- dernière requête remplit une fois pour toutes les lignes déjà existantes.
--
-- Sans danger, et réversible si besoin (voir note en bas du bloc).
-- ─────────────────────────────────────────────────────────────────────────

alter table interventions add column if not exists tech text;
alter table interventions add column if not exists date date;

create or replace function public.remplir_tech_date_intervention()
returns trigger
language plpgsql
as $$
begin
  select fdr.tech, fdr.date
  into new.tech, new.date
  from feuilles_de_route fdr
  where fdr.id = new.feuille_id;
  return new;
end;
$$;

drop trigger if exists trg_remplir_tech_date_intervention on interventions;
create trigger trg_remplir_tech_date_intervention
before insert on interventions
for each row
execute function public.remplir_tech_date_intervention();

-- Remplit tech/date pour toutes les interventions déjà enregistrées.
update interventions i
set tech = fdr.tech, date = fdr.date
from feuilles_de_route fdr
where fdr.id = i.feuille_id;

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   drop trigger if exists trg_remplir_tech_date_intervention on interventions;
--   drop function if exists public.remplir_tech_date_intervention();
--   alter table interventions drop column if exists tech;
--   alter table interventions drop column if exists date;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-25 — Règles de calcul par entreprise (phase 1 : temps de trajet)
--
-- Jusqu'ici le calcul des heures retirait « en dur » 1h de trajet par jour
-- (30 min matin + 30 min soir), sauf pour DAV. On rend cette valeur réglable
-- par entreprise depuis l'admin (onglet « Entreprises »). Défaut 60 min =
-- comportement historique inchangé ; DAV reste à 0.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.entreprises
  add column if not exists trajet_minutes int not null default 60;

-- DAV ne retire aucun trajet (comportement historique).
update public.entreprises set trajet_minutes = 0 where nom = 'DAV';

-- Lecture des entreprises pour tout utilisateur connecté : nécessaire pour que
-- le calcul lise le trajet sur le téléphone du technicien. L'écriture reste
-- réservée à l'admin (policy « admin_gere_entreprises » déjà en place).
drop policy if exists "lecture_entreprises_connectes" on public.entreprises;
create policy "lecture_entreprises_connectes"
on public.entreprises
for select
to authenticated
using ( true );

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   drop policy if exists "lecture_entreprises_connectes" on public.entreprises;
--   alter table public.entreprises drop column if exists trajet_minutes;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-07-26 — Config complète par entreprise (logo, règles d'heures, PDF)
--
-- On généralise la « phase 1 : temps de trajet » : toute la config qui doit
-- changer d'une entreprise à l'autre vit désormais dans la table entreprises.
-- Objectif : supprimer les pages dupliquées (index-externe / login-externe /
-- manifest-externe pour DAV) et piloter une seule page par les données.
--
-- Tous les défauts reproduisent le comportement historique HopTeam :
--   • seuil_hebdo_minutes = 2100 (35 h)   • palier_25_minutes = 480 (8 h)
--   • nuit_debut = 1260 (21 h)            • nuit_fin = 360 (6 h)
-- Le logo (logo_b64) et les mentions PDF restent vides tant que l'admin ne les
-- renseigne pas ; le code retombe alors sur le logo HopTeam par défaut.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.entreprises
  add column if not exists logo_b64            text,
  add column if not exists seuil_hebdo_minutes int  not null default 2100,
  add column if not exists palier_25_minutes   int  not null default 480,
  add column if not exists nuit_debut          int  not null default 1260,
  add column if not exists nuit_fin            int  not null default 360,
  add column if not exists pdf_mentions        text;

-- Le logo DAV sera chargé via l'onglet « Entreprises » de l'admin (import
-- d'image). En attendant, DAV affiche le logo HopTeam par défaut.

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   alter table public.entreprises
--     drop column if exists logo_b64,
--     drop column if exists seuil_hebdo_minutes,
--     drop column if exists palier_25_minutes,
--     drop column if exists nuit_debut,
--     drop column if exists nuit_fin,
--     drop column if exists pdf_mentions;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-09-14 — Onglet Heures en mois calendaire (par entreprise)
--
-- Le planning des heures supp (table periodes_paie, ex. « juillet » = du 22/06
-- au 19/07) s'appliquait à tout le monde. DAV ne l'utilise pas : ses heures se
-- lisent du 1er au dernier jour du mois. On ajoute un réglage par entreprise,
-- coché depuis l'admin (onglet « Entreprises »). Défaut false = comportement
-- historique (planning) ; DAV passe en mois calendaire.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.entreprises
  add column if not exists mois_calendaire boolean not null default false;

update public.entreprises set mois_calendaire = true where nom = 'DAV';

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   alter table public.entreprises drop column if exists mois_calendaire;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-09-15 — Planning clients (import Excel « sanitation »)
--
-- Le responsable importe chaque semaine, depuis sa page, le fichier Excel du
-- CRM qui liste les points de vente (PDV) à visiter par secteur technicien.
-- Chaque technicien voit ensuite dans l'appli SES clients à faire (nom, ville,
-- téléphone, tirages, date prévue, retard), les « valide » dans sa feuille de
-- route, et à l'enregistrement de la feuille ils sont marqués faits.
--
-- Trois tables :
--   • clients_imports  : journal des imports (« Dernier import : … »)
--   • clients_planning : une ligne = un PDV à visiter, affecté à un technicien
--                        (fait_le null = à faire ; renseigné = fait)
--   • clients_secteurs : correspondance « Secteur technicien » (texte Excel)
--                        → compte technicien, mémorisée par entreprise
-- Deux fonctions appelées par l'appli :
--   • marquer_clients_faits     : le technicien marque SES clients faits
--   • importer_clients_planning : import tout-ou-rien côté responsable
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

-- L'appelant est-il responsable de cette entreprise (ou « voit tout ») ?
create or replace function public.responsable_de_company(target_company text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role = 'responsable'
      and (p.company = target_company or p.voit_toutes_entreprises)
  )
$$;

create or replace function public.est_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create table if not exists public.clients_imports (
  id           uuid primary key default gen_random_uuid(),
  company      text not null,
  importe_par  uuid references auth.users(id) on delete set null,
  importe_le   timestamptz not null default now(),
  fichier      text,
  nb_total     int not null default 0,   -- lignes lues dans l'Excel
  nb_importees int not null default 0,   -- lignes écrites
  nb_ignorees  int not null default 0    -- statuts terminés / clôturés / vides
);

create table if not exists public.clients_planning (
  id             uuid primary key default gen_random_uuid(),
  company        text not null,
  import_id      uuid references public.clients_imports(id) on delete set null,
  user_id        uuid references auth.users(id) on delete set null,   -- technicien
  secteur        text,
  code_pdv       text not null,
  nom_pdv        text,
  adresse        text,
  ville          text,
  code_postal    text,
  telephone      text,
  entrepositaire text,
  statut         text,
  date_prevue    date,
  periodicite    int,
  tirage         int,
  fait_le        date,                                                 -- null = à faire
  feuille_id     uuid references public.feuilles_de_route(id) on delete set null,
  importe_le     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists clients_planning_user_fait_idx on public.clients_planning (user_id, fait_le);
create index if not exists clients_planning_company_idx   on public.clients_planning (company);
create index if not exists clients_planning_code_idx      on public.clients_planning (company, code_pdv);

create table if not exists public.clients_secteurs (
  company    text not null,
  secteur    text not null,
  user_id    uuid references auth.users(id) on delete set null,   -- null = « ignorer »
  updated_at timestamptz not null default now(),
  primary key (company, secteur)
);

alter table public.clients_planning enable row level security;
alter table public.clients_secteurs enable row level security;
alter table public.clients_imports  enable row level security;

-- Technicien : lit uniquement ses lignes. Pas d'écriture directe : il passe
-- par la fonction marquer_clients_faits ci-dessous.
drop policy if exists "tech_lit_ses_clients" on public.clients_planning;
create policy "tech_lit_ses_clients"
on public.clients_planning
for select
to authenticated
using ( user_id = auth.uid() );

-- Responsable : tout sur son entreprise. Admin : tout.
drop policy if exists "responsable_gere_clients_planning" on public.clients_planning;
create policy "responsable_gere_clients_planning"
on public.clients_planning
for all
to authenticated
using      ( public.responsable_de_company(company) or public.est_admin() )
with check ( public.responsable_de_company(company) or public.est_admin() );

drop policy if exists "responsable_gere_clients_secteurs" on public.clients_secteurs;
create policy "responsable_gere_clients_secteurs"
on public.clients_secteurs
for all
to authenticated
using      ( public.responsable_de_company(company) or public.est_admin() )
with check ( public.responsable_de_company(company) or public.est_admin() );

drop policy if exists "responsable_gere_clients_imports" on public.clients_imports;
create policy "responsable_gere_clients_imports"
on public.clients_imports
for all
to authenticated
using      ( public.responsable_de_company(company) or public.est_admin() )
with check ( public.responsable_de_company(company) or public.est_admin() );

-- Technicien : marque des clients comme faits (uniquement les siens, et
-- uniquement ceux encore à faire). Renvoie le nombre de lignes modifiées.
create or replace function public.marquer_clients_faits(p_ids uuid[], p_feuille uuid, p_date date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update clients_planning
     set fait_le = p_date, feuille_id = p_feuille
   where id = any(p_ids)
     and user_id = auth.uid()
     and fait_le is null;
  get diagnostics n = row_count;
  return n;
end
$$;

-- Responsable : import atomique (tout ou rien, dans une seule transaction).
--   1. supprime les lignes « à faire » de l'entreprise (remplacées par le fichier)
--   2. supprime les lignes « faites » que le responsable veut réafficher
--   3. purge les lignes « faites » de plus de 120 jours
--   4. journalise l'import et insère les nouvelles lignes (JSON)
-- Les lignes « faites » récentes sont conservées : c'est la mémoire qui permet
-- de garder masqué un client déjà fait même s'il reste dans le fichier.
create or replace function public.importer_clients_planning(
  p_company          text,
  p_lignes           jsonb,
  p_codes_reafficher text[],
  p_fichier          text,
  p_nb_total         int,
  p_nb_ignorees      int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (public.responsable_de_company(p_company) or public.est_admin()) then
    raise exception 'Accès refusé';
  end if;

  delete from clients_planning
   where company = p_company and fait_le is null;

  delete from clients_planning
   where company = p_company
     and fait_le is not null
     and code_pdv = any(coalesce(p_codes_reafficher, '{}'));

  delete from clients_planning
   where company = p_company
     and fait_le < current_date - 120;

  insert into clients_imports (company, importe_par, fichier, nb_total, nb_importees, nb_ignorees)
  values (p_company, auth.uid(), p_fichier, p_nb_total, jsonb_array_length(p_lignes), p_nb_ignorees)
  returning id into v_id;

  insert into clients_planning
    (company, import_id, user_id, secteur, code_pdv, nom_pdv, adresse, ville,
     code_postal, telephone, entrepositaire, statut, date_prevue, periodicite, tirage)
  select
    p_company, v_id,
    nullif(l->>'user_id', '')::uuid,
    l->>'secteur', l->>'code_pdv', l->>'nom_pdv', l->>'adresse', l->>'ville',
    l->>'code_postal', l->>'telephone', l->>'entrepositaire', l->>'statut',
    nullif(l->>'date_prevue', '')::date,
    nullif(l->>'periodicite', '')::int,
    nullif(l->>'tirage', '')::int
  from jsonb_array_elements(p_lignes) l;

  return v_id;
end
$$;

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   drop function if exists public.importer_clients_planning(text, jsonb, text[], text, int, int);
--   drop function if exists public.marquer_clients_faits(uuid[], uuid, date);
--   drop table if exists public.clients_planning;
--   drop table if exists public.clients_secteurs;
--   drop table if exists public.clients_imports;
--   drop function if exists public.responsable_de_company(text);
--   drop function if exists public.est_admin();
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-09-15 (bis) — Jours de congé (calendrier du dashboard + heures supp)
--
-- Avant, un jour non rempli était toujours traité comme « manquant » (orange),
-- y compris un vrai jour de congé. Or les heures supp se calculent par semaine
-- (au-delà de 35h/39h) : une semaine avec un seul jour rempli semblait donc
-- « en dessous » du seuil au lieu de faire ressortir les heures supp de ce
-- jour-là. On ajoute un simple drapeau « conge » sur feuilles_de_route, posé
-- par le technicien depuis le calendrier (case rouge). Un jour de congé réduit
-- le seuil hebdomadaire exactement comme un jour férié (voir jours_feries.js),
-- au lieu de compter comme un jour manquant.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter la ligne ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.feuilles_de_route add column if not exists conge boolean not null default false;

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   alter table public.feuilles_de_route drop column if exists conge;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-09-15 (ter) — Index de performance (préparation montée en charge)
--
-- feuilles_de_route.user_id et interventions.feuille_id sont des clés
-- étrangères : Postgres ne les indexe jamais automatiquement (contrairement
-- aux clés primaires). Or ce sont les colonnes les plus filtrées du code
-- (historique d'un technicien, vérification de doublon du jour, récupération
-- des lignes d'une feuille). Sans index, chaque recherche relit toute la
-- table. Sans effet sur le fonctionnement de l'appli, juste sur la vitesse ;
-- utile dès maintenant, indispensable une fois à ~100 techniciens.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists feuilles_de_route_user_date_idx
  on public.feuilles_de_route (user_id, date);

create index if not exists interventions_feuille_idx
  on public.interventions (feuille_id);

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   drop index if exists public.feuilles_de_route_user_date_idx;
--   drop index if exists public.interventions_feuille_idx;
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 2026-09-16 — Validation des heures supp par le responsable
--
-- Le responsable peut désormais valider, jour par jour, un nombre d'heures
-- supp pour chaque feuille de route (valeur qui peut différer de ce que le
-- technicien a déclaré). L'onglet « Heures supp » de la page responsable
-- reprend ensuite ces validations pour un récap de fin de mois.
--
-- Pourquoi une table séparée ? Quand un technicien ré-enregistre sa feuille,
-- la ligne feuilles_de_route est supprimée puis recréée (nouvel id). Une
-- validation posée sur la feuille serait donc perdue. On la rattache au couple
-- (technicien, date), qui lui ne change jamais. La page compare ensuite la
-- date de validation à created_at de la feuille pour signaler « modifiée
-- depuis la validation ».
--
-- Sécurité : la fonction same_company_as_caller (plus haut) vérifie déjà que
-- l'appelant est un responsable de la même entreprise que le technicien.
--
-- Étape manuelle (Supabase, SQL Editor) : exécuter tout le bloc ci-dessous.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.validations_heures_supp (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                date not null,
  company             text,
  heures_validees_min integer not null default 0,
  commentaire         text,
  validee_par         uuid,
  validee_le          timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.validations_heures_supp enable row level security;

-- Responsable : lire / créer / modifier / supprimer pour les techniciens de
-- son entreprise (ou de toutes si voit_toutes_entreprises).
create policy "responsable_gere_validations"
on public.validations_heures_supp
for all
to authenticated
using ( public.same_company_as_caller(user_id) )
with check ( public.same_company_as_caller(user_id) );

-- Technicien : lecture seule de ses propres validations.
create policy "technicien_lit_ses_validations"
on public.validations_heures_supp
for select
to authenticated
using ( user_id = auth.uid() );

-- Admin : tout.
create policy "admin_gere_validations"
on public.validations_heures_supp
for all
to authenticated
using ( public.est_admin() )
with check ( public.est_admin() );

-- Pour annuler ce changement plus tard si besoin (à coller dans Supabase) :
--   drop table if exists public.validations_heures_supp;
-- ─────────────────────────────────────────────────────────────────────────
