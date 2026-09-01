-- Undo 02-execute.sql from its own audit backups.
-- Run from this folder, after 02-execute.sql has produced
-- audit/deleted-root-copies.csv and audit/repointed-actions.csv:
--   psql … -f rollback.sql
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE t_restore (
  id uuid, updated_at timestamp, checked_availability_at timestamp,
  resource_id uuid, inventory_id uuid, file_id uuid, url text,
  availability text, parsed text
);
\copy t_restore FROM 'audit/deleted-root-copies.csv' CSV HEADER

INSERT INTO online_copies (id, updated_at, checked_availability_at, resource_id, inventory_id, file_id, url, availability, parsed)
SELECT id, updated_at, checked_availability_at, resource_id, inventory_id, file_id, url, availability::"Availability", parsed
FROM t_restore;
SELECT 'root copies restored' AS step, count(*) FROM t_restore;

CREATE TEMP TABLE t_repointed (tbl text, id uuid, original_online_copy_id uuid);
\copy t_repointed FROM 'audit/repointed-actions.csv' CSV HEADER

WITH upd AS (
  UPDATE file_actions fa SET online_copy_id = r.original_online_copy_id
  FROM t_repointed r WHERE r.tbl = 'file_actions' AND fa.id = r.id
  RETURNING 1)
SELECT 'file actions restored' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE inventory_actions ia SET online_copy_id = r.original_online_copy_id
  FROM t_repointed r WHERE r.tbl = 'inventory_actions' AND ia.id = r.id
  RETURNING 1)
SELECT 'inventory actions restored' AS step, count(*) FROM upd;

COMMIT;
