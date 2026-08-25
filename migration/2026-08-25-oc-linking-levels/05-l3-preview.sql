-- L3 preview: copies whose parsed code points at a справа/опис that does NOT
-- exist in the catalog. READ-ONLY — writes audit CSVs, no DB changes.
-- Run AFTER 01-04 (it only considers copies with no pending action left).
--   Tier C: parent inventory exists, справа missing        -> would create file
--   Tier B: fond exists, whole опис missing (clean 4-seg)  -> would create inventory + files
-- Guards mirror migration/2026-08-25-autolink-create-missing (справа code
-- ^\d+[А-ЯІЇЄҐ]{0,2}$, single parent candidate, ЦДНТА excluded).
-- Run from this folder: psql … -f 05-l3-preview.sql
\set ON_ERROR_STOP on

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

-- candidate codes from three sources, eligible copies only
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
  -- single Volume occurrence, no справа-range
  AND btrim(split_part(b.blob, '+++', 3)) !~* '(?:Volume|Vol\.?)\s+\d+[^/]*/\d+[A-Za-zА-Яа-я]?-\d'
  AND (SELECT count(*) FROM regexp_matches(btrim(split_part(b.blob, '+++', 3)),
        '(?:Volume|Vol\.?)\s+\d', 'gi')) = 1;

-- keep only codes matching nothing existing, with a clean справа tail
CREATE TEMP TABLE t_missing AS
SELECT c.*,
       regexp_replace(c.code, '-[^-]+$', '') AS parentfc,
       (regexp_match(c.code, '-([^-]+)$'))[1] AS sprava
FROM t_cand c
WHERE NOT EXISTS (SELECT 1 FROM t_files f WHERE f.fc = c.code)
  AND NOT EXISTS (SELECT 1 FROM t_invs i WHERE i.fc = c.code)
  AND (regexp_match(c.code, '-([^-]+)$'))[1] ~ '^\d+[А-ЯІЇЄҐ]{0,2}$'
  AND length((regexp_match(c.code, '-([^-]+)$'))[1]) <= 20;

-- Tier C: inventory exists (exactly one)
CREATE TEMP TABLE t_tierc AS
SELECT m.oc_id, m.parsed, m.src, m.code, m.sprava,
       (array_agg(i.id))[1] AS inventory_id
FROM t_missing m JOIN t_invs i ON i.fc = m.parentfc
GROUP BY m.oc_id, m.parsed, m.src, m.code, m.sprava
HAVING count(*) = 1;

-- Tier B: inventory missing, fond exists (exactly one), clean опис code
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

\copy (SELECT code AS new_full_code, min(src) AS src, count(*) AS copies, min(parsed) AS sample_parsed FROM t_tierc GROUP BY code ORDER BY code) TO 'audit/l3-preview-files-to-create.csv' CSV HEADER
\copy (SELECT regexp_replace(code, '-[^-]+$', '') AS new_inventory, count(DISTINCT code) AS new_files, count(*) AS copies, min(parsed) AS sample_parsed FROM t_tierb GROUP BY 1 ORDER BY 1) TO 'audit/l3-preview-inventories-to-create.csv' CSV HEADER
\copy (SELECT code AS new_full_code, min(src) AS src, count(*) AS copies, min(parsed) AS sample_parsed FROM t_tierb GROUP BY code ORDER BY code) TO 'audit/l3-preview-tierb-files.csv' CSV HEADER

SELECT 'eligible candidate codes' AS what, count(*) FROM t_cand
UNION ALL SELECT 'missing (clean справа)', count(*) FROM t_missing
UNION ALL SELECT 'tier C copies (new files under existing inventories)', count(*) FROM t_tierc
UNION ALL SELECT 'tier C distinct new files', count(DISTINCT code) FROM t_tierc
UNION ALL SELECT 'tier B copies (new inventories under existing fonds)', count(*) FROM t_tierb
UNION ALL SELECT 'tier B distinct new inventories', count(DISTINCT regexp_replace(code, '-[^-]+$', '')) FROM t_tierb
UNION ALL SELECT 'tier B distinct new files', count(DISTINCT code) FROM t_tierb;
