\set ON_ERROR_STOP on
SET statement_timeout = '600s';

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;

-- ref: code segment of parsed (FS blob first +++ segment, else parsed sans archive),
-- folded, Р-prefix collapsed onto the fond number
CREATE OR REPLACE FUNCTION pg_temp.ref(p text) RETURNS text AS $$
  SELECT regexp_replace(regexp_replace(pg_temp.fold(
    CASE WHEN p LIKE '%-(%'
      THEN btrim(split_part(regexp_replace(p, '^[^(]*\(', ''), '+++', 1))
      ELSE regexp_replace(p, '^[^-]+-', '') END), E'\n.*', ''), '^([РП]) ?-?', '\1');
$$ LANGUAGE sql IMMUTABLE;

BEGIN;

------------------------------------------------------------------
-- PART A: ЦДНТА deep codes fond-inv-s3-s4[-s5][-letter] -> file fond-inv-s3
-- (validated: 221/221 editor links agree; 4-token codes excluded 36/301)
------------------------------------------------------------------
CREATE TEMP TABLE cd AS
SELECT oc.id AS copy_id, oc.parsed, oc.resource_id, pg_temp.ref(oc.parsed) AS ref
FROM online_copies oc
WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL AND oc.parsed LIKE 'ЦДНТА%'
  AND pg_temp.ref(oc.parsed) ~ '^Р[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+(-[А-Я])?$';

CREATE TEMP TABLE cd_target AS
SELECT DISTINCT split_part(ref,'-',1) AS fond, split_part(ref,'-',2) AS inv, split_part(ref,'-',3) AS s3
FROM cd;

-- create the one missing branch (Р78-3-22): fond, inventory, file if absent
CREATE TEMP TABLE new_fonds AS
WITH ins AS (
  INSERT INTO fonds (code, archive_id)
  SELECT DISTINCT t.fond, a.id FROM cd_target t
  CROSS JOIN (SELECT id FROM archives WHERE code='ЦДНТА') a
  WHERE NOT EXISTS (SELECT 1 FROM fonds fo WHERE fo.archive_id=a.id AND pg_temp.fold(fo.code)=t.fond)
  RETURNING id
) SELECT * FROM ins;

CREATE TEMP TABLE new_inventories AS
WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT t.inv, fo.id FROM cd_target t
  JOIN archives a ON a.code='ЦДНТА'
  JOIN fonds fo ON fo.archive_id=a.id AND pg_temp.fold(fo.code)=t.fond
  WHERE NOT EXISTS (SELECT 1 FROM inventories i WHERE i.fond_id=fo.id AND pg_temp.fold(i.code)=t.inv)
  RETURNING id
) SELECT * FROM ins;

CREATE TEMP TABLE new_files AS
WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT t.s3, 'ЦДНТА-'||fo.code||'-'||i.code||'-'||t.s3, i.id FROM cd_target t
  JOIN archives a ON a.code='ЦДНТА'
  JOIN fonds fo ON fo.archive_id=a.id AND pg_temp.fold(fo.code)=t.fond
  JOIN inventories i ON i.fond_id=fo.id AND pg_temp.fold(i.code)=t.inv
  WHERE NOT EXISTS (SELECT 1 FROM files f WHERE f.inventory_id=i.id AND pg_temp.fold(f.code)=t.s3)
  RETURNING id
) SELECT * FROM ins;

CREATE TEMP TABLE cd_map AS
SELECT DISTINCT ON (c.copy_id) c.copy_id, c.parsed, f.id AS file_id, f.full_code
FROM cd c
JOIN archives a ON a.code='ЦДНТА'
JOIN fonds fo ON fo.archive_id=a.id AND pg_temp.fold(fo.code)=split_part(c.ref,'-',1)
JOIN inventories i ON i.fond_id=fo.id AND pg_temp.fold(i.code)=split_part(c.ref,'-',2)
JOIN files f ON f.inventory_id=i.id AND pg_temp.fold(f.code)=split_part(c.ref,'-',3);

------------------------------------------------------------------
-- PART B: genuine file ranges fond-inv[-тN]-start-end (end>start) -> inventory
-- (non-ЦДНТА only; ЦДНТА 4-token lookalikes are FS renumbered справи, skipped)
------------------------------------------------------------------
CREATE TEMP TABLE rg AS
SELECT oc.id AS copy_id, oc.parsed, oc.resource_id,
       split_part(oc.parsed, CASE WHEN oc.parsed LIKE '%-(%' THEN '-(' ELSE '-' END, 1) AS arch,
       pg_temp.ref(oc.parsed) AS ref
FROM online_copies oc
WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL AND oc.parsed NOT LIKE 'ЦДНТА%'
  AND pg_temp.ref(oc.parsed) ~ '^[РП]?[0-9]+[А-Я]?-[0-9]+[А-Я]?(-[Т][0-9]+)?-[0-9]+-[0-9]+[А-Я]?(-[А-Я])*$'
  AND (regexp_match(pg_temp.ref(oc.parsed), '-([0-9]+)-([0-9]+)[А-Я]?(-[А-Я])*$'))[2]::bigint
    > (regexp_match(pg_temp.ref(oc.parsed), '-([0-9]+)-([0-9]+)[А-Я]?(-[А-Я])*$'))[1]::bigint;

CREATE TEMP TABLE rg_map AS
SELECT DISTINCT ON (r.copy_id) r.copy_id, r.parsed, i.id AS inventory_id,
       a.code||'-'||fo.code||'-'||i.code AS inv_full_code
FROM rg r
JOIN archives a ON pg_temp.fold(a.code)=pg_temp.fold(r.arch)
JOIN fonds fo ON fo.archive_id=a.id AND pg_temp.fold(fo.code)=split_part(r.ref,'-',1)
JOIN inventories i ON i.fond_id=fo.id AND pg_temp.fold(i.code)=split_part(r.ref,'-',2);

------------------------------------------------------------------
-- guards + apply
------------------------------------------------------------------
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM cd_map c JOIN rg_map r USING (copy_id);
  IF bad > 0 THEN RAISE EXCEPTION 'copy in both maps: %', bad; END IF;
END $$;

-- avoid unique-constraint collisions: identical (resource,parsed,url,target) rows
CREATE TEMP TABLE cd_apply AS
SELECT DISTINCT ON (oc.resource_id, oc.url, oc.parsed, m.file_id) m.*
FROM cd_map m JOIN online_copies oc ON oc.id=m.copy_id
WHERE NOT EXISTS (
  SELECT 1 FROM online_copies o2
  WHERE o2.resource_id=oc.resource_id AND o2.file_id=m.file_id
    AND o2.parsed=oc.parsed AND o2.url=oc.url AND o2.inventory_id IS NULL);

CREATE TEMP TABLE rg_apply AS
SELECT DISTINCT ON (oc.resource_id, oc.url, oc.parsed, m.inventory_id) m.*
FROM rg_map m JOIN online_copies oc ON oc.id=m.copy_id
WHERE NOT EXISTS (
  SELECT 1 FROM online_copies o2
  WHERE o2.resource_id=oc.resource_id AND o2.inventory_id=m.inventory_id
    AND o2.parsed=oc.parsed AND o2.url=oc.url AND o2.file_id IS NULL);

UPDATE online_copies o SET file_id = m.file_id, updated_at = now()
FROM cd_apply m WHERE o.id = m.copy_id;

UPDATE online_copies o SET inventory_id = m.inventory_id, updated_at = now()
FROM rg_apply m WHERE o.id = m.copy_id;

COMMIT;

SELECT (SELECT count(*) FROM cd) AS cdnta_candidates,
       (SELECT count(*) FROM cd_apply) AS cdnta_linked_to_files,
       (SELECT count(*) FROM rg) AS range_candidates,
       (SELECT count(*) FROM rg_apply) AS ranges_linked_to_inventories;

\copy (SELECT copy_id, parsed, full_code AS target, file_id AS target_id, 'file' AS kind FROM cd_apply UNION ALL SELECT copy_id, parsed, inv_full_code, inventory_id, 'inventory' FROM rg_apply ORDER BY kind, target) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/ranges-map.csv' CSV HEADER
\copy (SELECT ord, stmt FROM ( SELECT 0 AS ord, 'BEGIN;' AS stmt UNION ALL SELECT 1, 'UPDATE online_copies SET file_id = NULL WHERE id = '''||copy_id||''';' FROM cd_apply UNION ALL SELECT 1, 'UPDATE online_copies SET inventory_id = NULL WHERE id = '''||copy_id||''';' FROM rg_apply UNION ALL SELECT 2, 'DELETE FROM files WHERE id = '''||id||''';' FROM new_files UNION ALL SELECT 3, 'DELETE FROM inventories WHERE id = '''||id||''';' FROM new_inventories UNION ALL SELECT 4, 'DELETE FROM fonds WHERE id = '''||id||''';' FROM new_fonds UNION ALL SELECT 5, 'COMMIT;' ) s ORDER BY ord) TO PROGRAM 'cut -f2 > /private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rollback-ranges.sql'
\copy (SELECT c.parsed FROM cd c LEFT JOIN cd_apply a ON a.copy_id=c.copy_id WHERE a.copy_id IS NULL UNION ALL SELECT r.parsed FROM rg r LEFT JOIN rg_apply a2 ON a2.copy_id=r.copy_id WHERE a2.copy_id IS NULL) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/ranges-skipped.csv' CSV HEADER
