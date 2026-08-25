-- L2: FamilySearch blobs АРХІВ-(ref+++volume+++title) with a NON-EMPTY ref.
-- Rules (conventions from migration/2026-08-05-online-copies-linking/README.md):
--   a) АРХІВ-ref = exactly one files.full_code            -> file action
--   b) АРХІВ-ref = exactly one inventory combined code    -> inventory action
--   c) ref ends with опис/опись/(опис) marker             -> inventory action
--   d) ref = фонд-опис-start-end (end > start, range)     -> inventory action
-- Creates PENDING actions only. ЦДНТА excluded (fully linked; FS renumbering).
-- Run from this folder: psql … -f 02-l2-fs-ref-actions.sql
\set ON_ERROR_STOP on
\set who 'script:2026-08-25-l2-fs-ref'

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

CREATE TEMP TABLE t_cand AS
SELECT oc.id AS oc_id, oc.parsed,
       (regexp_match(oc.parsed, '^([^-]+)-\('))[1] AS arch,
       btrim(split_part((regexp_match(oc.parsed, '^[^-]+-\((.*)\)$'))[1], '+++', 1)) AS ref
FROM online_copies oc
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed LIKE '%+++%'
  AND oc.parsed NOT LIKE 'ЦДНТА%'
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

DELETE FROM t_cand WHERE ref IS NULL OR ref = '' OR arch IS NULL;

ALTER TABLE t_cand ADD COLUMN code text;
UPDATE t_cand SET code = pg_temp.norm2(arch || '-' || replace(ref, ' ', ''));

-- a) unique file match
CREATE TEMP TABLE t_fm AS
SELECT c.oc_id, c.parsed, c.code, (array_agg(f.id))[1] AS file_id
FROM t_cand c JOIN t_files f ON f.fc = c.code
GROUP BY c.oc_id, c.parsed, c.code
HAVING count(*) = 1;

-- b) unique inventory match (no file match)
CREATE TEMP TABLE t_im AS
SELECT c.oc_id, c.parsed, c.code, (array_agg(i.id))[1] AS inventory_id,
       'L2 FS ref: ref = archive-fond-inventory' AS note
FROM t_cand c JOIN t_invs i ON i.fc = c.code
WHERE NOT EXISTS (SELECT 1 FROM t_fm fm WHERE fm.oc_id = c.oc_id)
GROUP BY c.oc_id, c.parsed, c.code
HAVING count(*) = 1;

-- c) опис marker: strip trailing (ОПИС)/ОПИСЬ/ОПИС, remainder must end in a digit
INSERT INTO t_im (oc_id, parsed, code, inventory_id, note)
SELECT c.oc_id, c.parsed, x.stripped, (array_agg(i.id))[1],
       'L2 FS ref: опис marker -> inventory'
FROM t_cand c
CROSS JOIN LATERAL (
  SELECT regexp_replace(c.code, '-?\(?ОПИСЬ?\)?$', '') AS stripped
) x
JOIN t_invs i ON i.fc = x.stripped
WHERE c.code ~ '\(?ОПИСЬ?\)?$' AND x.stripped ~ '\d$'
  AND NOT EXISTS (SELECT 1 FROM t_fm fm WHERE fm.oc_id = c.oc_id)
  AND NOT EXISTS (SELECT 1 FROM t_im im WHERE im.oc_id = c.oc_id)
GROUP BY c.oc_id, c.parsed, x.stripped
HAVING count(*) = 1;

-- d) справи-range фонд-опис-start-end (end > start) -> inventory
INSERT INTO t_im (oc_id, parsed, code, inventory_id, note)
SELECT c.oc_id, c.parsed, m[1], (array_agg(i.id))[1],
       'L2 FS ref: справи-range ' || m[2] || '-' || m[3] || ' -> inventory'
FROM t_cand c
CROSS JOIN LATERAL (
  SELECT regexp_match(c.code,
    '^([^-]+-[РПН]?\d+[А-ЯІЇЄҐ]{0,2}-\d+[А-ЯІЇЄҐ]{0,2})-(\d+)-(\d+)$') AS m
) x(m)
JOIN t_invs i ON i.fc = m[1]
WHERE m IS NOT NULL AND m[3]::int > m[2]::int
  AND NOT EXISTS (SELECT 1 FROM t_fm fm WHERE fm.oc_id = c.oc_id)
  AND NOT EXISTS (SELECT 1 FROM t_im im WHERE im.oc_id = c.oc_id)
GROUP BY c.oc_id, c.parsed, m
HAVING count(*) = 1;

WITH ins AS (
  INSERT INTO file_actions (created_by, type, note, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy',
         'L2 FS ref: ref = full_code', oc_id, file_id
  FROM t_fm
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file actions created' AS step, count(*) FROM ins;

WITH ins AS (
  INSERT INTO inventory_actions (created_by, type, note, online_copy_id, inventory_id)
  SELECT :'who', 'connect_to_online_copy', note, oc_id, inventory_id
  FROM t_im
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'inventory actions created' AS step, count(*) FROM ins;

\copy (SELECT fm.oc_id, fm.parsed, f.full_code AS target FROM t_fm fm JOIN files f ON fm.file_id = f.id ORDER BY f.full_code) TO 'audit/l2-file-actions.csv' CSV HEADER
\copy (SELECT im.oc_id, im.parsed, im.code AS target, im.note FROM t_im im ORDER BY im.code) TO 'audit/l2-inventory-actions.csv' CSV HEADER

SELECT 'candidates (non-empty ref)' AS what, count(*) FROM t_cand
UNION ALL SELECT 'file matches', count(*) FROM t_fm
UNION ALL SELECT 'inventory matches (b+c+d)', count(*) FROM t_im;

COMMIT;
