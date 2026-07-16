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
