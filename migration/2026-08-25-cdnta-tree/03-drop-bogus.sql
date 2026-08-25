-- 03-drop-bogus.sql — remove the bogus 2026-08-05 ЦДНТА tree (inventories renamed OLD-3).
-- Requires 02-relink-copies.sql applied. Run from this folder.
-- Dry-run: sed 's/^COMMIT;/ROLLBACK;/' 03-drop-bogus.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
\set ON_ERROR_STOP on
\timing on

BEGIN;

DROP TABLE IF EXISTS t_ctx, t_old_invs, t_old_files;

CREATE TEMP TABLE t_ctx AS
SELECT (SELECT id FROM archives WHERE code = 'ЦДНТА') AS archive_id;

CREATE TEMP TABLE t_old_invs AS
SELECT i.id FROM inventories i
JOIN fonds f ON i.fond_id = f.id
JOIN t_ctx c ON f.archive_id = c.archive_id
WHERE i.code = 'OLD-3';

CREATE TEMP TABLE t_old_files AS
SELECT fi.id FROM files fi WHERE fi.inventory_id IN (SELECT id FROM t_old_invs);

-- ── preconditions: nothing may still reference the bogus rows ────────────
DO $$ DECLARE n int; BEGIN
  IF (SELECT count(*) FROM t_old_invs) <> 4 THEN
    RAISE EXCEPTION 'expected 4 OLD-3 inventories, got %', (SELECT count(*) FROM t_old_invs);
  END IF;
  SELECT count(*) INTO n FROM online_copies
  WHERE file_id IN (SELECT id FROM t_old_files)
     OR inventory_id IN (SELECT id FROM t_old_invs);
  IF n > 0 THEN RAISE EXCEPTION '% online_copies still reference bogus tree', n; END IF;
  SELECT count(*) INTO n FROM file_actions
  WHERE file_id IN (SELECT id FROM t_old_files) AND resolved_at IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% unresolved file_actions on bogus files', n; END IF;
  SELECT count(*) INTO n FROM inventory_actions
  WHERE inventory_id IN (SELECT id FROM t_old_invs) AND resolved_at IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% unresolved inventory_actions on bogus inventories', n; END IF;
END $$;

-- ── full backups for rollback ────────────────────────────────────────────
\copy (SELECT fi.* FROM files fi JOIN t_old_files o ON fi.id = o.id) TO 'audit/deleted-files.csv' CSV HEADER
\copy (SELECT i.* FROM inventories i JOIN t_old_invs o ON i.id = o.id) TO 'audit/deleted-inventories.csv' CSV HEADER
\copy (SELECT ia.* FROM inventory_actions ia WHERE ia.inventory_id IN (SELECT id FROM t_old_invs)) TO 'audit/deleted-inventory-actions.csv' CSV HEADER
\copy (SELECT fa.* FROM file_actions fa WHERE fa.file_id IN (SELECT id FROM t_old_files)) TO 'audit/deleted-file-actions.csv' CSV HEADER

-- ── delete (files first, then inventories; fonds are kept) ───────────────
WITH del AS (
  DELETE FROM files WHERE id IN (SELECT id FROM t_old_files) RETURNING 1)
SELECT 'bogus files deleted' AS step, count(*) FROM del;

WITH del AS (
  DELETE FROM inventories WHERE id IN (SELECT id FROM t_old_invs) RETURNING 1)
SELECT 'bogus inventories deleted' AS step, count(*) FROM del;

-- ── final verification ───────────────────────────────────────────────────
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM (
    SELECT fi.full_code
    FROM files fi
    JOIN inventories i ON fi.inventory_id = i.id
    JOIN fonds f ON i.fond_id = f.id
    JOIN t_ctx c ON f.archive_id = c.archive_id
    GROUP BY fi.full_code HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION '% duplicate full_code remain', n; END IF;
END $$;

SELECT 'final tree' AS step,
  (SELECT count(*) FROM fonds f JOIN t_ctx c ON f.archive_id = c.archive_id) AS fonds,
  (SELECT count(*) FROM inventories i JOIN fonds f ON i.fond_id = f.id JOIN t_ctx c ON f.archive_id = c.archive_id) AS inventories,
  (SELECT count(*) FROM files fi JOIN inventories i ON fi.inventory_id = i.id JOIN fonds f ON i.fond_id = f.id JOIN t_ctx c ON f.archive_id = c.archive_id) AS files,
  (SELECT count(*) FROM online_copies oc WHERE oc.parsed LIKE 'ЦДНТА-(%' AND oc.file_id IS NOT NULL) AS fs_copies_linked,
  (SELECT count(*) FROM online_copies oc JOIN resources r ON oc.resource_id = r.id WHERE r.code = 'website_cdnta') AS pdf_copies;

COMMIT;
