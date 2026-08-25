-- L1: plain (non-FamilySearch) parsed that equals exactly one files.full_code
-- or one combined inventory code (archive-fond-inventory), after fold/norm2.
-- Creates PENDING file_actions / inventory_actions (type connect_to_online_copy)
-- for review in the editor. Nothing is linked here.
-- Run from this folder: psql … -f 01-l1-exact-actions.sql
\set ON_ERROR_STOP on
\set who 'script:2026-08-25-l1-exact'

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

-- eligible: unlinked, plain parsed, not ЦДНТА, no pending connect action yet
CREATE TEMP TABLE t_cand AS
SELECT oc.id AS oc_id, oc.parsed, pg_temp.norm2(oc.parsed) AS code
FROM online_copies oc
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed NOT LIKE '%+++%'
  AND btrim(oc.parsed) <> ''
  AND oc.parsed NOT LIKE 'ЦДНТА%'
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

-- exactly one file with this full_code
CREATE TEMP TABLE t_fm AS
SELECT c.oc_id, c.parsed, c.code, (array_agg(f.id))[1] AS file_id
FROM t_cand c JOIN t_files f ON f.fc = c.code
GROUP BY c.oc_id, c.parsed, c.code
HAVING count(*) = 1;

-- exactly one inventory, and no file matched
CREATE TEMP TABLE t_im AS
SELECT c.oc_id, c.parsed, c.code, (array_agg(i.id))[1] AS inventory_id
FROM t_cand c JOIN t_invs i ON i.fc = c.code
WHERE NOT EXISTS (SELECT 1 FROM t_fm fm WHERE fm.oc_id = c.oc_id)
GROUP BY c.oc_id, c.parsed, c.code
HAVING count(*) = 1;

WITH ins AS (
  INSERT INTO file_actions (created_by, type, note, online_copy_id, file_id)
  SELECT :'who', 'connect_to_online_copy',
         'L1 exact: parsed = full_code', oc_id, file_id
  FROM t_fm
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'file actions created' AS step, count(*) FROM ins;

WITH ins AS (
  INSERT INTO inventory_actions (created_by, type, note, online_copy_id, inventory_id)
  SELECT :'who', 'connect_to_online_copy',
         'L1 exact: parsed = archive-fond-inventory', oc_id, inventory_id
  FROM t_im
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT 'inventory actions created' AS step, count(*) FROM ins;

\copy (SELECT fm.oc_id, fm.parsed, f.full_code AS target FROM t_fm fm JOIN files f ON fm.file_id = f.id ORDER BY f.full_code) TO 'audit/l1-file-actions.csv' CSV HEADER
\copy (SELECT im.oc_id, im.parsed, im.code AS target FROM t_im im ORDER BY im.code) TO 'audit/l1-inventory-actions.csv' CSV HEADER

SELECT 'candidates' AS what, count(*) FROM t_cand
UNION ALL SELECT 'file matches', count(*) FROM t_fm
UNION ALL SELECT 'inventory matches', count(*) FROM t_im;

COMMIT;
