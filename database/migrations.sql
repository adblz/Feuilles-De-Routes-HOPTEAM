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
