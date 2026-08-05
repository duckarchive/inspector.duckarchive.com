\set ON_ERROR_STOP on
SET statement_timeout = '300s';

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.norm2(p text) RETURNS text AS $$
  SELECT regexp_replace(
           regexp_replace(pg_temp.fold($1), '^([^-]+)-([РП])-', '\1-\2'),
           '-([А-ЯЄІЇҐA-Z])$', '\1');
$$ LANGUAGE sql IMMUTABLE;

-- опис-marked copies: the CODE segment itself ends in опис/опись or (опис),
-- meaning the copy is a scan of the inventory register -> link inventory_id.
CREATE TEMP TABLE op AS
SELECT oc.id, oc.parsed, oc.resource_id,
       split_part(oc.parsed,'-(',1) AS arch,
       regexp_replace(btrim(split_part(regexp_replace(oc.parsed,'^[^(]*\(',''),'+++',1)), E'\n.*', '') AS ref
FROM online_copies oc
WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL AND oc.parsed LIKE '%-(%'
  AND btrim(split_part(regexp_replace(oc.parsed,'^[^(]*\(',''),'+++',1)) ~* '([-_ ().]опис[ьи]?|\(опис\))$';

CREATE TEMP TABLE parsed_op AS
SELECT id, parsed, resource_id, arch,
  CASE
    -- A: fond-inv-опис
    WHEN ref ~* '^[РПрп]?-?[0-9]+[а-яa-z]?[-_][0-9А-Яа-яA-Za-z]+[-_ ]опис[ьи]?$'
      THEN regexp_replace(ref, '[-_ ]опис[ьи]?$', '')
    -- B: fond-inv[-тN]-start-end(опис)
    WHEN ref ~* '\(опис\)$' AND ref ~* '^[РПрп]?-?[0-9]+[а-яa-z]?-[0-9]+[а-яa-z]?(-[тТ][0-9]+)?-[0-9]+[а-яa-z]?-[0-9]+[а-яa-z]?-?\(опис\)$'
      THEN (regexp_match(ref, '^([РПрп]?-?[0-9]+[а-яa-z]?-[0-9]+[а-яa-z]?)'))[1]
    -- C: "Ф. N, о./оп./on. M" style
    WHEN ref ~* '^Ф\.? ?[0-9]+, ?(о|оп|on)п?\.? ?[0-9]+'
      THEN (regexp_match(ref, '^Ф\.? ?([0-9]+)'))[1] || '-' || (regexp_match(ref, ', ?(?:о|оп|on)п?\.? ?([0-9]+)'))[1]
  END AS fi
FROM op;

-- resolve fond; keep only rows whose fond exists
CREATE TEMP TABLE cand AS
SELECT p.id AS copy_id, p.parsed, p.resource_id,
       a.code AS arch_code, fo.id AS fond_id, fo.code AS fond_code,
       split_part(pg_temp.norm2('X-'||p.fi),'-',3) AS inv_code
FROM parsed_op p
JOIN archives a ON pg_temp.fold(a.code) = pg_temp.fold(p.arch)
JOIN fonds fo ON fo.archive_id = a.id
             AND pg_temp.fold(fo.code) = split_part(pg_temp.norm2('X-'||p.fi),'-',2)
WHERE p.fi IS NOT NULL;

SELECT (SELECT count(*) FROM op) AS opys_copies,
       (SELECT count(*) FROM cand) AS with_fond,
       (SELECT count(*) FROM parsed_op WHERE fi IS NULL) AS unparseable;

BEGIN;

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

CREATE TEMP TABLE linkmap AS
SELECT c.copy_id, c.parsed, i.id AS inventory_id,
       c.arch_code || '-' || c.fond_code || '-' || i.code AS inv_full_code
FROM cand c
JOIN inventories i ON i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT copy_id FROM linkmap GROUP BY 1 HAVING count(*) > 1) x;
  IF bad > 0 THEN RAISE EXCEPTION 'copies resolving to multiple inventories: %', bad; END IF;
  SELECT (SELECT count(*) FROM cand) - (SELECT count(*) FROM linkmap) INTO bad;
  IF bad <> 0 THEN RAISE EXCEPTION 'copies that lost their inventory: %', bad; END IF;
END $$;

UPDATE online_copies o
SET inventory_id = m.inventory_id, updated_at = now()
FROM linkmap m
WHERE o.id = m.copy_id;

COMMIT;

SELECT (SELECT count(*) FROM new_inventories) AS inventories_created,
       (SELECT count(*) FROM linkmap) AS copies_linked;

\copy (SELECT copy_id, parsed, inv_full_code, inventory_id FROM linkmap ORDER BY inv_full_code) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/opys-map.csv' CSV HEADER
\copy (SELECT ord, stmt FROM ( SELECT 0 AS ord, 'BEGIN;' AS stmt UNION ALL SELECT 1, 'UPDATE online_copies SET inventory_id = NULL WHERE id = '''||copy_id||''';' FROM linkmap UNION ALL SELECT 2, 'DELETE FROM inventories WHERE id = '''||id||''';' FROM new_inventories UNION ALL SELECT 3, 'COMMIT;' ) s ORDER BY ord) TO PROGRAM 'cut -f2 > /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rollback-opys.sql'
\copy (SELECT p.arch, p.parsed FROM parsed_op p WHERE p.fi IS NULL OR NOT EXISTS (SELECT 1 FROM cand c WHERE c.copy_id = p.id) ORDER BY 1) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/opys-skipped.csv' CSV HEADER
