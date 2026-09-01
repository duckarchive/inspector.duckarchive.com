-- Undo 02-execute.sql: restore file_id/inventory_id from audit/before.csv.
-- Run from this folder:
--   psql … -f rollback.sql
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE t_before (
  id uuid, updated_at timestamp, checked_availability_at timestamp,
  resource_id uuid, inventory_id uuid, file_id uuid, url text,
  availability text, parsed text
);
\copy t_before FROM 'audit/before.csv' CSV HEADER

WITH upd AS (
  UPDATE online_copies oc SET file_id = b.file_id, inventory_id = b.inventory_id, updated_at = now()
  FROM t_before b WHERE oc.id = b.id
  RETURNING 1)
SELECT 'copies restored' AS step, count(*) FROM upd;

COMMIT;
