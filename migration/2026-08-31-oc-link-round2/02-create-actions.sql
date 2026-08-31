-- Create PENDING connect_to_online_copy actions for every round-2 link match.
-- Nothing is linked here: each action waits for review in the editor, or for
-- accept-actions.sql. Re-running is safe (ON CONFLICT DO NOTHING + the partial
-- unique indexes on (type, online_copy_id, target)).
-- Run from this folder:
--   psql … -v who=script:2026-08-31-oc-link-r2 -f 02-create-actions.sql
\set ON_ERROR_STOP on

BEGIN;

\i 00-candidates.sql

WITH ins AS (
  INSERT INTO file_actions (created_by, type, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy'::"ActionType", oc_id, target_id
  FROM t_map WHERE target = 'file'
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file actions created' AS step, count(*) FROM ins;

WITH ins AS (
  INSERT INTO inventory_actions (created_by, type, online_copy_id, inventory_id)
  SELECT :'who', 'connect_to_online_copy'::"ActionType", oc_id, target_id
  FROM t_map WHERE target = 'inventory'
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'inventory actions created' AS step, count(*) FROM ins;

\copy (SELECT m.target, m.rule, m.code AS target_full_code, u.parsed, u.res AS resource, m.oc_id, m.target_id, u.url FROM t_map m JOIN t_un u ON u.oc_id = m.oc_id ORDER BY m.target, m.rule, m.code) TO 'audit/created-actions.csv' CSV HEADER

SELECT 'pending now (file)' AS what, count(*) FROM file_actions
WHERE created_by = :'who' AND type = 'connect_to_online_copy' AND resolved_at IS NULL
UNION ALL
SELECT 'pending now (inventory)', count(*) FROM inventory_actions
WHERE created_by = :'who' AND type = 'connect_to_online_copy' AND resolved_at IS NULL;

COMMIT;
