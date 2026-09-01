-- Relink the 66 high-confidence ЦДІАЛ-201-4А online_copies from the
-- inventory to their specific file. No deletes here (unlike the root-DGS
-- cleanup) — file_actions/inventory_actions keep pointing at the same
-- online_copy row, they're untouched.
-- DESTRUCTIVE — run 01-preview.sql and review audit/preview.csv first.
-- Run from this folder:
--   psql … -f 02-execute.sql
\set ON_ERROR_STOP on
\timing on
BEGIN;
\i 00-mapping.sql

-- full-row backup, for rollback.sql
\copy (SELECT oc.* FROM online_copies oc JOIN t_targets t ON t.copy_id = oc.id) TO 'audit/before.csv' CSV HEADER

WITH upd AS (
  UPDATE online_copies oc SET file_id = t.file_id, inventory_id = NULL, updated_at = now()
  FROM t_targets t WHERE oc.id = t.copy_id
  RETURNING 1)
SELECT 'copies relinked' AS step, count(*) FROM upd;

-- post-check: every mapped copy now sits on its target file, none left on the inventory
SELECT 'still on inventory (must be 0)' AS what, count(*) FROM online_copies oc
JOIN t_targets t ON t.copy_id = oc.id WHERE oc.inventory_id IS NOT NULL;

SELECT 'not on expected file (must be 0)' AS what, count(*) FROM online_copies oc
JOIN t_targets t ON t.copy_id = oc.id WHERE oc.file_id IS DISTINCT FROM t.file_id;

COMMIT;
