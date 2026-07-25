-- ═══════════════════════════════════════════════════════════════════════════
-- EXPORT POUR AUDIT — À exécuter dans Supabase (menu « SQL Editor »)
--
-- But : récupérer la STRUCTURE de la base et les RÈGLES DE SÉCURITÉ (RLS)
-- pour les donner à une IA qui fera l'audit.
--
-- IMPORTANT : ces requêtes ne renvoient AUCUNE donnée sensible (pas de nom de
-- client, pas d'heures, pas de compte). Elles ne décrivent que la structure.
--
-- Mode d'emploi :
--   1. Ouvrir Supabase → menu « SQL Editor » (à gauche).
--   2. Copier UNE requête ci-dessous (un bloc entre deux lignes ═══).
--   3. La coller, cliquer « Run ».
--   4. Copier le résultat (ou bouton « Export » / « Download CSV »).
--   5. Recommencer pour chaque requête.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── REQUÊTE 1 : toutes les tables et leurs colonnes ───────────────────────
select
  table_name        as "table",
  column_name       as "colonne",
  data_type         as "type",
  is_nullable       as "peut_etre_vide",
  column_default    as "valeur_par_defaut"
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;


-- ─── REQUÊTE 2 : toutes les règles de sécurité (RLS / policies) ─────────────
select
  tablename    as "table",
  policyname   as "nom_regle",
  cmd          as "action",       -- SELECT / INSERT / UPDATE / DELETE / ALL
  roles        as "roles",
  qual         as "condition_lecture",
  with_check   as "condition_ecriture"
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ─── REQUÊTE 3 (bonus) : contraintes, clés et index ────────────────────────
-- Utile pour que l'IA comprenne les liens entre tables (ex : feuille_id).
select
  tc.table_name       as "table",
  tc.constraint_type  as "type_contrainte",
  tc.constraint_name  as "nom",
  kcu.column_name     as "colonne",
  ccu.table_name      as "table_liee",
  ccu.column_name     as "colonne_liee"
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type;


-- ─── REQUÊTE 4 (bonus) : le RLS est-il bien activé sur chaque table ? ───────
select
  tablename       as "table",
  rowsecurity     as "rls_active"
from pg_tables
where schemaname = 'public'
order by tablename;
