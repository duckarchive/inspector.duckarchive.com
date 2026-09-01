-- Shared builder for the source-key cutover sweep. \i-included by 03-preview.sql
-- and 04-execute.sql; builds temp tables only. Preview and execute can't drift.
--
-- Requires -v cutover='<timestamp>': when the keyed scrapper went live. Rows the
-- scrapper has not touched since then are stale.
--
-- What it finds. Before source keys, a FamilySearch rewording created an
-- unlinked twin next to the human-linked row. The migration removed the
-- already-linked twins; what it could NOT resolve is a linked row whose text
-- had already drifted at cutover: the first keyed sync finds no row with that
-- text, inserts a fresh keyed (unlinked) row, and the linked legacy row is never
-- touched again. On a url with exactly ONE such stale linked row and exactly ONE
-- fresh keyed unlinked row, they are the same copy: the linked row survives and
-- takes over the fresh row's claim identity (source_key + parsed), history is
-- repointed, the fresh row is deleted — the next sync then matches the linked
-- row by key. Anything else (n:m urls, a pending action pointing the fresh row
-- at a different target) is reported to audit/ambiguous.csv for a human.
\set ON_ERROR_STOP on

-- linked rows still keyed by their own code text (legacy) that no sync touched since the cutover
CREATE TEMP TABLE t_stale_linked AS
SELECT id, resource_id, url, file_id, inventory_id, parsed, checked_availability_at
FROM online_copies
WHERE source_key IS NOT NULL AND source_key = parsed
  AND (file_id IS NOT NULL OR inventory_id IS NOT NULL)
  AND COALESCE(checked_availability_at, '-infinity') < :'cutover'::timestamp;

-- unlinked rows with a real (native) key, observed since the cutover
CREATE TEMP TABLE t_fresh_unlinked AS
SELECT id, resource_id, url, source_key, parsed, availability, checked_availability_at
FROM online_copies
WHERE source_key IS NOT NULL AND source_key <> parsed
  AND file_id IS NULL AND inventory_id IS NULL
  AND checked_availability_at >= :'cutover'::timestamp;

CREATE TEMP TABLE t_url_counts AS
SELECT u.resource_id, u.url,
       (SELECT count(*) FROM t_stale_linked s WHERE s.resource_id = u.resource_id AND s.url = u.url) AS stale_linked,
       (SELECT count(*) FROM t_fresh_unlinked f WHERE f.resource_id = u.resource_id AND f.url = u.url) AS fresh_unlinked
FROM (SELECT resource_id, url FROM t_stale_linked
      UNION
      SELECT resource_id, url FROM t_fresh_unlinked) u;

-- 1:1 pairs = the same copy, reworded
CREATE TEMP TABLE t_pairs AS
SELECT s.id AS survivor_id, f.id AS doomed_id, s.resource_id, s.url,
       s.file_id, s.inventory_id, s.parsed AS stale_parsed,
       f.source_key, f.parsed AS fresh_parsed, f.availability, f.checked_availability_at
FROM t_url_counts c
JOIN t_stale_linked s ON s.resource_id = c.resource_id AND s.url = c.url
JOIN t_fresh_unlinked f ON f.resource_id = c.resource_id AND f.url = c.url
WHERE c.stale_linked = 1 AND c.fresh_unlinked = 1
  -- a pending action that points the fresh row at a DIFFERENT target is a human call
  AND NOT EXISTS (
    SELECT 1 FROM file_actions fa
    WHERE fa.online_copy_id = f.id AND fa.resolved_at IS NULL AND fa.file_id IS DISTINCT FROM s.file_id)
  AND NOT EXISTS (
    SELECT 1 FROM inventory_actions ia
    WHERE ia.online_copy_id = f.id AND ia.resolved_at IS NULL AND ia.inventory_id IS DISTINCT FROM s.inventory_id);

-- urls with several stale and/or several fresh rows: reported, never touched
CREATE TEMP TABLE t_ambiguous AS
SELECT c.*
FROM t_url_counts c
WHERE c.stale_linked > 0 AND c.fresh_unlinked > 0
  AND NOT (c.stale_linked = 1 AND c.fresh_unlinked = 1);
