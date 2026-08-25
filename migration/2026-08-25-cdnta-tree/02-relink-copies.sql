-- 02-relink-copies.sql — relink all ЦДНТА FS online copies to the new tree.
-- Requires 01-create-tree.sql applied. Run from this folder.
-- Dry-run: sed 's/^COMMIT;/ROLLBACK;/' 02-relink-copies.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
\set ON_ERROR_STOP on
\timing on

BEGIN;

DROP TABLE IF EXISTS t_relink, t_skipped, t_ctx, t_map, t_dupes, t_skip_unlink;

CREATE TEMP TABLE t_relink (
  copy_id uuid, parsed text, ref text, fond text, complex text,
  inv_code text, file_code text, method text);
\copy t_relink FROM 'relink.csv' CSV HEADER

CREATE TEMP TABLE t_skipped (copy_id uuid, parsed text, ref text, reason text);
\copy t_skipped FROM 'relink-skipped.csv' CSV HEADER

CREATE TEMP TABLE t_ctx AS
SELECT (SELECT id FROM archives WHERE code = 'ЦДНТА') AS archive_id;

DO $$ BEGIN
  IF (SELECT count(*) FROM t_relink) + (SELECT count(*) FROM t_skipped)
     <> (SELECT count(*) FROM online_copies WHERE parsed LIKE 'ЦДНТА-(%') THEN
    RAISE EXCEPTION 'relink+skipped does not cover all ЦДНТА copies';
  END IF;
END $$;

-- ── 1. create files missing from the bulk ranges (gaps + lettered справи) ─
WITH need AS (
  SELECT DISTINCT t.fond, t.inv_code, t.file_code
  FROM t_relink t
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = t.fond AND f.archive_id = c.archive_id
  JOIN inventories i ON i.code = t.inv_code AND i.fond_id = f.id
  WHERE i.code <> 'OLD-3'
    AND NOT EXISTS (SELECT 1 FROM files x
                    WHERE x.inventory_id = i.id AND x.code = t.file_code)
), ins AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT n.file_code,
         'ЦДНТА-' || n.fond || '-' || n.inv_code || '-' || n.file_code,
         i.id, now()
  FROM need n
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = n.fond AND f.archive_id = c.archive_id
  JOIN inventories i ON i.code = n.inv_code AND i.fond_id = f.id
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING full_code)
SELECT 'gap files created' AS step, count(*) FROM ins;

-- ── 2. resolve every relink row to a target file id ──────────────────────
CREATE TEMP TABLE t_map AS
SELECT t.copy_id, t.parsed, t.method, oc.file_id AS old_file_id,
       oc.inventory_id AS old_inventory_id, oc.resource_id, oc.url,
       oc.updated_at AS old_updated_at,
       fi.id AS new_file_id, fi.full_code AS new_full_code
FROM t_relink t
JOIN online_copies oc ON oc.id = t.copy_id
JOIN t_ctx c ON true
JOIN fonds f ON f.code = t.fond AND f.archive_id = c.archive_id
JOIN inventories i ON i.code = t.inv_code AND i.fond_id = f.id AND i.code <> 'OLD-3'
JOIN files fi ON fi.inventory_id = i.id AND fi.code = t.file_code;

DO $$ BEGIN
  IF (SELECT count(*) FROM t_map) <> (SELECT count(*) FROM t_relink) THEN
    RAISE EXCEPTION 'unresolved relink rows: % of %',
      (SELECT count(*) FROM t_relink) - (SELECT count(*) FROM t_map),
      (SELECT count(*) FROM t_relink);
  END IF;
END $$;

-- ── 3. dedup: same (resource, parsed, url) landing on the same target ────
CREATE TEMP TABLE t_dupes AS
SELECT copy_id FROM (
  SELECT copy_id, row_number() OVER (
    PARTITION BY resource_id, parsed, url, new_file_id
    ORDER BY old_updated_at DESC, copy_id) rn
  FROM t_map) x
WHERE rn > 1;

\copy (SELECT oc.* FROM online_copies oc JOIN t_dupes d ON oc.id = d.copy_id) TO 'audit/dedup-deleted.csv' CSV HEADER

WITH del AS (
  DELETE FROM online_copies WHERE id IN (SELECT copy_id FROM t_dupes) RETURNING 1)
SELECT 'dup copies deleted' AS step, count(*) FROM del;

-- ── 4. relink surviving copies ────────────────────────────────────────────
WITH upd AS (
  UPDATE online_copies oc
  SET file_id = m.new_file_id, inventory_id = NULL, updated_at = now()
  FROM t_map m
  WHERE oc.id = m.copy_id
    AND m.copy_id NOT IN (SELECT copy_id FROM t_dupes)
    AND oc.file_id IS DISTINCT FROM m.new_file_id
  RETURNING 1)
SELECT 'copies relinked' AS step, count(*) FROM upd;

-- ── 5. unlink skipped copies still attached to the bogus tree ────────────
CREATE TEMP TABLE t_skip_unlink AS
SELECT oc.id AS copy_id, oc.file_id AS old_file_id
FROM online_copies oc
JOIN t_skipped s ON oc.id = s.copy_id
JOIN t_ctx c ON true
WHERE oc.file_id IN (
  SELECT fi.id FROM files fi
  JOIN inventories i ON fi.inventory_id = i.id
  JOIN fonds f ON i.fond_id = f.id
  WHERE f.archive_id = c.archive_id AND i.code = 'OLD-3');

\copy t_skip_unlink TO 'audit/skipped-unlinked.csv' CSV HEADER

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = NULL, updated_at = now()
  FROM t_skip_unlink s
  WHERE oc.id = s.copy_id
  RETURNING 1)
SELECT 'skipped copies unlinked from bogus tree' AS step, count(*) FROM upd;

-- ── 6. resolve stale pending inventory_actions (proposals to bogus tree) ─
\copy (SELECT ia.* FROM inventory_actions ia WHERE ia.resolved_at IS NULL AND ia.online_copy_id IN (SELECT id FROM online_copies WHERE parsed LIKE 'ЦДНТА-(%')) TO 'audit/resolved-actions-before.csv' CSV HEADER

WITH upd AS (
  UPDATE inventory_actions ia
  SET resolved_at = now(), resolved_by = 'migration:2026-08-25-cdnta-tree',
      is_rejected = true,
      note = coalesce(note || ' | ', '') || 'superseded: комплексні таблиці ЦДНТА розшифровано'
  WHERE ia.resolved_at IS NULL
    AND ia.online_copy_id IN (SELECT id FROM online_copies WHERE parsed LIKE 'ЦДНТА-(%')
  RETURNING 1)
SELECT 'stale inventory_actions resolved' AS step, count(*) FROM upd;

-- ── 7. verify: nothing points at the bogus tree any more ─────────────────
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n
  FROM online_copies oc
  WHERE oc.file_id IN (
      SELECT fi.id FROM files fi
      JOIN inventories i ON fi.inventory_id = i.id
      JOIN fonds f ON i.fond_id = f.id
      JOIN t_ctx c ON f.archive_id = c.archive_id
      WHERE i.code = 'OLD-3')
     OR oc.inventory_id IN (
      SELECT i.id FROM inventories i
      JOIN fonds f ON i.fond_id = f.id
      JOIN t_ctx c ON f.archive_id = c.archive_id
      WHERE i.code = 'OLD-3');
  IF n > 0 THEN RAISE EXCEPTION '% copies still on bogus tree', n; END IF;
END $$;

-- ── audit ─────────────────────────────────────────────────────────────────
\copy (SELECT m.copy_id, m.parsed, m.method, m.old_file_id, m.old_inventory_id, m.new_file_id, m.new_full_code, (m.copy_id IN (SELECT copy_id FROM t_dupes)) AS deleted_as_dup FROM t_map m ORDER BY m.new_full_code) TO 'audit/relink-map.csv' CSV HEADER

SELECT 'summary' AS step,
  (SELECT count(*) FROM online_copies WHERE parsed LIKE 'ЦДНТА-(%') AS cdnta_copies_now,
  (SELECT count(*) FROM online_copies WHERE parsed LIKE 'ЦДНТА-(%' AND file_id IS NOT NULL) AS linked,
  (SELECT count(*) FROM online_copies WHERE parsed LIKE 'ЦДНТА-(%' AND file_id IS NULL AND inventory_id IS NULL) AS unlinked_for_editor;

COMMIT;
