\set ON_ERROR_STOP on
SET statement_timeout = '600s';

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.norm2(p text) RETURNS text AS $$
  SELECT regexp_replace(
           regexp_replace(pg_temp.fold($1), '^([^-]+)-([РП])-', '\1-\2'),
           '-([А-ЯЄІЇҐA-Z])$', '\1');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.code(p text) RETURNS text AS $$
  SELECT CASE WHEN $1 LIKE '%-(%'
    THEN split_part($1, '-(', 1) || '-' ||
         btrim(split_part(regexp_replace($1, '^[^(]*\(', ''), '+++', 1))
    ELSE $1 END;
$$ LANGUAGE sql IMMUTABLE;

-- Unlinked copies whose parsed carries a strict fond-inventory-file code
-- AND whose fond already exists in the catalog (tiers 1+2 only).
CREATE TEMP TABLE cand AS
SELECT u.id AS copy_id, u.parsed, u.resource_id,
       a.id AS archive_id, a.code AS arch_code,
       fo.id AS fond_id, fo.code AS fond_code,
       split_part(u.ncode,'-',3) AS inv_code,
       split_part(u.ncode,'-',4) AS file_code
FROM (
  SELECT oc.id, oc.parsed, oc.resource_id, pg_temp.norm2(pg_temp.code(oc.parsed)) AS ncode
  FROM online_copies oc
  WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL
    AND pg_temp.code(oc.parsed) ~ ('^' || split_part(pg_temp.code(oc.parsed),'-',1) ||
        '-[РПA-ZА-Я]?-?[0-9]+[А-ЯЄІЇҐA-Zа-яєіїґa-z]?-[0-9А-ЯЄІЇҐA-Zа-яєіїґa-z]+-[0-9]+[А-ЯЄІЇҐA-Zа-яєіїґa-z]?$')
) u
JOIN archives a ON pg_temp.fold(a.code) = split_part(u.ncode,'-',1)
JOIN fonds fo ON fo.archive_id = a.id AND pg_temp.fold(fo.code) = split_part(u.ncode,'-',2);

SELECT count(*) AS tier12_copies, count(DISTINCT (fond_id, inv_code)) AS branches FROM cand;

BEGIN;

-- 1. create missing inventories (codes come out of norm2 already folded/uppercase)
CREATE TEMP TABLE new_inventories AS
WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT c.inv_code, c.fond_id
  FROM cand c
  WHERE NOT EXISTS (
    SELECT 1 FROM inventories i
    WHERE i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code
  )
  RETURNING id, code, fond_id
) SELECT * FROM ins;

-- 2. resolve every candidate's inventory (pre-existing or just created)
CREATE TEMP TABLE cand_inv AS
SELECT c.*, i.id AS inventory_id, i.code AS real_inv_code
FROM cand c
JOIN inventories i ON i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code;

-- every candidate must resolve to exactly one inventory
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT copy_id FROM cand_inv GROUP BY 1 HAVING count(*) > 1) x;
  IF bad > 0 THEN RAISE EXCEPTION 'copies resolving to multiple inventories: %', bad; END IF;
  SELECT (SELECT count(*) FROM cand) - (SELECT count(*) FROM cand_inv) INTO bad;
  IF bad <> 0 THEN RAISE EXCEPTION 'copies that lost their inventory: %', bad; END IF;
END $$;

-- 3. create missing files; full_code built from real catalog codes
CREATE TEMP TABLE new_files AS
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT c.file_code,
         c.arch_code || '-' || c.fond_code || '-' || c.real_inv_code || '-' || c.file_code,
         c.inventory_id
  FROM cand_inv c
  WHERE NOT EXISTS (
    SELECT 1 FROM files f
    WHERE f.inventory_id = c.inventory_id AND pg_temp.fold(f.code) = c.file_code
  )
  RETURNING id, code, full_code, inventory_id
) SELECT * FROM ins;

-- 4. link
CREATE TEMP TABLE linkmap AS
SELECT c.copy_id, c.parsed, f.id AS file_id, f.full_code
FROM cand_inv c
JOIN files f ON f.inventory_id = c.inventory_id AND pg_temp.fold(f.code) = c.file_code;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT copy_id FROM linkmap GROUP BY 1 HAVING count(*) > 1) x;
  IF bad > 0 THEN RAISE EXCEPTION 'copies resolving to multiple files: %', bad; END IF;
END $$;

UPDATE online_copies o
SET file_id = m.file_id, updated_at = now()
FROM linkmap m
WHERE o.id = m.copy_id;

COMMIT;

SELECT (SELECT count(*) FROM new_inventories) AS inventories_created,
       (SELECT count(*) FROM new_files)       AS files_created,
       (SELECT count(*) FROM linkmap)         AS copies_linked;

\copy (SELECT copy_id, parsed, full_code, file_id FROM linkmap ORDER BY full_code) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/tier12-map.csv' CSV HEADER
\copy (SELECT ord, stmt FROM ( SELECT 0 AS ord, 'BEGIN;' AS stmt UNION ALL SELECT 1, 'UPDATE online_copies SET file_id = NULL WHERE id = '''||copy_id||''';' FROM linkmap UNION ALL SELECT 2, 'DELETE FROM files WHERE id = '''||id||''';' FROM new_files UNION ALL SELECT 3, 'DELETE FROM inventories WHERE id = '''||id||''';' FROM new_inventories UNION ALL SELECT 4, 'COMMIT;' ) s ORDER BY ord) TO PROGRAM 'cut -f2 > /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rollback-tier12.sql'
