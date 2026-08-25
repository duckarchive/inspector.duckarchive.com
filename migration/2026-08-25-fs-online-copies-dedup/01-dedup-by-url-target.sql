-- Dedup FamilySearch online copies that share (url, file_id) or
-- (url, inventory_id) — 2,327 exact pairs differing only in `parsed`
-- (scraper re-visits producing slightly different parsed strings).
-- Keeps the latest row per group by updated_at (id DESC as tiebreaker).
-- Action rows referencing a deleted copy are repointed to the survivor
-- first (they'd otherwise cascade-delete — 1 resolved action affected).
\set ON_ERROR_STOP on
\timing on
BEGIN;

CREATE TEMP TABLE ranked AS
SELECT id, url, file_id, inventory_id,
  row_number() OVER (PARTITION BY url, file_id ORDER BY updated_at DESC, id DESC) AS rn
FROM online_copies
WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7' AND file_id IS NOT NULL
  AND (url, file_id) IN (
    SELECT url, file_id FROM online_copies
    WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7' AND file_id IS NOT NULL
    GROUP BY url, file_id HAVING count(*) > 1)
UNION ALL
SELECT id, url, file_id, inventory_id,
  row_number() OVER (PARTITION BY url, inventory_id ORDER BY updated_at DESC, id DESC) AS rn
FROM online_copies
WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7' AND inventory_id IS NOT NULL
  AND (url, inventory_id) IN (
    SELECT url, inventory_id FROM online_copies
    WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7' AND inventory_id IS NOT NULL
    GROUP BY url, inventory_id HAVING count(*) > 1);

CREATE TEMP TABLE pairs AS
SELECT l.id AS loser_id, w.id AS winner_id
FROM ranked l
JOIN ranked w ON w.rn = 1
  AND w.url = l.url
  AND (w.file_id = l.file_id OR w.inventory_id = l.inventory_id)
WHERE l.rn > 1;

SELECT count(*) AS losers, count(DISTINCT winner_id) AS winners FROM pairs;

WITH upd AS (
  UPDATE file_actions fa SET online_copy_id = p.winner_id
  FROM pairs p WHERE fa.online_copy_id = p.loser_id
  RETURNING 1
)
SELECT count(*) AS file_actions_repointed FROM upd;

WITH upd AS (
  UPDATE inventory_actions ia SET online_copy_id = p.winner_id
  FROM pairs p WHERE ia.online_copy_id = p.loser_id
  RETURNING 1
)
SELECT count(*) AS inventory_actions_repointed FROM upd;

WITH del AS (
  DELETE FROM online_copies oc USING pairs p WHERE oc.id = p.loser_id
  RETURNING 1
)
SELECT count(*) AS copies_deleted FROM del;

-- post-check: no (url, target) duplicates left among FS copies
SELECT count(*) AS remaining_dup_groups FROM (
  SELECT 1 FROM online_copies
  WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7' AND file_id IS NOT NULL
  GROUP BY url, file_id HAVING count(*) > 1
  UNION ALL
  SELECT 1 FROM online_copies
  WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7' AND inventory_id IS NOT NULL
  GROUP BY url, inventory_id HAVING count(*) > 1
) r;

COMMIT;
