-- L4: FamilySearch blobs with EMPTY ref whose title carries a Volume pattern:
--   "Volume <фонд>-<опис>/<справа> …"   (e.g. Volume 201-4A/4833 Deaths 1835-1861)
-- Rules:
--   - exactly one Volume occurrence, no справа-range -> file action (unique file match)
--   - справа-range (…/484-485) or several Volume occurrences -> inventory action,
--     when all occurrences agree on one фонд-опис (range convention -> inventory)
-- Creates PENDING actions only.
-- Run from this folder: psql … -f 03-l4-volume-actions.sql
\set ON_ERROR_STOP on
\set who 'script:2026-08-25-l4-volume'

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

-- eligible: unlinked FS blob, empty ref, Volume/Vol title, no pending action
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

CREATE TEMP TABLE t_vol AS
SELECT r.oc_id, r.parsed, r.m[1] AS arch,
       btrim(split_part(r.m[2], '+++', 3)) AS title
FROM t_raw r
WHERE r.m IS NOT NULL
  AND btrim(split_part(r.m[2], '+++', 1)) = ''
  AND split_part(r.m[2], '+++', 3) ~* '(Volume|Vol\.?)\s+\d';

-- all Volume occurrences per copy: fond, opys, sprava, optional range end
CREATE TEMP TABLE t_occ AS
SELECT v.oc_id, v.parsed, v.arch,
       m[1] AS fond, m[2] AS opys, m[3] AS sprava, m[4] AS range_end
FROM t_vol v
CROSS JOIN LATERAL regexp_matches(v.title,
  '(?:Volume|Vol\.?)\s+(\d+)-([0-9A-Za-zА-ЯІЇЄҐа-яіїєґ]+)/(\d+[A-Za-zА-Яа-я]?)(?:-(\d+))?', 'gi') AS m;

CREATE TEMP TABLE t_agg AS
SELECT oc_id, parsed, arch,
       count(*) AS n_occ,
       count(DISTINCT (fond, opys)) AS n_inv,
       bool_or(range_end IS NOT NULL) AS has_range,
       min(fond) AS fond, min(opys) AS opys, min(sprava) AS sprava
FROM t_occ
GROUP BY oc_id, parsed, arch;

-- single volume, no range -> file
CREATE TEMP TABLE t_fm AS
SELECT a.oc_id, a.parsed,
       pg_temp.fold(a.arch || '-' || a.fond || '-' || a.opys || '-' || a.sprava) AS code,
       (array_agg(f.id))[1] AS file_id
FROM t_agg a
JOIN t_files f ON f.fc = pg_temp.fold(a.arch || '-' || a.fond || '-' || a.opys || '-' || a.sprava)
WHERE a.n_occ = 1 AND NOT a.has_range
GROUP BY a.oc_id, a.parsed, code
HAVING count(*) = 1;

-- range or multiple volumes agreeing on one фонд-опис -> inventory
CREATE TEMP TABLE t_im AS
SELECT a.oc_id, a.parsed,
       pg_temp.fold(a.arch || '-' || a.fond || '-' || a.opys) AS code,
       (array_agg(i.id))[1] AS inventory_id
FROM t_agg a
JOIN t_invs i ON i.fc = pg_temp.fold(a.arch || '-' || a.fond || '-' || a.opys)
WHERE (a.n_occ > 1 OR a.has_range) AND a.n_inv = 1
GROUP BY a.oc_id, a.parsed, code
HAVING count(*) = 1;

WITH ins AS (
  INSERT INTO file_actions (created_by, type, note, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy',
         'L4 Volume title -> file', oc_id, file_id
  FROM t_fm
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file actions created' AS step, count(*) FROM ins;

WITH ins AS (
  INSERT INTO inventory_actions (created_by, type, note, online_copy_id, inventory_id)
  SELECT :'who', 'connect_to_online_copy',
         'L4 Volume title (range/multi) -> inventory', oc_id, inventory_id
  FROM t_im
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'inventory actions created' AS step, count(*) FROM ins;

\copy (SELECT fm.oc_id, fm.parsed, f.full_code AS target FROM t_fm fm JOIN files f ON fm.file_id = f.id ORDER BY f.full_code) TO 'audit/l4-file-actions.csv' CSV HEADER
\copy (SELECT im.oc_id, im.parsed, im.code AS target FROM t_im im ORDER BY im.code) TO 'audit/l4-inventory-actions.csv' CSV HEADER

SELECT 'volume-titled candidates' AS what, count(*) FROM t_vol
UNION ALL SELECT 'file matches', count(*) FROM t_fm
UNION ALL SELECT 'inventory matches', count(*) FROM t_im;

COMMIT;
