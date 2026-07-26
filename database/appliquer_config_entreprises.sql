-- À exécuter dans Supabase (SQL Editor) : tout sélectionner (Ctrl+A), Run.
-- Ajoute les colonnes de config par entreprise. Sans danger, réexécutable.

alter table public.entreprises
  add column if not exists logo_b64            text,
  add column if not exists seuil_hebdo_minutes int  not null default 2100,
  add column if not exists palier_25_minutes   int  not null default 480,
  add column if not exists nuit_debut          int  not null default 1260,
  add column if not exists nuit_fin            int  not null default 360,
  add column if not exists pdf_mentions        text;
