-- Pre-flight (READ-ONLY) for @duckarchive/prisma migration
-- 20260901120000_online_copies_source_key. Sizes the duplicate groups the
-- migration collapses and checks the assumptions it makes. Run BEFORE the
-- migration, paste the numbers into README.md ("Measured").
-- Run from this folder: psql … -f 00-preflight.sql
\set ON_ERROR_STOP on
\timing on
SET statement_timeout = '900s';

SELECT count(*) AS total,
       count(*) FILTER (WHERE file_id IS NOT NULL) AS linked_file,
       count(*) FILTER (WHERE inventory_id IS NOT NULL) AS linked_inventory,
       count(*) FILTER (WHERE file_id IS NULL AND inventory_id IS NULL) AS unlinked,
       count(*) FILTER (WHERE parsed = '') AS blank_parsed,
       count(*) FILTER (WHERE parsed = '' AND file_id IS NULL AND inventory_id IS NULL) AS blank_unlinked
FROM online_copies;

-- A. edge duplicates: one (resource_id, url) linked several times to the SAME target
--    (the parsed-drift twins) → the migration keeps the latest-checked row per group
WITH d AS (
  SELECT resource_id, url, file_id, count(*) AS n
  FROM online_copies WHERE file_id IS NOT NULL GROUP BY 1, 2, 3 HAVING count(*) > 1)
SELECT 'A. file edge dup groups' AS what, count(*) AS groups, sum(n) AS rows, sum(n) - count(*) AS to_delete FROM d;

WITH d AS (
  SELECT resource_id, url, inventory_id, count(*) AS n
  FROM online_copies WHERE inventory_id IS NOT NULL GROUP BY 1, 2, 3 HAVING count(*) > 1)
SELECT 'A. inventory edge dup groups' AS what, count(*) AS groups, sum(n) AS rows, sum(n) - count(*) AS to_delete FROM d;

-- per resource, for the README
WITH d AS (
  SELECT resource_id, url, file_id, count(*) AS n
  FROM online_copies WHERE file_id IS NOT NULL GROUP BY 1, 2, 3 HAVING count(*) > 1)
SELECT r.code, r.type, count(*) AS groups, sum(n) - count(*) AS to_delete
FROM d JOIN resources r ON r.id = d.resource_id GROUP BY 1, 2 ORDER BY 3 DESC;

-- B. exact claim duplicates (resource_id, url, parsed) — what the claim unique
--    would reject after the backfill source_key = parsed. multi_parent_groups are
--    kept as demoted second edges (source_key NULL), the rest collapse.
WITH d AS (
  SELECT resource_id, url, parsed, count(*) AS n,
         count(*) FILTER (WHERE file_id IS NULL AND inventory_id IS NULL) AS unlinked,
         count(DISTINCT COALESCE(file_id, inventory_id)) AS parents
  FROM online_copies WHERE parsed <> '' GROUP BY 1, 2, 3 HAVING count(*) > 1)
SELECT 'B. claim dup groups' AS what, count(*) AS groups, sum(n) AS rows, sum(n) - count(*) AS losers,
       count(*) FILTER (WHERE parents > 1) AS multi_parent_groups, sum(unlinked) AS unlinked_rows
FROM d;

-- pending actions that may be thinned by step C
SELECT (SELECT count(*) FROM file_actions WHERE resolved_at IS NULL) AS pending_file,
       (SELECT count(*) FROM inventory_actions WHERE resolved_at IS NULL) AS pending_inventory;

-- names the migration drops/creates — must match
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid IN ('online_copies'::regclass, 'file_actions'::regclass, 'inventory_actions'::regclass)
  AND conname LIKE '%online_cop%'
ORDER BY conname;
SELECT indexname FROM pg_indexes WHERE tablename = 'online_copies' ORDER BY 1;
