-- 02-titles.sql — ПЕРІОДИКА: prefix every file title with the fond
-- (newspaper) title: "№ 25, 04.02.1932" -> "Діло, № 25, 04.02.1932".
-- Run AFTER 01-codes.sql (codes are extracted from the unprefixed titles).
-- Run from this folder: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 02-titles.sql
-- Dry-run: sed 's/^COMMIT;/ROLLBACK;/' 02-titles.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
\set ON_ERROR_STOP on
\timing on

BEGIN;

WITH upd AS (
  UPDATE files f
  SET title = fo.title || ', ' || f.title,
      updated_at = now()
  FROM inventories i
  JOIN fonds fo ON fo.id = i.fond_id
  JOIN archives a ON a.id = fo.archive_id
  WHERE i.id = f.inventory_id
    AND a.code = 'ПЕРІОДИКА'
    AND f.title IS NOT NULL
    -- idempotence: skip titles already carrying the newspaper name
    AND position(fo.title || ', ' IN f.title) <> 1
  RETURNING f.id)
SELECT 'titles prefixed' AS step, count(*) FROM upd;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM files f
  JOIN inventories i ON i.id = f.inventory_id
  JOIN fonds fo ON fo.id = i.fond_id
  JOIN archives a ON a.id = fo.archive_id
  WHERE a.code = 'ПЕРІОДИКА' AND position(fo.title || ', ' IN f.title) <> 1;
  IF n > 0 THEN RAISE EXCEPTION '% titles still unprefixed', n; END IF;
END $$;

COMMIT;
