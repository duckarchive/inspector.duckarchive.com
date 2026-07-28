-- FS bucket 2 (2026-07-28, data-owner approved): fond exists, опис absent.
-- Creates описи (NULL title) + files (NULL title, proper-case full_code),
-- links FS copies. Candidates: unlinked FS copies whose raw1=raw2 and raw1
-- parses to fond-опис-справа; fond resolves (case-folded, unambiguous);
-- опис does not exist. Audit: mig_fs_created_invs + mig_fs_create_link.

BEGIN;

CREATE TEMP TABLE fs AS
SELECT foc.id AS copy_id, foc.parsed, foc.url, foc.resource_id,
  substring(foc.parsed from '^([^(]+)-\(') AS arch,
  (string_to_array(substring(foc.parsed from '\((.*)\)$'), '+++')) AS raws
FROM file_online_copies foc JOIN resources r ON r.id=foc.resource_id
WHERE foc.file_id IS NULL AND r.title='FamilySearch' AND foc.parsed IS NOT NULL;

-- NB: dotted опис codes are NOT allowed in the catalog — FS raws like
-- «1вот.» / «1бух.» become описи 1ВОТ / 1БУХ (dots stripped), and existing
-- описи are matched dot-insensitively so no duplicates can be minted.
CREATE TEMP TABLE keyed AS
SELECT copy_id, parsed, url, resource_id, upper(arch) AS uarch,
  coalesce(m[1],'')||m[2] AS fond, replace(m[3], '.', '') AS inv, m[4] AS spr
FROM (
  SELECT fs.*,
    regexp_match(
      regexp_replace(regexp_replace(regexp_replace(regexp_replace(
        regexp_replace(upper(replace(translate(raws[1], '_–—―', '----'), ' ', '')), '\([^)]*\)', '', 'g'),
        '^P','Р'), '^N','П'), '^H','Н'), '-+$', ''),
      '^(ТФ|[РПНФД])?-?(\d+[А-ЯA-Z]{0,4})-(\d+[А-ЯA-Z.]{0,6})-(\d+[А-ЯA-Z]{0,4})$') AS m
  FROM fs
  WHERE raws[1] = raws[2]) x
WHERE m IS NOT NULL;

CREATE TEMP TABLE fond_lookup AS
SELECT upper(a.code) AS uarch, upper(fo.code) AS ufond,
       min(fo.id::text)::uuid AS fond_id, count(*) AS n
FROM fonds fo JOIN archives a ON a.id=fo.archive_id
GROUP BY 1,2;
CREATE INDEX ON fond_lookup (uarch, ufond);

CREATE TEMP TABLE inv_keys AS
SELECT fo.id AS fond_id, replace(upper(i.code), '.', '') AS uinv
FROM inventories i JOIN fonds fo ON fo.id=i.fond_id;
CREATE INDEX ON inv_keys (fond_id, uinv);

CREATE TEMP TABLE b2 AS
SELECT k.*, fl.fond_id
FROM keyed k
JOIN fond_lookup fl ON fl.uarch=k.uarch AND fl.ufond=k.fond AND fl.n=1
WHERE NOT EXISTS (SELECT 1 FROM inv_keys ik WHERE ik.fond_id=fl.fond_id AND ik.uinv=k.inv);

-- create описи
CREATE TEMP TABLE ni AS SELECT DISTINCT fond_id, inv FROM b2;
INSERT INTO inventories (id, code, title, fond_id, updated_at)
SELECT gen_random_uuid(), inv, NULL, fond_id, now() FROM ni;

CREATE TABLE IF NOT EXISTS mig_fs_created_invs (
  full_code text, created_at timestamp DEFAULT now());
INSERT INTO mig_fs_created_invs (full_code)
SELECT a.code||'-'||fo.code||'-'||ni.inv FROM ni
JOIN fonds fo ON fo.id=ni.fond_id JOIN archives a ON a.id=fo.archive_id;

-- create files
CREATE TEMP TABLE nfi AS
SELECT DISTINCT i.id AS inventory_id, b2.spr
FROM b2 JOIN inventories i ON i.fond_id=b2.fond_id AND i.code=b2.inv;
INSERT INTO files (id, code, title, inventory_id, full_code, updated_at)
SELECT gen_random_uuid(), nfi.spr, NULL, nfi.inventory_id,
       a.code||'-'||fo.code||'-'||i.code||'-'||nfi.spr, now()
FROM nfi
JOIN inventories i ON i.id=nfi.inventory_id
JOIN fonds fo ON fo.id=i.fond_id
JOIN archives a ON a.id=fo.archive_id;

-- link
CREATE TEMP TABLE todo AS
SELECT b2.copy_id, b2.parsed, b2.url, b2.resource_id, f.id AS file_id
FROM b2
JOIN inventories i ON i.fond_id=b2.fond_id AND i.code=b2.inv
JOIN files f ON f.inventory_id=i.id AND upper(f.code)=b2.spr;

UPDATE file_online_copies foc SET file_id = t.file_id
FROM todo t WHERE foc.id = t.copy_id
  AND NOT EXISTS (SELECT 1 FROM file_online_copies x
                  WHERE x.resource_id=foc.resource_id AND x.file_id=t.file_id
                    AND x.parsed=foc.parsed AND x.url=foc.url);

INSERT INTO mig_fs_create_link (parsed, url, file_id, file_created)
SELECT t.parsed, t.url, t.file_id, true
FROM todo t JOIN file_online_copies foc ON foc.id=t.copy_id AND foc.file_id=t.file_id;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*)>1) d;
  IF n <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', n; END IF;
  SELECT count(*) INTO n FROM files f
  JOIN inventories i ON i.id=f.inventory_id JOIN fonds fo ON fo.id=i.fond_id JOIN archives a ON a.id=fo.archive_id
  WHERE f.updated_at >= now() - interval '30 minutes'
    AND f.full_code IS DISTINCT FROM a.code||'-'||fo.code||'-'||i.code||'-'||f.code;
  IF n <> 0 THEN RAISE EXCEPTION '% bad full_codes among new files', n; END IF;
END $$;

SELECT (SELECT count(*) FROM b2) AS bucket2_copies,
       (SELECT count(*) FROM ni) AS invs_created,
       (SELECT count(*) FROM nfi) AS files_created,
       (SELECT count(*) FROM file_online_copies WHERE file_id IS NULL) AS still_unlinked;
COMMIT;
