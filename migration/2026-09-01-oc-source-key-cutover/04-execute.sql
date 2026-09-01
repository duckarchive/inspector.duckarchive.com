-- Adopt each 1:1 pair: the linked legacy row survives and takes the fresh keyed
-- row's claim identity; history follows; the fresh row is deleted.
-- DESTRUCTIVE — run 03-preview.sql and review audit/adopt-pairs.csv first.
-- Run from this folder: psql … -v cutover='2026-09-02 10:00' -f 04-execute.sql
\set ON_ERROR_STOP on
\timing on
BEGIN;

\i 02-cutover-groups.sql

-- 1. a pending connect on the fresh row is redundant: the survivor already holds the link
WITH del AS (
  DELETE FROM file_actions fa USING t_pairs p
  WHERE fa.online_copy_id = p.doomed_id AND fa.type = 'connect_to_online_copy' AND fa.resolved_at IS NULL
  RETURNING 1)
SELECT 'pending file connects dropped' AS step, count(*) FROM del;

WITH del AS (
  DELETE FROM inventory_actions ia USING t_pairs p
  WHERE ia.online_copy_id = p.doomed_id AND ia.type = 'connect_to_online_copy' AND ia.resolved_at IS NULL
  RETURNING 1)
SELECT 'pending inventory connects dropped' AS step, count(*) FROM del;

-- 2. every other action of the fresh row follows the survivor
WITH upd AS (
  UPDATE file_actions fa SET online_copy_id = p.survivor_id
  FROM t_pairs p WHERE fa.online_copy_id = p.doomed_id
  RETURNING 1)
SELECT 'file actions repointed' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE inventory_actions ia SET online_copy_id = p.survivor_id
  FROM t_pairs p WHERE ia.online_copy_id = p.doomed_id
  RETURNING 1)
SELECT 'inventory actions repointed' AS step, count(*) FROM upd;

-- 3. delete the fresh row FIRST — the claim unique (resource_id, url, source_key)
--    must be free before the survivor can hold the key
WITH del AS (
  DELETE FROM online_copies oc USING t_pairs p WHERE oc.id = p.doomed_id
  RETURNING 1)
SELECT 'fresh twins deleted' AS step, count(*) FROM del;

-- 4. the survivor takes over the claim identity → the next sync matches it by key
WITH upd AS (
  UPDATE online_copies oc
  SET source_key = p.source_key,
      parsed = p.fresh_parsed,
      availability = COALESCE(p.availability, oc.availability),
      checked_availability_at = p.checked_availability_at,
      updated_at = now()
  FROM t_pairs p WHERE oc.id = p.survivor_id
  RETURNING 1)
SELECT 'survivors re-keyed' AS step, count(*) FROM upd;

-- post-checks
SELECT 'claim key duplicates' AS what, count(*) FROM (
  SELECT 1 FROM online_copies WHERE source_key IS NOT NULL
  GROUP BY resource_id, url, source_key HAVING count(*) > 1) x;
SELECT 'ambiguous urls left for review' AS what, count(*) FROM t_ambiguous;

COMMIT;
