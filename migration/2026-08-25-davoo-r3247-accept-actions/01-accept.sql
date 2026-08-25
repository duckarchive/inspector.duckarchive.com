-- Accept all pending connect_to_online_copy file_actions for fond ДАВоО-Р3247.
-- Mirrors the editor accept flow: link copy to file, mark action resolved (not rejected).
-- Run from this folder: psql … -v ON_ERROR_STOP=1 -f 01-accept.sql
\set ON_ERROR_STOP on

BEGIN;

DROP TABLE IF EXISTS t_pend;
CREATE TEMP TABLE t_pend AS
SELECT fa.id AS action_id, fa.online_copy_id, fa.file_id, fa.created_by
FROM file_actions fa
JOIN files fi ON fa.file_id = fi.id
JOIN inventories i ON fi.inventory_id = i.id
JOIN fonds f ON i.fond_id = f.id
JOIN archives a ON f.archive_id = a.id
WHERE a.code = 'ДАВоО' AND f.code = 'Р3247'
  AND fa.resolved_at IS NULL
  AND fa.type = 'connect_to_online_copy'
  AND fa.online_copy_id IS NOT NULL;

DO $$ BEGIN
  IF (SELECT count(*) FROM t_pend) <> 91 THEN
    RAISE EXCEPTION 'expected 91 pending actions, got %', (SELECT count(*) FROM t_pend);
  END IF;
  IF EXISTS (SELECT 1 FROM t_pend p JOIN online_copies oc ON p.online_copy_id = oc.id
             WHERE oc.file_id IS NOT NULL OR oc.inventory_id IS NOT NULL) THEN
    RAISE EXCEPTION 'some copies are already linked';
  END IF;
END $$;

\copy (SELECT p.action_id, p.online_copy_id, p.file_id, fi.full_code, oc.parsed, oc.url FROM t_pend p JOIN online_copies oc ON p.online_copy_id = oc.id JOIN files fi ON p.file_id = fi.id ORDER BY fi.full_code) TO 'audit/accepted.csv' CSV HEADER

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = p.file_id, updated_at = now()
  FROM t_pend p WHERE oc.id = p.online_copy_id
  RETURNING 1)
SELECT 'copies linked' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE file_actions fa
  SET resolved_at = now(), resolved_by = fa.created_by, is_rejected = false
  FROM t_pend p WHERE fa.id = p.action_id
  RETURNING 1)
SELECT 'actions resolved' AS step, count(*) FROM upd;

COMMIT;
