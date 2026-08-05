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

-- Tier 3: strict-code unlinked copies whose FOND is missing from the catalog.
-- Create fond + inventory + file, then link. (Tiers 1/2 covered existing fonds.)
CREATE TEMP TABLE cand AS
SELECT u.id AS copy_id, u.parsed, u.resource_id,
       a.id AS archive_id, a.code AS arch_code,
       split_part(u.ncode,'-',2) AS fond_code,
       split_part(u.ncode,'-',3) AS inv_code,
       split_part(u.ncode,'-',4) AS file_code
FROM (
  SELECT oc.id, oc.parsed, oc.resource_id, pg_temp.norm2(pg_temp.code(oc.parsed)) AS ncode
  FROM online_copies oc
  WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL
    AND pg_temp.code(oc.parsed) ~ ('^' || split_part(pg_temp.code(oc.parsed),'-',1) ||
        '-[РПA-ZА-Я]?-?[0-9]+[А-ЯЄІЇҐA-Zа-яєіїґa-z]?-[0-9А-ЯЄІЇҐA-Zа-яєіїґa-z]+-[0-9]+[А-ЯЄІЇҐA-Zа-яєіїґa-z]?$')
) u
JOIN archives a ON pg_temp.fold(a.code) = split_part(u.ncode,'-',1);

SELECT count(*) AS tier3_copies,
       count(DISTINCT (archive_id, fond_code)) AS fonds_needed,
       count(DISTINCT (archive_id, fond_code, inv_code)) AS branches
FROM cand;

BEGIN;

CREATE TEMP TABLE new_fonds AS
WITH ins AS (
  INSERT INTO fonds (code, archive_id)
  SELECT DISTINCT c.fond_code, c.archive_id
  FROM cand c
  WHERE NOT EXISTS (
    SELECT 1 FROM fonds fo
    WHERE fo.archive_id = c.archive_id AND pg_temp.fold(fo.code) = c.fond_code
  )
  RETURNING id, code, archive_id
) SELECT * FROM ins;

-- resolve fond for every candidate (pre-existing or just created)
CREATE TEMP TABLE cand_f AS
SELECT c.*, fo.id AS fond_id, fo.code AS real_fond_code
FROM cand c
JOIN fonds fo ON fo.archive_id = c.archive_id AND pg_temp.fold(fo.code) = c.fond_code;

CREATE TEMP TABLE new_inventories AS
WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT c.inv_code, c.fond_id
  FROM cand_f c
  WHERE NOT EXISTS (
    SELECT 1 FROM inventories i
    WHERE i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code
  )
  RETURNING id, code, fond_id
) SELECT * FROM ins;

CREATE TEMP TABLE cand_i AS
SELECT c.*, i.id AS inventory_id, i.code AS real_inv_code
FROM cand_f c
JOIN inventories i ON i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (SELECT copy_id FROM cand_i GROUP BY 1 HAVING count(*) > 1) x;
  IF bad > 0 THEN RAISE EXCEPTION 'copies resolving to multiple inventories: %', bad; END IF;
  SELECT (SELECT count(*) FROM cand) - (SELECT count(*) FROM cand_i) INTO bad;
  IF bad <> 0 THEN RAISE EXCEPTION 'copies that lost their branch: %', bad; END IF;
END $$;

CREATE TEMP TABLE new_files AS
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT c.file_code,
         c.arch_code || '-' || c.real_fond_code || '-' || c.real_inv_code || '-' || c.file_code,
         c.inventory_id
  FROM cand_i c
  WHERE NOT EXISTS (
    SELECT 1 FROM files f
    WHERE f.inventory_id = c.inventory_id AND pg_temp.fold(f.code) = c.file_code
  )
  RETURNING id, code, full_code, inventory_id
) SELECT * FROM ins;

CREATE TEMP TABLE linkmap AS
SELECT c.copy_id, c.parsed, c.resource_id, f.id AS file_id, f.full_code
FROM cand_i c
JOIN files f ON f.inventory_id = c.inventory_id AND pg_temp.fold(f.code) = c.file_code;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (SELECT copy_id FROM linkmap GROUP BY 1 HAVING count(*) > 1) x;
  IF bad > 0 THEN RAISE EXCEPTION 'copies resolving to multiple files: %', bad; END IF;
END $$;

-- unique-constraint guard: at most one copy per (resource, parsed, url, file)
CREATE TEMP TABLE apply AS
SELECT DISTINCT ON (oc.resource_id, oc.url, oc.parsed, m.file_id) m.*
FROM linkmap m JOIN online_copies oc ON oc.id = m.copy_id
WHERE NOT EXISTS (
  SELECT 1 FROM online_copies o2
  WHERE o2.resource_id = oc.resource_id AND o2.file_id = m.file_id
    AND o2.parsed = oc.parsed AND o2.url = oc.url AND o2.inventory_id IS NULL);

UPDATE online_copies o
SET file_id = m.file_id, updated_at = now()
FROM apply m
WHERE o.id = m.copy_id;

COMMIT;

SELECT (SELECT count(*) FROM new_fonds)       AS fonds_created,
       (SELECT count(*) FROM new_inventories) AS inventories_created,
       (SELECT count(*) FROM new_files)       AS files_created,
       (SELECT count(*) FROM apply)           AS copies_linked,
       (SELECT count(*) FROM linkmap) - (SELECT count(*) FROM apply) AS dedup_skipped;

\copy (SELECT copy_id, parsed, full_code, file_id FROM apply ORDER BY full_code) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/tier3-map.csv' CSV HEADER
\copy (SELECT ord, stmt FROM ( SELECT 0 AS ord, 'BEGIN;' AS stmt UNION ALL SELECT 1, 'UPDATE online_copies SET file_id = NULL WHERE id = '''||copy_id||''';' FROM apply UNION ALL SELECT 2, 'DELETE FROM files WHERE id = '''||id||''';' FROM new_files UNION ALL SELECT 3, 'DELETE FROM inventories WHERE id = '''||id||''';' FROM new_inventories UNION ALL SELECT 4, 'DELETE FROM fonds WHERE id = '''||id||''';' FROM new_fonds UNION ALL SELECT 5, 'COMMIT;' ) s ORDER BY ord) TO PROGRAM 'cut -f2 > /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rollback-tier3.sql'
\copy (SELECT m.copy_id, m.parsed, m.full_code FROM linkmap m LEFT JOIN apply a ON a.copy_id = m.copy_id WHERE a.copy_id IS NULL) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/tier3-dedup-skipped.csv' CSV HEADER
