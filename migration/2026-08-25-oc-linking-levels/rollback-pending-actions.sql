-- Delete still-PENDING actions created by one level (accepted/resolved ones are kept).
-- Usage: psql … -v who=script:2026-08-25-l1-exact -f rollback-pending-actions.sql
\set ON_ERROR_STOP on

BEGIN;

WITH del AS (
  DELETE FROM file_actions
  WHERE created_by = :'who' AND type = 'connect_to_online_copy' AND resolved_at IS NULL
  RETURNING 1)
SELECT 'pending file actions deleted' AS step, count(*) FROM del;

WITH del AS (
  DELETE FROM inventory_actions
  WHERE created_by = :'who' AND type = 'connect_to_online_copy' AND resolved_at IS NULL
  RETURNING 1)
SELECT 'pending inventory actions deleted' AS step, count(*) FROM del;

COMMIT;
