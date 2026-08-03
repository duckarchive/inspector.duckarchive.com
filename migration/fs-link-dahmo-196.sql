-- Link the ~20.7k unlinked ДАХмО FamilySearch copies referencing fond 196
-- («Подільська палата цивільного суду») by creating its описи + files.
-- Data-owner decision 2026-07-31: target fond = 196, NOT Р196 (Р196 title is
-- scraper junk «** ../Р-1788/» — left untouched here).
--
-- Investigated state (2026-07-31): all candidate copies parse as composite
-- 'ДАХмО-(raw1+++raw2+++raw3)' with raw1=raw2, raw1 = '196-<опис>-<справа>'
-- (3 segments, 100%); описи 1..15 + 6д; ~85 справи carry lowercase а/б
-- suffixes (→ uppercase per catalog convention); 0 duplicate (parsed,url)
-- pairs; fond 196 exists with 0 описи; no ДАХмО-196-* files exist.
-- Conventions follow the FS bucket-2 create+link wave (mig_fs_created_invs):
-- NULL titles, full_code from entity codes, in-txn dup/consistency asserts.
-- Audit table mig_fs_link_dahmo196 is kept permanently (kind: inventory/file/
-- copy/skip) — full rollback path: NULL copy file_ids, delete created files,
-- delete created описи. Idempotent: re-run stages 0 rows.

BEGIN;

-- ─── 1. stage + normalize ───
CREATE TEMP TABLE raw_stage AS
SELECT c.id AS copy_id, c.parsed,
  trim(split_part(regexp_replace(c.parsed, '^ДАХмО-\((.*)\)$', '\1'), '+++', 1)) AS raw1,
  trim(split_part(regexp_replace(c.parsed, '^ДАХмО-\((.*)\)$', '\1'), '+++', 2)) AS raw2
FROM file_online_copies c
JOIN resources r ON r.id = c.resource_id
WHERE c.file_id IS NULL AND r.title = 'FamilySearch'
  AND (c.parsed LIKE 'ДАХмО-(196-%' OR c.parsed LIKE 'ДАХмО-( 196-%');

CREATE TEMP TABLE stage AS
SELECT copy_id, parsed,
  upper(split_part(raw1, '-', 2)) AS inv_code,
  upper(split_part(raw1, '-', 3)) AS file_code
FROM raw_stage
WHERE raw1 = raw2
  AND array_length(string_to_array(raw1, '-'), 1) = 3
  AND upper(split_part(raw1, '-', 2)) ~ '^[0-9]+[А-ЯІЇЄҐ]?$'
  AND upper(split_part(raw1, '-', 3)) ~ '^[0-9]+[А-ЯІЇЄҐ]?$';

-- ─── 2. audit table + skips ───
CREATE TABLE IF NOT EXISTS mig_fs_link_dahmo196 (
  kind text, id uuid, full_code text, note text, at timestamp DEFAULT now());

INSERT INTO mig_fs_link_dahmo196 (kind, id, full_code, note)
SELECT 'skip', r.copy_id, r.parsed, 'failed raw1=raw2 / 3-segment / code-shape gate'
FROM raw_stage r WHERE r.copy_id NOT IN (SELECT copy_id FROM stage);

-- ─── 3. guards ───
DO $$
DECLARE fid uuid; bad int;
BEGIN
  SELECT f.id INTO fid FROM fonds f JOIN archives a ON a.id = f.archive_id
  WHERE a.code = 'ДАХмО' AND f.code = '196';
  IF fid IS NULL THEN RAISE EXCEPTION 'fond ДАХмО-196 not found'; END IF;

  SELECT count(*) INTO bad FROM inventories i WHERE i.fond_id = fid;
  IF bad <> 0 THEN RAISE EXCEPTION 'fond 196 already has % описи — re-inspect before running', bad; END IF;

  SELECT count(*) INTO bad FROM files WHERE full_code LIKE 'ДАХмО-196-%';
  IF bad <> 0 THEN RAISE EXCEPTION '% ДАХмО-196 files already exist', bad; END IF;

  SELECT count(*) INTO bad FROM stage;
  IF bad < 20000 THEN RAISE EXCEPTION 'only % staged (expected ~20.7k) — scope drifted', bad; END IF;

  SELECT count(*) INTO bad FROM (
    SELECT c.parsed, c.url FROM stage s JOIN file_online_copies c ON c.id = s.copy_id
    GROUP BY 1, 2 HAVING count(*) > 1) x;
  IF bad <> 0 THEN RAISE EXCEPTION '% dup parsed+url pairs', bad; END IF;
  RAISE NOTICE 'guards OK: % staged, % skipped', (SELECT count(*) FROM stage), (SELECT count(*) FROM raw_stage) - (SELECT count(*) FROM stage);
END $$;

-- ─── 4. create описи ───
CREATE TEMP TABLE new_invs AS
SELECT inv_code, gen_random_uuid() AS id
FROM (SELECT DISTINCT inv_code FROM stage) d;

INSERT INTO inventories (id, code, fond_id, updated_at)
SELECT ni.id, ni.inv_code, f.id, now()
FROM new_invs ni, fonds f
JOIN archives a ON a.id = f.archive_id
WHERE a.code = 'ДАХмО' AND f.code = '196';

INSERT INTO mig_fs_link_dahmo196 (kind, id, full_code)
SELECT 'inventory', id, 'ДАХмО-196-' || inv_code FROM new_invs;

-- ─── 5. create files ───
CREATE TEMP TABLE new_files AS
SELECT inv_code, file_code, gen_random_uuid() AS id
FROM (SELECT DISTINCT inv_code, file_code FROM stage) d;

INSERT INTO files (id, code, full_code, inventory_id, updated_at)
SELECT nf.id, nf.file_code, 'ДАХмО-196-' || nf.inv_code || '-' || nf.file_code, ni.id, now()
FROM new_files nf JOIN new_invs ni USING (inv_code);

INSERT INTO mig_fs_link_dahmo196 (kind, id, full_code)
SELECT 'file', id, 'ДАХмО-196-' || inv_code || '-' || file_code FROM new_files;

-- ─── 6. link copies ───
UPDATE file_online_copies c
SET file_id = nf.id, updated_at = now()
FROM stage s JOIN new_files nf USING (inv_code, file_code)
WHERE c.id = s.copy_id;

INSERT INTO mig_fs_link_dahmo196 (kind, id, full_code, note)
SELECT 'copy', s.copy_id, 'ДАХмО-196-' || s.inv_code || '-' || s.file_code, s.parsed FROM stage s;

-- ─── 7. verify ───
DO $$
DECLARE bad bigint; linked bigint; staged bigint;
BEGIN
  SELECT count(*) INTO staged FROM stage;
  SELECT count(*) INTO linked FROM file_online_copies c JOIN stage s ON s.copy_id = c.id
  WHERE c.file_id IS NOT NULL;
  IF linked <> staged THEN RAISE EXCEPTION 'linked % of % staged', linked, staged; END IF;

  SELECT count(*) INTO bad FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*) > 1) x;
  IF bad <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', bad; END IF;

  -- created rows consistent with the entity chain
  SELECT count(*) INTO bad FROM files fl
  JOIN inventories i ON i.id = fl.inventory_id
  JOIN fonds f ON f.id = i.fond_id JOIN archives a ON a.id = f.archive_id
  WHERE fl.full_code LIKE 'ДАХмО-196-%'
    AND fl.full_code <> a.code || '-' || f.code || '-' || i.code || '-' || fl.code;
  IF bad <> 0 THEN RAISE EXCEPTION '% inconsistent full_codes', bad; END IF;

  -- Р196 untouched
  SELECT count(*) INTO bad FROM inventories i JOIN fonds f ON f.id = i.fond_id
  JOIN archives a ON a.id = f.archive_id WHERE a.code = 'ДАХмО' AND f.code = 'Р196';
  IF bad <> 0 THEN RAISE EXCEPTION 'Р196 gained % описи', bad; END IF;

  RAISE NOTICE 'verify OK: % описи, % files created, % copies linked',
    (SELECT count(*) FROM new_invs), (SELECT count(*) FROM new_files), staged;
END $$;

SELECT kind, count(*) FROM mig_fs_link_dahmo196 WHERE at >= now() GROUP BY 1 ORDER BY 1;

COMMIT;
