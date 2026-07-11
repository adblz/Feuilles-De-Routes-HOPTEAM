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
