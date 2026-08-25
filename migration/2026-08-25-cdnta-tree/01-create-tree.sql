-- 01-create-tree.sql — build the ЦДНТА catalog tree from scraped опис tables.
-- Run from this folder: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 01-create-tree.sql
-- Dry-run: sed 's/^COMMIT;/ROLLBACK;/' 01-create-tree.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
\set ON_ERROR_STOP on
\timing on

BEGIN;

DROP TABLE IF EXISTS t_fonds, t_invs, t_ranges, t_ctx, t_old_invs;

-- ── staging ──────────────────────────────────────────────────────────────
CREATE TEMP TABLE t_fonds (fond_code text, title text);
\copy t_fonds FROM 'fonds.csv' CSV HEADER

CREATE TEMP TABLE t_invs (
  fond_code text, inv_code text, page text, complex text, opys text,
  title text, info text, year_start text, year_end text, pdf_urls text);
\copy t_invs FROM 'inventories.csv' CSV HEADER

CREATE TEMP TABLE t_ranges (
  fond_code text, inv_code text, seg_start int, seg_end int, letter_extras text);
\copy t_ranges FROM 'file_ranges.csv' CSV HEADER

CREATE TEMP TABLE t_ctx AS
SELECT (SELECT id FROM archives WHERE code = 'ЦДНТА') AS archive_id;

DO $$ BEGIN
  IF (SELECT archive_id FROM t_ctx) IS NULL THEN
    RAISE EXCEPTION 'ЦДНТА archive not found';
  END IF;
  IF (SELECT count(*) FROM t_invs) <> 749 THEN
    RAISE EXCEPTION 'expected 749 inventory rows, got %', (SELECT count(*) FROM t_invs);
  END IF;
END $$;

-- ── 0. rename the 4 bogus inventories (code 3) so new codes don't collide ─
CREATE TEMP TABLE t_old_invs AS
SELECT i.id, f.code AS fond_code, i.code
FROM inventories i
JOIN fonds f ON f.id = i.fond_id
JOIN t_ctx c ON f.archive_id = c.archive_id
WHERE i.code = '3' AND i.title IS NULL
  AND f.code IN ('Р17', 'Р107', 'Р18', 'Р78');

DO $$ BEGIN
  IF (SELECT count(*) FROM t_old_invs) <> 4 THEN
    RAISE EXCEPTION 'expected 4 bogus inventories, got %', (SELECT count(*) FROM t_old_invs);
  END IF;
END $$;

UPDATE inventories SET code = 'OLD-3', updated_at = now()
WHERE id IN (SELECT id FROM t_old_invs);
\copy t_old_invs TO 'audit/old-inventories.csv' CSV HEADER

-- ── 1. resource for опис PDFs ────────────────────────────────────────────
INSERT INTO resources (id, code, title, url, type, updated_at)
SELECT gen_random_uuid(), 'website_cdnta',
       'Центральний державний науково-технічний архів України',
       'https://cdnta-old.archives.gov.ua', 'WEBSITE', now()
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE code = 'website_cdnta');

-- ── 2. fonds ─────────────────────────────────────────────────────────────
WITH ins AS (
  INSERT INTO fonds (code, title, archive_id, updated_at)
  SELECT t.fond_code, nullif(t.title, ''), c.archive_id, now()
  FROM t_fonds t CROSS JOIN t_ctx c
  WHERE NOT EXISTS (SELECT 1 FROM fonds f
                    WHERE f.code = t.fond_code AND f.archive_id = c.archive_id)
  RETURNING id, code)
SELECT 'fonds created' AS step, count(*) FROM ins;

UPDATE fonds f SET title = t.title, updated_at = now()
FROM t_fonds t, t_ctx c
WHERE f.code = t.fond_code AND f.archive_id = c.archive_id
  AND f.title IS NULL AND t.title <> '';

-- ── 3. inventories ───────────────────────────────────────────────────────
WITH ins AS (
  INSERT INTO inventories (code, title, info, fond_id, updated_at)
  SELECT t.inv_code, nullif(t.title, ''), t.info, f.id, now()
  FROM t_invs t
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = t.fond_code AND f.archive_id = c.archive_id
  WHERE NOT EXISTS (SELECT 1 FROM inventories i
                    WHERE i.code = t.inv_code AND i.fond_id = f.id)
  RETURNING id)
SELECT 'inventories created' AS step, count(*) FROM ins;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n
  FROM t_invs t
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = t.fond_code AND f.archive_id = c.archive_id
  JOIN inventories i ON i.code = t.inv_code AND i.fond_id = f.id;
  IF n <> 749 THEN RAISE EXCEPTION 'inventories present % <> 749', n; END IF;
END $$;

-- ── 4. inventory_years ───────────────────────────────────────────────────
WITH ins AS (
  INSERT INTO inventory_years (inventory_id, start_year, end_year)
  SELECT i.id, t.year_start::int, t.year_end::int
  FROM t_invs t
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = t.fond_code AND f.archive_id = c.archive_id
  JOIN inventories i ON i.code = t.inv_code AND i.fond_id = f.id
  WHERE t.year_start <> ''
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'inventory_years created' AS step, count(*) FROM ins;

-- ── 5. files from од.зб. ranges (numeric series + lettered bounds) ───────
WITH codes AS (
  SELECT r.fond_code, r.inv_code, gs::text AS file_code
  FROM t_ranges r, generate_series(r.seg_start, r.seg_end) gs
  UNION
  SELECT r.fond_code, r.inv_code, trim(x)
  FROM t_ranges r, unnest(string_to_array(r.letter_extras, ';')) x
  WHERE r.letter_extras <> ''
), ins AS (
  INSERT INTO files (code, full_code, inventory_id, updated_at)
  SELECT cd.file_code,
         'ЦДНТА-' || cd.fond_code || '-' || cd.inv_code || '-' || cd.file_code,
         i.id, now()
  FROM codes cd
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = cd.fond_code AND f.archive_id = c.archive_id
  JOIN inventories i ON i.code = cd.inv_code AND i.fond_id = f.id
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1)
SELECT 'files created' AS step, count(*) FROM ins;

-- ── 6. опис PDF online copies ────────────────────────────────────────────
WITH ins AS (
  INSERT INTO online_copies (resource_id, inventory_id, url, parsed, availability, updated_at)
  SELECT r.id, i.id, trim(u), 'ЦДНТА-' || t.fond_code || '-' || t.inv_code || ' (опис)',
         'PUBLIC', now()
  FROM t_invs t
  JOIN t_ctx c ON true
  JOIN fonds f ON f.code = t.fond_code AND f.archive_id = c.archive_id
  JOIN inventories i ON i.code = t.inv_code AND i.fond_id = f.id
  JOIN resources r ON r.code = 'website_cdnta'
  CROSS JOIN LATERAL unnest(string_to_array(t.pdf_urls, ';')) u
  WHERE trim(u) <> ''
    AND NOT EXISTS (SELECT 1 FROM online_copies oc
                    WHERE oc.resource_id = r.id AND oc.inventory_id = i.id
                      AND oc.url = trim(u))
  RETURNING 1)
SELECT 'pdf copies created' AS step, count(*) FROM ins;

-- ── 7. verify: no duplicate full_code in the NEW tree ────────────────────
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM (
    SELECT fi.full_code
    FROM files fi
    JOIN inventories i ON fi.inventory_id = i.id
    JOIN fonds f ON i.fond_id = f.id
    JOIN t_ctx c ON f.archive_id = c.archive_id
    WHERE i.code <> 'OLD-3'
    GROUP BY fi.full_code HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION '% duplicate full_code in new tree', n; END IF;
END $$;

-- ── audit exports ────────────────────────────────────────────────────────
\copy (SELECT f.id, f.code, f.title FROM fonds f JOIN t_ctx c ON f.archive_id=c.archive_id ORDER BY f.code) TO 'audit/created-fonds.csv' CSV HEADER
\copy (SELECT i.id, f.code AS fond, i.code, i.title, i.info FROM inventories i JOIN fonds f ON i.fond_id=f.id JOIN t_ctx c ON f.archive_id=c.archive_id WHERE i.code <> 'OLD-3' ORDER BY f.code, i.code) TO 'audit/created-invs.csv' CSV HEADER

SELECT 'summary' AS step,
  (SELECT count(*) FROM fonds f JOIN t_ctx c ON f.archive_id=c.archive_id) AS fonds,
  (SELECT count(*) FROM inventories i JOIN fonds f ON i.fond_id=f.id JOIN t_ctx c ON f.archive_id=c.archive_id AND i.code<>'OLD-3') AS new_inventories,
  (SELECT count(*) FROM files fi JOIN inventories i ON fi.inventory_id=i.id JOIN fonds f ON i.fond_id=f.id JOIN t_ctx c ON f.archive_id=c.archive_id WHERE i.code<>'OLD-3') AS new_files,
  (SELECT count(*) FROM online_copies oc JOIN resources r ON oc.resource_id=r.id WHERE r.code='website_cdnta') AS pdf_copies;

COMMIT;
