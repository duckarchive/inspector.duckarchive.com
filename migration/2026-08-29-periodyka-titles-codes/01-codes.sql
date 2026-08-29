-- 01-codes.sql — ПЕРІОДИКА: replace scrape-id file codes with edition numbers
-- extracted from titles ("№ 25, 04.02.1932" -> code 25).
--   * collisions within one inventory (same №): Cyrillic letter postfix
--     sorted by issue date (25А, 25Б, ...)
--   * 11 date-only titles (no №): incremental б/н-1, б/н-2 ... by date
--   * full_code rebuilt as ПЕРІОДИКА-<fond>-<inv>-<code>
-- Titles are NOT touched here (02-titles.sql runs after this).
-- Run from this folder: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 01-codes.sql
-- Dry-run: sed 's/^COMMIT;/ROLLBACK;/' 01-codes.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
\set ON_ERROR_STOP on
\timing on

BEGIN;

-- ── staging: every ПЕРІОДИКА file with its extracted edition ─────────────
CREATE TEMP TABLE t_pf AS
SELECT f.id, f.code AS old_code, f.full_code AS old_full_code, f.title,
       f.inventory_id, i.code AS inv_code, fo.code AS fond_code,
       trim(substring(f.title FROM '^№ (.+), \d{2}\.\d{2}\.\d{4}$')) AS ed,
       substring(f.title FROM '(\d{2}\.\d{2}\.\d{4})$') AS dstr
FROM files f
JOIN inventories i ON i.id = f.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE a.code = 'ПЕРІОДИКА';

DO $$ BEGIN
  IF (SELECT count(*) FROM t_pf) <> 133453 THEN
    RAISE EXCEPTION 'expected 133453 files, got %', (SELECT count(*) FROM t_pf);
  END IF;
  IF EXISTS (SELECT 1 FROM t_pf WHERE dstr IS NULL) THEN
    RAISE EXCEPTION 'files without a trailing date in title: %',
      (SELECT count(*) FROM t_pf WHERE dstr IS NULL);
  END IF;
  IF (SELECT count(*) FROM t_pf WHERE ed IS NULL) <> 11 THEN
    RAISE EXCEPTION 'expected 11 date-only titles, got %',
      (SELECT count(*) FROM t_pf WHERE ed IS NULL);
  END IF;
  -- guard against double-run: codes must still be the numeric scrape ids
  IF EXISTS (SELECT 1 FROM t_pf WHERE old_code !~ '^\d+$') THEN
    RAISE EXCEPTION 'non-numeric old codes found — already migrated?';
  END IF;
END $$;

-- ── compute new codes ────────────────────────────────────────────────────
CREATE TEMP TABLE t_new AS
WITH base AS (
  SELECT id, inventory_id, inv_code, fond_code, old_code, old_full_code,
         -- sortable YYYYMMDD key from DD.MM.YYYY (no to_date: garbage-proof)
         substr(dstr,7,4) || substr(dstr,4,2) || substr(dstr,1,2) AS dkey,
         coalesce(ed, 'б/н-' || row_number() OVER (
           PARTITION BY inventory_id, (ed IS NULL)
           ORDER BY substr(dstr,7,4) || substr(dstr,4,2) || substr(dstr,1,2),
                    length(old_code), old_code)
         ) AS ed,
         (ed IS NULL) AS dateonly
  FROM t_pf),
grp AS (
  SELECT b.*,
         count(*) OVER (PARTITION BY inventory_id, ed) AS cnt,
         row_number() OVER (PARTITION BY inventory_id, ed
                            ORDER BY dkey, length(old_code), old_code) AS rn
  FROM base b)
SELECT id, inventory_id, inv_code, fond_code, old_code, old_full_code,
       ed || CASE WHEN cnt > 1
                  THEN (string_to_array('А,Б,В,Г,Д,Е,Ж,З,И,К,Л,М,Н,О,П', ','))[rn]
                  ELSE '' END AS new_code
FROM grp;

-- ── validate new codes ───────────────────────────────────────────────────
DO $$
DECLARE n int; s text;
BEGIN
  SELECT count(*) INTO n FROM t_new WHERE new_code IS NULL OR new_code = '';
  IF n > 0 THEN RAISE EXCEPTION '% empty new codes', n; END IF;

  SELECT count(*), string_agg(DISTINCT new_code, ', ') INTO n, s
  FROM t_new WHERE length(new_code) > 20;
  IF n > 0 THEN RAISE EXCEPTION '% new codes over 20 chars: %', n, s; END IF;

  SELECT count(*) INTO n FROM (
    SELECT inventory_id, new_code FROM t_new
    GROUP BY 1, 2 HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION '% duplicate (inventory, new_code) groups', n; END IF;

  -- interim codes must be unique too (md5 prefix)
  SELECT count(*) INTO n FROM (
    SELECT left(md5(id::text), 12) FROM t_new GROUP BY 1 HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION 'interim md5 code collision'; END IF;
END $$;

SELECT 'suffixed codes' AS step, count(*) FROM t_new WHERE new_code ~ '[А-П]$'
UNION ALL
SELECT 'б/н codes', count(*) FROM t_new WHERE new_code LIKE 'б/н-%'
UNION ALL
SELECT 'unchanged-shape plain codes', count(*) FROM t_new WHERE new_code !~ '[А-П]$' AND new_code NOT LIKE 'б/н-%';

-- ── pre-state dump for rollback ──────────────────────────────────────────
\copy (SELECT id, old_code, old_full_code, title FROM t_pf ORDER BY old_full_code) TO 'pre-state-codes.csv' CSV HEADER

-- ── phase A: interim unique codes (avoids transient unique-index clashes
--    between one file's new code and another file's not-yet-updated old id) ─
UPDATE files f SET code = '~' || left(md5(f.id::text), 12)
FROM t_new n WHERE f.id = n.id;

-- ── phase B: final codes + full_code ─────────────────────────────────────
UPDATE files f
SET code = n.new_code,
    full_code = 'ПЕРІОДИКА-' || n.fond_code || '-' || n.inv_code || '-' || n.new_code,
    updated_at = now()
FROM t_new n WHERE f.id = n.id;

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM files f JOIN t_new t ON t.id = f.id
  WHERE f.code <> t.new_code OR f.code LIKE '~%';
  IF n > 0 THEN RAISE EXCEPTION '% files not updated to final code', n; END IF;
END $$;

\copy (SELECT old_full_code, 'ПЕРІОДИКА-' || fond_code || '-' || inv_code || '-' || new_code AS new_full_code FROM t_new ORDER BY old_full_code) TO 'code-map.csv' CSV HEADER

COMMIT;
