-- L3 execute: create the missing catalog rows previewed by 05-l3-preview.sql
-- and link the copies DIRECTLY (no action queue — mirrors
-- migration/2026-08-25-autolink-create-missing). Recomputes candidates from the
-- current state, so run it right after reviewing the preview CSVs.
-- New rows are bare bulk-import shape: code + full_code, NULL title/info/tags.
-- Run from this folder: psql … -f 06-l3-execute.sql
\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION pg_temp.norm2(p text) RETURNS text AS $$
  SELECT regexp_replace(
           regexp_replace(pg_temp.fold($1), '^([^-]+)-([РП])-', '\1-\2'),
           '-([А-ЯЄІЇҐA-Z])$', '\1');
$$ LANGUAGE sql IMMUTABLE;

CREATE TEMP TABLE t_files AS
SELECT f.id, pg_temp.fold(f.full_code) AS fc FROM files f;
CREATE INDEX ON t_files(fc);

CREATE TEMP TABLE t_invs AS
SELECT i.id, pg_temp.fold(a.code || '-' || fo.code || '-' || i.code) AS fc
FROM inventories i
JOIN fonds fo ON i.fond_id = fo.id
JOIN archives a ON fo.archive_id = a.id;
CREATE INDEX ON t_invs(fc);

CREATE TEMP TABLE t_fonds AS
SELECT fo.id, pg_temp.fold(a.code || '-' || fo.code) AS fc
FROM fonds fo JOIN archives a ON fo.archive_id = a.id;
CREATE INDEX ON t_fonds(fc);

CREATE TEMP TABLE t_cand AS
WITH base AS (
  SELECT oc.id AS oc_id, oc.parsed,
         (oc.parsed LIKE '%+++%') AS is_fs,
         CASE WHEN oc.parsed LIKE '%+++%'
              THEN (regexp_match(oc.parsed, '^([^-]+)-\('))[1] END AS arch,
         CASE WHEN oc.parsed LIKE '%+++%'
              THEN (regexp_match(oc.parsed, '^[^-]+-\((.*)\)$'))[1] END AS blob
  FROM online_copies oc
  WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
    AND btrim(oc.parsed) <> ''
    AND oc.parsed NOT LIKE 'ЦДНТА%'
    AND NOT EXISTS (SELECT 1 FROM file_actions fa
                    WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                    WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL)
)
SELECT oc_id, parsed, 'plain' AS src, pg_temp.norm2(parsed) AS code
FROM base WHERE NOT is_fs
UNION ALL
SELECT oc_id, parsed, 'fs-ref',
       pg_temp.norm2(arch || '-' || replace(btrim(split_part(blob, '+++', 1)), ' ', ''))
FROM base WHERE is_fs AND btrim(split_part(blob, '+++', 1)) <> ''
UNION ALL
SELECT b.oc_id, b.parsed, 'volume',
       pg_temp.fold(b.arch || '-' || m[1] || '-' || m[2] || '-' || m[3])
FROM base b
CROSS JOIN LATERAL (
  SELECT regexp_match(btrim(split_part(b.blob, '+++', 3)),
    '(?:Volume|Vol\.?)\s+(\d+)-([0-9A-Za-zА-ЯІЇЄҐа-яіїєґ]+)/(\d+[A-Za-zА-Яа-я]?)(?!-\d)', 'i') AS m
) x(m)
WHERE b.is_fs AND btrim(split_part(b.blob, '+++', 1)) = '' AND m IS NOT NULL
  AND btrim(split_part(b.blob, '+++', 3)) !~* '(?:Volume|Vol\.?)\s+\d+[^/]*/\d+[A-Za-zА-Яа-я]?-\d'
  AND (SELECT count(*) FROM regexp_matches(btrim(split_part(b.blob, '+++', 3)),
        '(?:Volume|Vol\.?)\s+\d', 'gi')) = 1;

CREATE TEMP TABLE t_missing AS
SELECT c.*,
       regexp_replace(c.code, '-[^-]+$', '') AS parentfc,
       (regexp_match(c.code, '-([^-]+)$'))[1] AS sprava
FROM t_cand c
WHERE NOT EXISTS (SELECT 1 FROM t_files f WHERE f.fc = c.code)
  AND NOT EXISTS (SELECT 1 FROM t_invs i WHERE i.fc = c.code)
  AND (regexp_match(c.code, '-([^-]+)$'))[1] ~ '^\d+[А-ЯІЇЄҐ]{0,2}$'
  AND length((regexp_match(c.code, '-([^-]+)$'))[1]) <= 20;

CREATE TEMP TABLE t_tierc AS
SELECT m.oc_id, m.parsed, m.src, m.code, m.sprava,
       (array_agg(i.id))[1] AS inventory_id
FROM t_missing m JOIN t_invs i ON i.fc = m.parentfc
GROUP BY m.oc_id, m.parsed, m.src, m.code, m.sprava
HAVING count(*) = 1;

CREATE TEMP TABLE t_tierb AS
SELECT m.oc_id, m.parsed, m.src, m.code, m.sprava,
       (regexp_match(m.parentfc, '-([^-]+)$'))[1] AS opys,
       (array_agg(fo.id))[1] AS fond_id
FROM t_missing m
JOIN t_fonds fo ON fo.fc = regexp_replace(m.parentfc, '-[^-]+$', '')
WHERE NOT EXISTS (SELECT 1 FROM t_invs i WHERE i.fc = m.parentfc)
  AND (regexp_match(m.parentfc, '-([^-]+)$'))[1] ~ '^\d{1,4}[А-ЯІЇЄҐ]{0,2}$'
GROUP BY m.oc_id, m.parsed, m.src, m.code, m.sprava, opys
HAVING count(*) = 1;

-- === Tier B first: create missing inventories ===
WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT b.opys, b.fond_id FROM t_tierb b
  ON CONFLICT (code, fond_id) DO NOTHING
  RETURNING 1)
SELECT 'inventories created' AS step, count(*) FROM ins;

-- resolve tier B parents to real inventory ids (just-created included)
CREATE TEMP TABLE t_tierb2 AS
SELECT b.oc_id, b.parsed, b.code, b.sprava, i.id AS inventory_id
FROM t_tierb b
JOIN inventories i ON i.fond_id = b.fond_id AND i.code = b.opys;

-- === create missing files (tier C + tier B), bulk-import shape ===
CREATE TEMP TABLE t_newfiles AS
SELECT DISTINCT ON (inventory_id, sprava) inventory_id, sprava
FROM (
  SELECT inventory_id, sprava FROM t_tierc
  UNION ALL
  SELECT inventory_id, sprava FROM t_tierb2
) u;

WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT n.sprava,
         a.code || '-' || fo.code || '-' || i.code || '-' || n.sprava,
         n.inventory_id
  FROM t_newfiles n
  JOIN inventories i ON n.inventory_id = i.id
  JOIN fonds fo ON i.fond_id = fo.id
  JOIN archives a ON fo.archive_id = a.id
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1)
SELECT 'files created' AS step, count(*) FROM ins;

-- === link copies directly ===
CREATE TEMP TABLE t_link AS
SELECT u.oc_id, fi.id AS file_id, fi.full_code, u.parsed
FROM (
  SELECT oc_id, parsed, inventory_id, sprava FROM t_tierc
  UNION ALL
  SELECT oc_id, parsed, inventory_id, sprava FROM t_tierb2
) u
JOIN files fi ON fi.inventory_id = u.inventory_id AND fi.code = u.sprava;

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = l.file_id, updated_at = now()
  FROM t_link l
  WHERE oc.id = l.oc_id AND oc.file_id IS NULL AND oc.inventory_id IS NULL
  RETURNING 1)
SELECT 'copies linked' AS step, count(*) FROM upd;

\copy (SELECT l.full_code, l.oc_id, l.parsed FROM t_link l ORDER BY l.full_code) TO 'audit/l3-executed-links.csv' CSV HEADER

-- sanity: no duplicate full_code introduced
DO $$ BEGIN
  IF EXISTS (SELECT full_code FROM files GROUP BY full_code HAVING count(*) > 1 LIMIT 1) THEN
    RAISE EXCEPTION 'duplicate full_code detected';
  END IF;
END $$;

COMMIT;
