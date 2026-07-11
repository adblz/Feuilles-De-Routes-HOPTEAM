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
-- 2026-07-11 — SÉCURITÉ : Row Level Security (RLS)
--
-- POURQUOI : le frontend interroge Supabase en direct avec la clé publique.
-- Sans RLS, n'importe quel utilisateur connecté peut lire / modifier les
-- feuilles et profils de TOUT LE MONDE. Ces règles limitent l'accès :
--   • technicien  → uniquement ses propres feuilles et son profil
--   • responsable → lecture de toutes les feuilles / profils
--   • admin       → tout (lecture + modification)
-- Le backend (création d'utilisateur) utilise la clé « service_role » qui
-- ignore le RLS : il continuera de fonctionner.
--
-- ⚠️ AVANT D'EXÉCUTER : vérifier dans Supabase (Table Editor → chaque table)
-- si le RLS est déjà activé. Exécuter ce bloc UNE SEULE FOIS dans SQL Editor.
-- APRÈS : se connecter en technicien et vérifier qu'on ne voit que ses
-- données. En cas de blocage, on peut désactiver une table :
--   ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────────────────

-- Fonction utilitaire : rôle de l'utilisateur connecté. « SECURITY DEFINER »
-- lui fait ignorer le RLS pendant la lecture du rôle → évite la récursion
-- infinie (piège classique quand une policy de « profiles » lit « profiles »).
CREATE OR REPLACE FUNCTION public.mon_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── profiles ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.mon_role() IN ('responsable', 'admin'));

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.mon_role() = 'admin');

-- ── feuilles_de_route ────────────────────────────────────────────────────
ALTER TABLE public.feuilles_de_route ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fdr_select ON public.feuilles_de_route;
CREATE POLICY fdr_select ON public.feuilles_de_route FOR SELECT
  USING (auth.uid() = user_id OR public.mon_role() IN ('responsable', 'admin'));

DROP POLICY IF EXISTS fdr_insert ON public.feuilles_de_route;
CREATE POLICY fdr_insert ON public.feuilles_de_route FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fdr_update ON public.feuilles_de_route;
CREATE POLICY fdr_update ON public.feuilles_de_route FOR UPDATE
  USING (auth.uid() = user_id OR public.mon_role() = 'admin');

DROP POLICY IF EXISTS fdr_delete ON public.feuilles_de_route;
CREATE POLICY fdr_delete ON public.feuilles_de_route FOR DELETE
  USING (auth.uid() = user_id OR public.mon_role() = 'admin');

-- ── interventions (rattachées à une feuille via feuille_id) ───────────────
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS int_select ON public.interventions;
CREATE POLICY int_select ON public.interventions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.feuilles_de_route f
    WHERE f.id = interventions.feuille_id
      AND (auth.uid() = f.user_id OR public.mon_role() IN ('responsable', 'admin'))
  ));

DROP POLICY IF EXISTS int_insert ON public.interventions;
CREATE POLICY int_insert ON public.interventions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.feuilles_de_route f
    WHERE f.id = interventions.feuille_id AND auth.uid() = f.user_id
  ));

DROP POLICY IF EXISTS int_delete ON public.interventions;
CREATE POLICY int_delete ON public.interventions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.feuilles_de_route f
    WHERE f.id = interventions.feuille_id
      AND (auth.uid() = f.user_id OR public.mon_role() = 'admin')
  ));

-- ── suggestions (boîte à idées ; user_id = auteur) ────────────────────────
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sugg_insert ON public.suggestions;
CREATE POLICY sugg_insert ON public.suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sugg_select ON public.suggestions;
CREATE POLICY sugg_select ON public.suggestions FOR SELECT
  USING (auth.uid() = user_id OR public.mon_role() = 'admin');

DROP POLICY IF EXISTS sugg_update ON public.suggestions;
CREATE POLICY sugg_update ON public.suggestions FOR UPDATE
  USING (public.mon_role() = 'admin');

DROP POLICY IF EXISTS sugg_delete ON public.suggestions;
CREATE POLICY sugg_delete ON public.suggestions FOR DELETE
  USING (public.mon_role() = 'admin');
