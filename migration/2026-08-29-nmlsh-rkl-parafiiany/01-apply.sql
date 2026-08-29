-- 01-apply.sql — import "Списки парафіян греко-католицької церкви" (staging.csv):
--   * create archive НМЛШ (Національний музей у Львові ім. А.Шептицького)
--     with fond РКЛ, опис 1, and 273 справи from НМЛ,РКЛ-XXX codes
--   * create/enrich 75 справи in existing ЦДІАЛ ф.201 (описи 1, 1А, 4, 4А)
-- Run from this folder: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 01-apply.sql
-- Dry-run: sed 's/^COMMIT;/ROLLBACK;/' 01-apply.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
\set ON_ERROR_STOP on
\timing on

BEGIN;

-- ── staging ──────────────────────────────────────────────────────────────
CREATE TEMP TABLE t_stage (
  archive_code text, fond_code text, inv_code text, file_code text,
  title text, info text, start_year text, end_year text);
\copy t_stage FROM 'staging.csv' CSV HEADER

DO $$ BEGIN
  IF (SELECT count(*) FROM t_stage) <> 348 THEN
    RAISE EXCEPTION 'expected 348 staged rows, got %', (SELECT count(*) FROM t_stage);
  END IF;
  IF EXISTS (SELECT 1 FROM archives WHERE code = 'НМЛШ') THEN
    RAISE EXCEPTION 'archive НМЛШ already exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM archives WHERE code = 'ЦДІАЛ') THEN
    RAISE EXCEPTION 'archive ЦДІАЛ not found';
  END IF;
END $$;

-- ── 1. new archive НМЛШ + fond РКЛ + опис 1 ─────────────────────────────
INSERT INTO archives (code, title, updated_at)
VALUES ('НМЛШ', 'Національний музей у Львові ім. А.Шептицького', now());

INSERT INTO fonds (code, archive_id, updated_at)
SELECT 'РКЛ', id, now() FROM archives WHERE code = 'НМЛШ';

INSERT INTO inventories (code, fond_id, updated_at)
SELECT '1', f.id, now()
FROM fonds f JOIN archives a ON a.id = f.archive_id
WHERE a.code = 'НМЛШ' AND f.code = 'РКЛ';

-- ── 2. resolve staged rows to inventory ids ──────────────────────────────
CREATE TEMP TABLE t_rows AS
SELECT s.*, i.id AS inventory_id,
       s.archive_code || '-' || s.fond_code || '-' || s.inv_code || '-' || s.file_code AS full_code
FROM t_stage s
JOIN archives a ON a.code = s.archive_code
JOIN fonds fo ON fo.archive_id = a.id AND fo.code = s.fond_code
JOIN inventories i ON i.fond_id = fo.id AND i.code = s.inv_code;

DO $$ BEGIN
  IF (SELECT count(*) FROM t_rows) <> 348 THEN
    RAISE EXCEPTION 'staged rows failed to resolve an inventory: %',
      (SELECT string_agg(s.archive_code || '-' || s.fond_code || '-' || s.inv_code, ', ')
       FROM t_stage s LEFT JOIN t_rows r
         ON (r.archive_code, r.fond_code, r.inv_code, r.file_code)
          = (s.archive_code, s.fond_code, s.inv_code, s.file_code)
       WHERE r.file_code IS NULL);
  END IF;
END $$;

-- ── 3. create missing files ──────────────────────────────────────────────
CREATE TEMP TABLE t_created AS
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id, title, info, updated_at)
  SELECT r.file_code, r.full_code, r.inventory_id,
         NULLIF(r.title, ''), NULLIF(r.info, ''), now()
  FROM t_rows r
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING id, full_code)
SELECT * FROM ins;
SELECT 'files created' AS step, count(*) FROM t_created;

-- ── 4. enrich pre-existing files (fill only empty fields) ────────────────
WITH upd AS (
  UPDATE files f
  SET title = NULLIF(r.title, ''), updated_at = now()
  FROM t_rows r
  WHERE f.inventory_id = r.inventory_id AND f.code = r.file_code
    AND f.id NOT IN (SELECT id FROM t_created)
    AND (f.title IS NULL OR f.title = '') AND r.title <> ''
  RETURNING f.id)
SELECT 'titles filled on existing' AS step, count(*) FROM upd;

WITH upd AS (
  UPDATE files f
  SET info = r.info, updated_at = now()
  FROM t_rows r
  WHERE f.inventory_id = r.inventory_id AND f.code = r.file_code
    AND f.id NOT IN (SELECT id FROM t_created)
    AND (f.info IS NULL OR f.info = '') AND r.info <> ''
  RETURNING f.id)
SELECT 'info filled on existing' AS step, count(*) FROM upd;

-- ── 5. years ─────────────────────────────────────────────────────────────
WITH ins AS (
  INSERT INTO file_years (file_id, start_year, end_year)
  SELECT f.id, r.start_year::int, r.end_year::int
  FROM t_rows r
  JOIN files f ON f.inventory_id = r.inventory_id AND f.code = r.file_code
  WHERE r.start_year <> ''
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file_years inserted' AS step, count(*) FROM ins;

-- ── 6. verify ────────────────────────────────────────────────────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM t_rows r
  LEFT JOIN files f ON f.inventory_id = r.inventory_id AND f.code = r.file_code
  WHERE f.id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% staged rows have no file after import', n; END IF;

  SELECT count(*) INTO n FROM files f
  JOIN inventories i ON i.id = f.inventory_id
  JOIN fonds fo ON fo.id = i.fond_id
  JOIN archives a ON a.id = fo.archive_id
  WHERE a.code = 'НМЛШ';
  IF n <> 273 THEN RAISE EXCEPTION 'expected 273 НМЛШ files, got %', n; END IF;
END $$;

-- audit trail for rollback
\copy (SELECT full_code FROM t_created ORDER BY full_code) TO 'created-files.csv' CSV

COMMIT;
