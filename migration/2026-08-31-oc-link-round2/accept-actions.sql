-- Accept all still-pending connect_to_online_copy actions created by one level.
-- Mirrors the editor accept flow: link the copy, mark the action resolved.
-- Copies that got linked some other way in the meantime are SKIPPED (left pending).
-- Usage (from this folder):
--   psql … -v who=script:2026-08-25-l1-exact  -f accept-actions.sql
\set ON_ERROR_STOP on

BEGIN;

-- file-level actions
CREATE TEMP TABLE t_fa AS
SELECT fa.id AS action_id, fa.online_copy_id, fa.file_id
FROM file_actions fa
JOIN online_copies oc ON fa.online_copy_id = oc.id
WHERE fa.created_by = :'who'
  AND fa.type = 'connect_to_online_copy'
  AND fa.resolved_at IS NULL
  AND fa.file_id IS NOT NULL AND fa.online_copy_id IS NOT NULL
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL;

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = p.file_id, updated_at = now()
  FROM t_fa p WHERE oc.id = p.online_copy_id
  RETURNING 1)
SELECT 'copies linked to files' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE file_actions fa
  SET resolved_at = now(), resolved_by = fa.created_by, is_rejected = false
  FROM t_fa p WHERE fa.id = p.action_id
  RETURNING 1)
SELECT 'file actions resolved' AS step, count(*) FROM upd;

-- inventory-level actions
CREATE TEMP TABLE t_ia AS
SELECT ia.id AS action_id, ia.online_copy_id, ia.inventory_id
FROM inventory_actions ia
JOIN online_copies oc ON ia.online_copy_id = oc.id
WHERE ia.created_by = :'who'
  AND ia.type = 'connect_to_online_copy'
  AND ia.resolved_at IS NULL
  AND ia.inventory_id IS NOT NULL AND ia.online_copy_id IS NOT NULL
  AND oc.file_id IS NULL AND oc.inventory_id IS NULL;

WITH upd AS (
  UPDATE online_copies oc
  SET inventory_id = p.inventory_id, updated_at = now()
  FROM t_ia p WHERE oc.id = p.online_copy_id
  RETURNING 1)
SELECT 'copies linked to inventories' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE inventory_actions ia
  SET resolved_at = now(), resolved_by = ia.created_by, is_rejected = false
  FROM t_ia p WHERE ia.id = p.action_id
  RETURNING 1)
SELECT 'inventory actions resolved' AS step, count(*) FROM upd;

-- leftovers (copy already linked elsewhere) stay pending for manual review
SELECT 'still pending (file)' AS what, count(*) FROM file_actions
WHERE created_by = :'who' AND resolved_at IS NULL
UNION ALL
SELECT 'still pending (inventory)', count(*) FROM inventory_actions
WHERE created_by = :'who' AND resolved_at IS NULL;

COMMIT;
