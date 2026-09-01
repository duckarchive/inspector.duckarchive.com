-- Post-deploy sweep (idempotent, cheap): rows the PREVIOUS scrapper build wrote
-- between the migration and its own redeploy have source_key NULL with a real
-- parsed — the new sink never matches them (NULL = editor-owned), so they would
-- become permanent unlinked twins. Give them the legacy key (their text), one per
-- (resource, url, text), linked-first, unless a keyed row already holds that key.
-- Run once right after the scrapper deploy; safe to re-run.
-- Run from this folder: psql … -f 01-post-deploy-null-keys.sql
\set ON_ERROR_STOP on
\timing on
BEGIN;

WITH ranked AS (
  SELECT o.id,
         row_number() OVER (PARTITION BY o.resource_id, o.url, o.parsed
                            ORDER BY (o.file_id IS NULL AND o.inventory_id IS NULL),
                                     o.checked_availability_at DESC NULLS LAST, o.id) AS rn
  FROM online_copies o
  WHERE o.source_key IS NULL AND o.parsed <> ''
    AND NOT EXISTS (
      SELECT 1 FROM online_copies k
      WHERE k.resource_id = o.resource_id AND k.url = o.url AND k.source_key = o.parsed)
),
upd AS (
  UPDATE online_copies oc SET source_key = oc.parsed
  FROM ranked r WHERE r.id = oc.id AND r.rn = 1
  RETURNING 1)
SELECT 'null-key rows keyed by their text' AS step, count(*) FROM upd;

SELECT 'null-key rows with a text left (twins of a keyed row)' AS what, count(*)
FROM online_copies WHERE source_key IS NULL AND parsed <> '';

COMMIT;
