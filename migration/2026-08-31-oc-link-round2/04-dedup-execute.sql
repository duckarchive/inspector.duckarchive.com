-- Collapse each parsed-drift group to one row: keep the linked survivor, give it
-- the LATEST parsed, repoint history, delete the twins.
-- DESTRUCTIVE — run 03-dedup-preview.sql and review audit/dedup-preview.csv first.
-- Run from this folder:
--   psql … -v who=script:2026-08-31-oc-link-r2 -f 04-dedup-execute.sql
\set ON_ERROR_STOP on
\timing on
BEGIN;
\i 03-dedup-groups.sql

-- 1. this round's pending actions on doomed copies are dropped outright: the
--    survivor already carries the link, so the action would be redundant.
WITH del AS (
  DELETE FROM file_actions fa USING t_losers l
  WHERE fa.online_copy_id = l.loser_id AND fa.created_by = :'who'
    AND fa.type = 'connect_to_online_copy' AND fa.resolved_at IS NULL
  RETURNING 1)
SELECT 'round file actions dropped' AS step, count(*) FROM del;

WITH del AS (
  DELETE FROM inventory_actions ia USING t_losers l
  WHERE ia.online_copy_id = l.loser_id AND ia.created_by = :'who'
    AND ia.type = 'connect_to_online_copy' AND ia.resolved_at IS NULL
  RETURNING 1)
SELECT 'round inventory actions dropped' AS step, count(*) FROM del;

-- 2. any OTHER action (historical/resolved) is repointed so history survives —
--    online_copy_id is ON DELETE CASCADE, it would vanish otherwise.
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

-- 3. delete the twins BEFORE refreshing parsed, so the survivor can take a
--    parsed value a doomed row currently holds without tripping the unique key.
WITH del AS (
  DELETE FROM online_copies oc USING t_losers l WHERE oc.id = l.loser_id
  RETURNING 1)
SELECT 'duplicate copies deleted' AS step, count(*) FROM del;

-- 4. survivor now carries the latest parsed → next sync matches and updates it
--    in place instead of inserting a fresh twin.
WITH upd AS (
  UPDATE online_copies oc SET parsed = r.latest_parsed, updated_at = now()
  FROM t_reparse r WHERE oc.id = r.survivor_id
  RETURNING 1)
SELECT 'survivors reparsed' AS step, count(*) FROM upd;

-- post-check: no (resource, url, target) duplicates left in the touched groups
SELECT 'remaining dup groups in scope' AS what, count(*) FROM (
  SELECT 1 FROM online_copies oc JOIN t_survivor s ON s.resource_id = oc.resource_id AND s.url = oc.url
  WHERE (s.target = 'file' AND oc.file_id = s.target_id)
     OR (s.target = 'inventory' AND oc.inventory_id = s.target_id)
  GROUP BY oc.resource_id, oc.url, oc.file_id, oc.inventory_id HAVING count(*) > 1) x;

SELECT 'pending file actions left' AS what, count(*) FROM file_actions
WHERE created_by = :'who' AND resolved_at IS NULL
UNION ALL SELECT 'pending inventory actions left', count(*) FROM inventory_actions
WHERE created_by = :'who' AND resolved_at IS NULL;

COMMIT;
