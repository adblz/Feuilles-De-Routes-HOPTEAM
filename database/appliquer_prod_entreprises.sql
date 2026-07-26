-- ============================================================================
-- À exécuter UNE FOIS dans Supabase (base RÉELLE / prod) : SQL Editor.
-- Tout sélectionner (Ctrl+A), puis Run.
--
-- Ce script met en place TOUTE la gestion multi-entreprises (table + règles de
-- config par entreprise). Il est SANS DANGER même si une partie existe déjà :
-- chaque étape est en « créer/ajouter seulement si ça n'existe pas ».
-- Réexécutable sans risque.
-- ============================================================================

-- 1) Table des entreprises -----------------------------------------------------
create table if not exists public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz not null default now()
);

alter table public.entreprises enable row level security;

-- Seul un admin peut créer/modifier/supprimer une entreprise.
drop policy if exists "admin_gere_entreprises" on public.entreprises;
create policy "admin_gere_entreprises"
on public.entreprises
for all
to authenticated
using ( exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin') )
with check ( exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin') );

-- Tout utilisateur connecté peut LIRE les entreprises (le téléphone du
-- technicien a besoin de lire les règles de son entreprise).
drop policy if exists "lecture_entreprises_connectes" on public.entreprises;
create policy "lecture_entreprises_connectes"
on public.entreprises
for select
to authenticated
using ( true );

-- 2) Pré-remplissage depuis les entreprises déjà présentes sur les comptes -----
insert into public.entreprises (nom)
select distinct company from public.profiles where company is not null and company <> ''
on conflict (nom) do nothing;

-- 3) Colonnes de règles par entreprise ----------------------------------------
alter table public.entreprises
  add column if not exists trajet_minutes      int  not null default 60,
  add column if not exists logo_b64            text,
  add column if not exists seuil_hebdo_minutes int  not null default 2100,
  add column if not exists palier_25_minutes   int  not null default 480,
  add column if not exists nuit_debut          int  not null default 1260,
  add column if not exists nuit_fin            int  not null default 360,
  add column if not exists pdf_mentions        text;

-- 4) DAV ne retire aucun temps de trajet (comportement historique) ------------
update public.entreprises set trajet_minutes = 0 where nom = 'DAV';
