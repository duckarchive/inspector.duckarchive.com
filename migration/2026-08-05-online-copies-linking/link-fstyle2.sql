\set ON_ERROR_STOP on
SET statement_timeout = '300s';

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;

CREATE TEMP TABLE fr AS
SELECT oc.id AS copy_id, oc.parsed, oc.resource_id,
       split_part(oc.parsed,'-(',1) AS arch,
       regexp_replace(btrim(split_part(regexp_replace(oc.parsed,'^[^(]*\(',''),'+++',1)), E'\n.*','') AS ref
FROM online_copies oc
WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL AND oc.parsed LIKE '%-(%'
  AND btrim(split_part(regexp_replace(oc.parsed,'^[^(]*\(',''),'+++',1)) ~* '^Ф\.? ?[0-9]+, ?(о|оп|on|o)п?\.? ?[0-9]+';

CREATE TEMP TABLE pf AS
SELECT copy_id, parsed, resource_id, arch,
  (regexp_match(ref, '^Ф\.? ?([0-9]+)'))[1] AS fond,
  -- inv: digits + optional -letter, but only when the letter is NOT part of a
  -- following word (so 'о. 4-А, т…' -> 4А while 'о. 1-Ekh…' -> 1)
  pg_temp.fold((regexp_match(ref, ', ?(?:о|оп|on|o)п?\.? ?([0-9]+(?:-[А-Яа-яA-Za-z](?![A-Za-zа-яА-Я]))?)'))[1]) AS inv,
  CASE
    -- dash or comma before ЕХ/Ekh/т., optional (part) or letter suffix
    WHEN ref ~* '[,-] ?(ЕХ|[Ee]kh\.?,?|т\.) ?[0-9]+[а-яa-z]?( ?\([0-9]+\))? ?$'
      THEN pg_temp.fold((regexp_match(ref, '[,-] ?(?:ЕХ|[Ee]kh\.?,?|т\.) ?([0-9]+[а-яa-z]?)'))[1])
    -- Opis / bare Ф-о -> inventory level
    WHEN ref ~* '[,-] ?Opis ?$' OR ref ~* '^Ф\.? ?[0-9]+, ?(о|оп|on|o)п?\.? ?[0-9]+[А-Яа-яA-Za-z-]* ?$'
      THEN NULL
    ELSE 'UNPARSED'
  END AS file_code,
  ref
FROM fr;

-- fix inv capture: strip trailing dash, fold '4-А' -> '4А'
UPDATE pf SET inv = regexp_replace(replace(inv,'-',''),'^0+','') WHERE inv IS NOT NULL;

SELECT count(*) AS total,
       count(*) FILTER (WHERE file_code='UNPARSED') AS unparsed,
       count(*) FILTER (WHERE file_code IS NULL) AS to_inventory,
       count(*) FILTER (WHERE file_code IS NOT NULL AND file_code<>'UNPARSED') AS to_file
FROM pf;

BEGIN;

CREATE TEMP TABLE cand AS
SELECT p.copy_id, p.parsed, p.resource_id, p.file_code,
       a.code AS arch_code, fo.id AS fond_id, fo.code AS fond_code, p.inv AS inv_code
FROM pf p
JOIN archives a ON pg_temp.fold(a.code) = pg_temp.fold(p.arch)
JOIN fonds fo ON fo.archive_id = a.id AND pg_temp.fold(fo.code) = p.fond
WHERE p.file_code IS DISTINCT FROM 'UNPARSED' AND p.inv IS NOT NULL AND p.inv <> '';

CREATE TEMP TABLE new_inventories AS
WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT c.inv_code, c.fond_id FROM cand c
  WHERE NOT EXISTS (SELECT 1 FROM inventories i
    WHERE i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code)
  RETURNING id
) SELECT * FROM ins;

CREATE TEMP TABLE cand_i AS
SELECT c.*, i.id AS inventory_id, i.code AS real_inv_code
FROM cand c
JOIN inventories i ON i.fond_id = c.fond_id AND pg_temp.fold(i.code) = c.inv_code;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (SELECT copy_id FROM cand_i GROUP BY 1 HAVING count(*) > 1) x;
  IF bad > 0 THEN RAISE EXCEPTION 'multi-resolution: %', bad; END IF;
END $$;

CREATE TEMP TABLE new_files AS
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT c.file_code,
         c.arch_code || '-' || c.fond_code || '-' || c.real_inv_code || '-' || c.file_code,
         c.inventory_id
  FROM cand_i c
  WHERE c.file_code IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM files f
      WHERE f.inventory_id = c.inventory_id AND pg_temp.fold(f.code) = c.file_code)
  RETURNING id
) SELECT * FROM ins;

CREATE TEMP TABLE apply_f AS
SELECT DISTINCT ON (oc.resource_id, oc.url, oc.parsed, f.id)
       c.copy_id, c.parsed, f.id AS file_id, f.full_code AS target
FROM cand_i c
JOIN files f ON f.inventory_id = c.inventory_id AND pg_temp.fold(f.code) = c.file_code
JOIN online_copies oc ON oc.id = c.copy_id
WHERE c.file_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM online_copies o2
    WHERE o2.resource_id = oc.resource_id AND o2.file_id = f.id
      AND o2.parsed = oc.parsed AND o2.url = oc.url AND o2.inventory_id IS NULL);

CREATE TEMP TABLE apply_i AS
SELECT DISTINCT ON (oc.resource_id, oc.url, oc.parsed, c.inventory_id)
       c.copy_id, c.parsed, c.inventory_id,
       c.arch_code || '-' || c.fond_code || '-' || c.real_inv_code AS target
FROM cand_i c
JOIN online_copies oc ON oc.id = c.copy_id
WHERE c.file_code IS NULL
  AND NOT EXISTS (SELECT 1 FROM online_copies o2
    WHERE o2.resource_id = oc.resource_id AND o2.inventory_id = c.inventory_id
      AND o2.parsed = oc.parsed AND o2.url = oc.url AND o2.file_id IS NULL);

UPDATE online_copies o SET file_id = m.file_id, updated_at = now()
FROM apply_f m WHERE o.id = m.copy_id;

UPDATE online_copies o SET inventory_id = m.inventory_id, updated_at = now()
FROM apply_i m WHERE o.id = m.copy_id;

COMMIT;

SELECT (SELECT count(*) FROM new_inventories) AS inventories_created,
       (SELECT count(*) FROM new_files) AS files_created,
       (SELECT count(*) FROM apply_f) AS linked_to_files,
       (SELECT count(*) FROM apply_i) AS linked_to_inventories;

\copy (SELECT copy_id, parsed, target, 'file' AS kind FROM apply_f UNION ALL SELECT copy_id, parsed, target, 'inventory' FROM apply_i ORDER BY kind, target) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/fstyle2-map.csv' CSV HEADER
\copy (SELECT ord, stmt FROM ( SELECT 0 AS ord, 'BEGIN;' AS stmt UNION ALL SELECT 1, 'UPDATE online_copies SET file_id = NULL WHERE id = '''||copy_id||''';' FROM apply_f UNION ALL SELECT 1, 'UPDATE online_copies SET inventory_id = NULL WHERE id = '''||copy_id||''';' FROM apply_i UNION ALL SELECT 2, 'DELETE FROM files WHERE id = '''||id||''';' FROM new_files UNION ALL SELECT 3, 'DELETE FROM inventories WHERE id = '''||id||''';' FROM new_inventories UNION ALL SELECT 4, 'COMMIT;' ) s ORDER BY ord) TO PROGRAM 'cut -f2 > /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rollback-fstyle2.sql'
\copy (SELECT p.parsed, p.ref FROM pf p LEFT JOIN apply_f a ON a.copy_id=p.copy_id LEFT JOIN apply_i b ON b.copy_id=p.copy_id WHERE a.copy_id IS NULL AND b.copy_id IS NULL) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/fstyle2-skipped.csv' CSV HEADER
