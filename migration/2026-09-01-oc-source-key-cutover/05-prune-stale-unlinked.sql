-- Prune unlinked legacy rows the source no longer claims. A row keyed by its
-- own text (pre-cutover), unlinked, untouched since the cutover, on a url the
-- scrapper HAS re-observed since (some other row there is fresh) is a claim the
-- source stopped making: its text drifted (the keyed row next to it carries the
-- current text) or the item moved. Nothing human-made depends on it — rows with
-- ANY action history are kept, and urls not re-observed at all are left alone
-- (their task may simply not have run yet).
-- DESTRUCTIVE — writes audit/pruned.csv first.
-- Run from this folder: psql … -v cutover='2026-09-02 10:00' -f 05-prune-stale-unlinked.sql
\set ON_ERROR_STOP on
\timing on
BEGIN;

CREATE TEMP TABLE t_prune AS
SELECT o.id, o.resource_id, o.url, o.parsed, o.checked_availability_at
FROM online_copies o
WHERE o.source_key IS NOT NULL AND o.source_key = o.parsed
  AND o.file_id IS NULL AND o.inventory_id IS NULL
  AND COALESCE(o.checked_availability_at, '-infinity') < :'cutover'::timestamp
  AND EXISTS (
    SELECT 1 FROM online_copies f
    WHERE f.resource_id = o.resource_id AND f.url = o.url
      AND f.checked_availability_at >= :'cutover'::timestamp)
  AND NOT EXISTS (SELECT 1 FROM file_actions fa WHERE fa.online_copy_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia WHERE ia.online_copy_id = o.id);

SELECT 'stale unlinked legacy rows to prune' AS what, count(*) FROM t_prune;
SELECT r.code, count(*) FROM t_prune p JOIN resources r ON r.id = p.resource_id GROUP BY 1 ORDER BY 2 DESC;

\copy (SELECT p.id, p.resource_id, p.url, p.parsed, p.checked_availability_at FROM t_prune p ORDER BY p.resource_id, p.url) TO 'audit/pruned.csv' CSV HEADER

WITH del AS (
  DELETE FROM online_copies oc USING t_prune p WHERE oc.id = p.id
  RETURNING 1)
SELECT 'pruned' AS step, count(*) FROM del;

COMMIT;
