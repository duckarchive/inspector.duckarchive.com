-- Delete redundant root-DGS FamilySearch online_copies.
-- DESTRUCTIVE — run 01-preview.sql and review audit/preview.csv first.
-- Run from this folder:
--   psql … -f 02-execute.sql
\set ON_ERROR_STOP on
\timing on
BEGIN;
\i 00-candidates.sql

-- full-row backup of every doomed copy, for rollback.sql
\copy (SELECT oc.* FROM online_copies oc JOIN t_losers l ON l.loser_id = oc.id) TO 'audit/deleted-root-copies.csv' CSV HEADER

-- snapshot of the actions' original online_copy_id, for rollback.sql
\copy (SELECT 'file_actions' AS tbl, fa.id, fa.online_copy_id AS original_online_copy_id FROM file_actions fa JOIN t_losers l ON l.loser_id = fa.online_copy_id UNION ALL SELECT 'inventory_actions', ia.id, ia.online_copy_id FROM inventory_actions ia JOIN t_losers l ON l.loser_id = ia.online_copy_id) TO 'audit/repointed-actions.csv' CSV HEADER

-- history survives: online_copy_id is ON DELETE CASCADE on both actions
-- tables, and every action here is a resolved connect_to_online_copy record
-- (verified in preview — 0 pending), so it is repointed, never dropped.
WITH upd AS (
  UPDATE file_actions fa SET online_copy_id = l.survivor_id
  FROM t_losers l WHERE fa.online_copy_id = l.loser_id
  RETURNING 1)
SELECT 'file actions repointed' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE inventory_actions ia SET online_copy_id = l.survivor_id
  FROM t_losers l WHERE ia.online_copy_id = l.loser_id
  RETURNING 1)
SELECT 'inventory actions repointed' AS step, count(*) FROM upd;

WITH del AS (
  DELETE FROM online_copies oc USING t_losers l WHERE oc.id = l.loser_id
  RETURNING 1)
SELECT 'root copies deleted' AS step, count(*) FROM del;

-- post-check: no root/specific overlap remains for the SAME dgs on any
-- touched target. NOTE: an earlier version of this check only matched on
-- target_id (not dgs) and produced 310 false positives — targets that
-- legitimately keep an unrelated root copy for a *different* film. Fixed
-- 2026-09-01 to re-join on dgs, matching 00-candidates.sql's own logic.
SELECT 'remaining same-dgs root/specific overlaps (must be 0)' AS what, count(*) FROM (
  SELECT r.id
  FROM online_copies r
  JOIN online_copies s
    ON s.resource_id = r.resource_id
   AND substring(s.url FROM 'imageGroupNumbers=([0-9]+)_') = substring(r.url FROM 'imageGroupNumbers=([0-9]+)$')
   AND ( (s.file_id IS NOT NULL AND s.file_id = r.file_id)
      OR (s.inventory_id IS NOT NULL AND s.inventory_id = r.inventory_id) )
  WHERE r.resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7'
    AND r.url ~ 'imageGroupNumbers=[0-9]+$'
    AND s.url ~ 'imageGroupNumbers=[0-9]+_[0-9]+_'
    AND ( r.file_id IN (SELECT file_id FROM t_losers WHERE file_id IS NOT NULL)
       OR r.inventory_id IN (SELECT inventory_id FROM t_losers WHERE inventory_id IS NOT NULL) )
) x;

COMMIT;
