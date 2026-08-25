-- L5: custom parsers for the rest.
-- FS blobs with EMPTY ref and a non-Volume title:
--   p1  "Ф. <f>, о. <o>, д./спр./ЕХ <s>"  (commas; covers ДАХО ЕХ/Ekh)  -> file
--   p2  "Ф. <f>-<o>/<s>"                  (ДАСО/ДААРК style)            -> file
--   p3  "<f>-<o>/<s>" at title start      (ДАТО style)                  -> file
--   p4  "фонд <f>, опис(ь) <o>, дела X-Y" / "Ведомость фонда <f>, опись <o>" -> inventory
-- Plain parsed:
--   p5  ARCHIUM "АРХ-<f>-<o> том N-<s>"   (ДАЛО)                        -> file
-- Creates PENDING actions only; every candidate must hit exactly one target.
-- Run from this folder: psql … -f 04-l5-custom-actions.sql
\set ON_ERROR_STOP on
\set who 'script:2026-08-25-l5-custom'

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
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

-- FS empty-ref, non-Volume, titled candidates
-- (staged: cheap filters first, regex extraction on the materialized subset)
CREATE TEMP TABLE t_raw AS
SELECT oc.id AS oc_id, oc.parsed,
       (regexp_match(oc.parsed, '^([^-]+)-\((.*)\)$')) AS m
FROM online_copies oc
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed LIKE '%+++%'
  AND oc.parsed NOT LIKE 'ЦДНТА%'
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

CREATE TEMP TABLE t_t AS
SELECT r.oc_id, r.parsed, r.m[1] AS arch,
       btrim(split_part(r.m[2], '+++', 3)) AS title
FROM t_raw r
WHERE r.m IS NOT NULL
  AND btrim(split_part(r.m[2], '+++', 1)) = ''
  AND btrim(split_part(r.m[2], '+++', 3)) <> ''
  AND split_part(r.m[2], '+++', 3) !~* '(Volume|Vol\.?)\s+\d';

-- p1..p3: file-level parses, first matching pattern wins
CREATE TEMP TABLE t_parse AS
SELECT DISTINCT ON (oc_id) oc_id, parsed, arch, pat, fond, opys, sprava
FROM (
  SELECT t.oc_id, t.parsed, t.arch, 'p1 Ф,о,д' AS pat, 1 AS prio,
         m[1] AS fond, m[2] AS opys, m[3] AS sprava
  FROM t_t t
  CROSS JOIN LATERAL (
    SELECT regexp_match(t.title,
      'Ф\.?\s*(\d+[А-Яа-яA-Za-z]?)\s*,\s*[оo]\.?\s*(\d+[А-Яа-яA-Za-z]?)\s*,\s*(?:д|дело|спр|ЕХ|Ekh)\.?\s*(\d+[А-Яа-яA-Za-z]?)', 'i') AS m
  ) x(m) WHERE m IS NOT NULL
  UNION ALL
  SELECT t.oc_id, t.parsed, t.arch, 'p2 Ф f-o/s', 2,
         m[1], m[2], m[3]
  FROM t_t t
  CROSS JOIN LATERAL (
    SELECT regexp_match(t.title,
      'Ф\.?\s*(\d+[А-Яа-яA-Za-z]?)\s*-\s*(\d+[А-Яа-яA-Za-z]?)\s*/\s*(\d+[А-Яа-яA-Za-z]?)', 'i') AS m
  ) x(m) WHERE m IS NOT NULL
  UNION ALL
  SELECT t.oc_id, t.parsed, t.arch, 'p3 bare f-o/s', 3,
         m[1], m[2], m[3]
  FROM t_t t
  CROSS JOIN LATERAL (
    SELECT regexp_match(t.title,
      '^(\d+[А-Яа-яA-Za-z]?)-(\d+[А-Яа-яA-Za-z]?)/(\d+[А-Яа-яA-Za-z]?)\M') AS m
  ) x(m) WHERE m IS NOT NULL
) u
ORDER BY oc_id, prio;

CREATE TEMP TABLE t_fm AS
SELECT p.oc_id, p.parsed, p.pat,
       pg_temp.fold(p.arch || '-' || p.fond || '-' || p.opys || '-' || p.sprava) AS code,
       (array_agg(f.id))[1] AS file_id
FROM t_parse p
JOIN t_files f ON f.fc = pg_temp.fold(p.arch || '-' || p.fond || '-' || p.opys || '-' || p.sprava)
GROUP BY p.oc_id, p.parsed, p.pat, code
HAVING count(*) = 1;

-- p4: опис-level parses -> inventory
CREATE TEMP TABLE t_im AS
SELECT p.oc_id, p.parsed, p.code, (array_agg(i.id))[1] AS inventory_id
FROM (
  SELECT t.oc_id, t.parsed,
         pg_temp.fold(t.arch || '-' || m[1] || '-' || m[2]) AS code
  FROM t_t t
  CROSS JOIN LATERAL (
    SELECT regexp_match(t.title,
      'фонд[а]?\s+(\d+[А-Яа-яA-Za-z]?)\s*,\s*опис[ьи]?\s+(\d+[А-Яа-яA-Za-z]?)', 'i') AS m
  ) x(m)
  WHERE m IS NOT NULL
    AND t.title ~* '(дел[аи]?\s*\d+\s*[-–]\s*\d+|ведомость|опись|опис:)'
    AND NOT EXISTS (SELECT 1 FROM t_parse tp
                    JOIN t_fm fm ON fm.oc_id = tp.oc_id WHERE tp.oc_id = t.oc_id)
) p
JOIN t_invs i ON i.fc = p.code
GROUP BY p.oc_id, p.parsed, p.code
HAVING count(*) = 1;

-- p5: ARCHIUM "АРХ-ф-о том N-с" (plain parsed)
CREATE TEMP TABLE t_tom AS
SELECT oc.id AS oc_id, oc.parsed,
       pg_temp.fold(m[1] || '-' || m[2] || '-' || m[3] || '-' || m[4]) AS code
FROM online_copies oc
CROSS JOIN LATERAL (
  SELECT regexp_match(oc.parsed,
    '^([^-]+)-(\d+[А-Яа-яA-Za-z]?)-(\d+[А-Яа-яA-Za-z]?)\s+том\s+\d+-(\d+[А-Яа-яA-Za-z]?)$', 'i') AS m
) x(m)
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed NOT LIKE '%+++%'
  AND m IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

CREATE TEMP TABLE t_fm2 AS
SELECT t.oc_id, t.parsed, t.code, (array_agg(f.id))[1] AS file_id
FROM t_tom t JOIN t_files f ON f.fc = t.code
GROUP BY t.oc_id, t.parsed, t.code
HAVING count(*) = 1;

WITH ins AS (
  INSERT INTO file_actions (created_by, type, note, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy', 'L5 ' || pat || ' -> file', oc_id, file_id
  FROM t_fm
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file actions created (p1-p3)' AS step, count(*) FROM ins;

WITH ins AS (
  INSERT INTO inventory_actions (created_by, type, note, online_copy_id, inventory_id)
  SELECT :'who', 'connect_to_online_copy', 'L5 p4 фонд/опис -> inventory', oc_id, inventory_id
  FROM t_im
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'inventory actions created (p4)' AS step, count(*) FROM ins;

WITH ins AS (
  INSERT INTO file_actions (created_by, type, note, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy', 'L5 p5 том -> file', oc_id, file_id
  FROM t_fm2
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file actions created (p5)' AS step, count(*) FROM ins;

\copy (SELECT fm.oc_id, fm.parsed, fm.pat, f.full_code AS target FROM t_fm fm JOIN files f ON fm.file_id = f.id ORDER BY fm.pat, f.full_code) TO 'audit/l5-file-actions.csv' CSV HEADER
\copy (SELECT im.oc_id, im.parsed, im.code AS target FROM t_im im ORDER BY im.code) TO 'audit/l5-inventory-actions.csv' CSV HEADER
\copy (SELECT fm.oc_id, fm.parsed, f.full_code AS target FROM t_fm2 fm JOIN files f ON fm.file_id = f.id ORDER BY f.full_code) TO 'audit/l5-tom-file-actions.csv' CSV HEADER

SELECT 'titled non-Volume candidates' AS what, count(*) FROM t_t
UNION ALL SELECT 'p1-p3 parsed', count(*) FROM t_parse
UNION ALL SELECT 'p1-p3 file matches', count(*) FROM t_fm
UNION ALL SELECT 'p4 inventory matches', count(*) FROM t_im
UNION ALL SELECT 'p5 том file matches', count(*) FROM t_fm2;

COMMIT;
