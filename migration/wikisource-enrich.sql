-- Wikisource catalog enrichment — set-based single run (2026-07-29).
-- Input: mig_wiki_stage_{fonds,invs,files,inv_years,file_years} loaded by
-- migration/src/enrich-wikisource.ts (canon codes: upper, dotless описи).
-- Policy: create missing; fill empty titles; OVERRIDE titles only when the
-- existing title is duplicated among siblings (FS-placeholder pattern,
-- data-owner amendment 2026-07-28); years only when entity has none.
-- Audit: mig_wikisource_enrich (level, full_code, action, title, old_title).

BEGIN;

CREATE TABLE IF NOT EXISTS mig_wikisource_enrich (
  level text, full_code text, action text, title text, old_title text,
  applied_at timestamp DEFAULT now());

CREATE TEMP TABLE t_arch AS SELECT id, code, upper(code) AS ucode FROM archives;
CREATE INDEX ON t_arch (ucode);

----------------------------------------------------------------------
-- 0. STAGING GUARDS (2026-07-29, after first-run varchar(20) failure)
----------------------------------------------------------------------
-- 0a. Glued descriptive опис codes (letter run ≥5, no exact DB match) — wiki
--     page names like ЦДІАК-128 «1а. Вотчинні справи» canonicalize into bogus
--     codes (1АВОТЧИННІСПРАВИ) that would duplicate existing short описи
--     (1АВОТ). Skip опис + its files/years; audited for manual mapping.
CREATE TEMP TABLE t_skip_invs AS
SELECT s.arch, s.fond, s.code FROM mig_wiki_stage_invs s
WHERE s.code ~ '[А-ЯҐЄІЇA-Z]{5,}'
  AND NOT EXISTS (SELECT 1 FROM inventories i
    JOIN fonds f ON f.id=i.fond_id JOIN t_arch a ON a.id=f.archive_id
    WHERE a.ucode=upper(s.arch) AND upper(f.code)=s.fond
      AND replace(upper(i.code),'.','')=s.code);
INSERT INTO mig_wikisource_enrich (level, full_code, action)
SELECT 'inventory', arch||'-'||fond||'-'||code, 'skip-glued-code' FROM t_skip_invs;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'file', sf.arch||'-'||sf.fond||'-'||sf.inv||'-'||sf.code, 'skip-glued-inv', sf.title
FROM mig_wiki_stage_files sf JOIN t_skip_invs k ON k.arch=sf.arch AND k.fond=sf.fond AND k.code=sf.inv;
DELETE FROM mig_wiki_stage_files sf USING t_skip_invs k
  WHERE k.arch=sf.arch AND k.fond=sf.fond AND k.code=sf.inv;
DELETE FROM mig_wiki_stage_file_years y USING t_skip_invs k
  WHERE k.arch=y.arch AND k.fond=y.fond AND k.code=y.inv;
DELETE FROM mig_wiki_stage_inv_years y USING t_skip_invs k
  WHERE k.arch=y.arch AND k.fond=y.fond AND k.code=y.code;
DELETE FROM mig_wiki_stage_invs s USING t_skip_invs k
  WHERE k.arch=s.arch AND k.fond=s.fond AND k.code=s.code;

-- 0b. Volume/continuation опис codes (1ТОМ2, 1ПР) fold into the base опис
--     (locked grouping rule; DB-wide том-merge already done): re-point files
--     to the base code, drop the volume опис rows and their years.
CREATE TEMP TABLE t_vol_invs AS
SELECT arch, fond, code, regexp_replace(code,'(ТОМ\d+|ПР)$','') AS base
FROM mig_wiki_stage_invs WHERE code ~ '^\d+(ТОМ\d+|ПР)$';
INSERT INTO mig_wikisource_enrich (level, full_code, action)
SELECT 'inventory', arch||'-'||fond||'-'||code, 'fold-vol-to-'||base FROM t_vol_invs;
UPDATE mig_wiki_stage_files sf SET inv=v.base
FROM t_vol_invs v WHERE sf.arch=v.arch AND sf.fond=v.fond AND sf.inv=v.code;
UPDATE mig_wiki_stage_file_years y SET inv=v.base
FROM t_vol_invs v WHERE y.arch=v.arch AND y.fond=v.fond AND y.inv=v.code;
DELETE FROM mig_wiki_stage_inv_years y USING t_vol_invs v
  WHERE v.arch=y.arch AND v.fond=y.fond AND v.code=y.code;
DELETE FROM mig_wiki_stage_invs s USING t_vol_invs v
  WHERE v.arch=s.arch AND v.fond=s.fond AND v.code=s.code;
-- dedup collisions produced by the fold (prefer the titled row)
DELETE FROM mig_wiki_stage_files a USING mig_wiki_stage_files b
WHERE a.arch=b.arch AND a.fond=b.fond AND a.inv=b.inv AND a.code=b.code
  AND ((coalesce(a.title,'')='' AND coalesce(b.title,'')<>'') OR
       ((coalesce(a.title,'')='')=(coalesce(b.title,'')='') AND a.ctid<b.ctid));

-- 0c. Annotation-glued file codes (181(ДРУГАСПРАВА), 499(ПРОДОВЖЕННЯ)…) → skip
CREATE TEMP TABLE t_skip_files AS
SELECT arch, fond, inv, code, title FROM mig_wiki_stage_files
WHERE code ~ '[А-ЯҐЄІЇA-Z]{5,}' OR length(code)>20;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'file', arch||'-'||fond||'-'||inv||'-'||code, 'skip-glued-code', title FROM t_skip_files;
DELETE FROM mig_wiki_stage_files sf USING t_skip_files k
  WHERE k.arch=sf.arch AND k.fond=sf.fond AND k.inv=sf.inv AND k.code=sf.code;
DELETE FROM mig_wiki_stage_file_years y USING t_skip_files k
  WHERE k.arch=y.arch AND k.fond=y.fond AND k.inv=y.inv AND k.code=y.code;

-- 0d. Hard length guard — nothing >20 chars may reach the varchar(20) columns
DELETE FROM mig_wiki_stage_fonds WHERE length(code)>20;
DELETE FROM mig_wiki_stage_invs WHERE length(code)>20 OR length(fond)>20;
DELETE FROM mig_wiki_stage_files WHERE length(code)>20 OR length(inv)>20 OR length(fond)>20;
DELETE FROM mig_wiki_stage_inv_years WHERE length(code)>20 OR length(fond)>20;
DELETE FROM mig_wiki_stage_file_years WHERE length(code)>20 OR length(inv)>20 OR length(fond)>20;

----------------------------------------------------------------------
-- A. FONDS
----------------------------------------------------------------------
CREATE TEMP TABLE t_fs AS
SELECT a.id AS archive_id, a.code AS arch_code, s.code, nullif(trim(s.title),'') AS title
FROM mig_wiki_stage_fonds s JOIN t_arch a ON a.ucode=upper(s.arch);

CREATE TEMP TABLE t_fond_new AS
SELECT fs.* FROM t_fs fs
WHERE NOT EXISTS (SELECT 1 FROM fonds fo WHERE fo.archive_id=fs.archive_id AND upper(fo.code)=fs.code);
INSERT INTO fonds (id, code, title, archive_id, updated_at)
SELECT gen_random_uuid(), code, title, archive_id, now() FROM t_fond_new;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'fond', arch_code||'-'||code, 'create', title FROM t_fond_new;

CREATE TEMP TABLE t_fond_fill AS
SELECT fo.id, fs.arch_code, fo.code, fs.title
FROM t_fs fs JOIN fonds fo ON fo.archive_id=fs.archive_id AND upper(fo.code)=fs.code
WHERE coalesce(trim(fo.title),'')='' AND fs.title IS NOT NULL;
UPDATE fonds fo SET title=t.title, updated_at=now() FROM t_fond_fill t WHERE fo.id=t.id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'fond', arch_code||'-'||code, 'fill-title', title FROM t_fond_fill;

-- resolved fond map (incl. created)
CREATE TEMP TABLE t_fmap AS
SELECT fo.id AS fond_id, fo.archive_id, fo.code AS fond_code, upper(fo.code) AS ufond, a.code AS arch_code, a.ucode AS uarch
FROM fonds fo JOIN t_arch a ON a.id=fo.archive_id;
CREATE INDEX ON t_fmap (uarch, ufond);

----------------------------------------------------------------------
-- B. INVENTORIES
----------------------------------------------------------------------
CREATE TEMP TABLE t_is AS
SELECT fm.fond_id, fm.arch_code, fm.fond_code, s.code, nullif(trim(s.title),'') AS title
FROM mig_wiki_stage_invs s
JOIN t_fmap fm ON fm.uarch=upper(s.arch) AND fm.ufond=s.fond;

CREATE TEMP TABLE t_imap0 AS
SELECT i.id AS inv_id, i.fond_id, i.code AS inv_code, replace(upper(i.code),'.','') AS uinv, i.title
FROM inventories i WHERE i.fond_id IN (SELECT DISTINCT fond_id FROM t_is);
CREATE INDEX ON t_imap0 (fond_id, uinv);

CREATE TEMP TABLE t_inv_new AS
SELECT ins.* FROM t_is ins
WHERE NOT EXISTS (SELECT 1 FROM t_imap0 im WHERE im.fond_id=ins.fond_id AND im.uinv=ins.code);
INSERT INTO inventories (id, code, title, fond_id, updated_at)
SELECT gen_random_uuid(), code, title, fond_id, now() FROM t_inv_new;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'inventory', arch_code||'-'||fond_code||'-'||code, 'create', title FROM t_inv_new;

CREATE TEMP TABLE t_inv_fill AS
SELECT im.inv_id, ins.arch_code, ins.fond_code, im.inv_code, ins.title
FROM t_is ins JOIN t_imap0 im ON im.fond_id=ins.fond_id AND im.uinv=ins.code
WHERE coalesce(trim(im.title),'')='' AND ins.title IS NOT NULL;
UPDATE inventories i SET title=t.title, updated_at=now() FROM t_inv_fill t WHERE i.id=t.inv_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'inventory', arch_code||'-'||fond_code||'-'||inv_code, 'fill-title', title FROM t_inv_fill;

-- override: existing title duplicated among sibling описи
CREATE TEMP TABLE t_inv_dup AS
SELECT fond_id, title FROM inventories WHERE coalesce(trim(title),'')<>''
GROUP BY 1,2 HAVING count(*)>1;
CREATE TEMP TABLE t_inv_ovr AS
SELECT im.inv_id, ins.arch_code, ins.fond_code, im.inv_code, ins.title, im.title AS old_title
FROM t_is ins JOIN t_imap0 im ON im.fond_id=ins.fond_id AND im.uinv=ins.code
JOIN t_inv_dup d ON d.fond_id=im.fond_id AND d.title=im.title
WHERE ins.title IS NOT NULL AND coalesce(trim(im.title),'')<>'' AND ins.title <> im.title;
UPDATE inventories i SET title=t.title, updated_at=now() FROM t_inv_ovr t WHERE i.id=t.inv_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title, old_title)
SELECT 'inventory', arch_code||'-'||fond_code||'-'||inv_code, 'override-title', title, old_title FROM t_inv_ovr;

-- resolved опис map (incl. created)
CREATE TEMP TABLE t_imap AS
SELECT i.id AS inv_id, i.fond_id, i.code AS inv_code, replace(upper(i.code),'.','') AS uinv
FROM inventories i WHERE i.fond_id IN (SELECT DISTINCT fond_id FROM t_is);
CREATE INDEX ON t_imap (fond_id, uinv);

-- years (only for описи with none)
CREATE TEMP TABLE t_inv_years AS
SELECT DISTINCT im.inv_id, y.y1, y.y2
FROM mig_wiki_stage_inv_years y
JOIN t_fmap fm ON fm.uarch=upper(y.arch) AND fm.ufond=y.fond
JOIN t_imap im ON im.fond_id=fm.fond_id AND im.uinv=y.code
WHERE NOT EXISTS (SELECT 1 FROM inventory_years iy WHERE iy.inventory_id=im.inv_id);
INSERT INTO inventory_years (inventory_id, start_year, end_year)
SELECT inv_id, y1, y2 FROM t_inv_years ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- C. FILES
----------------------------------------------------------------------
CREATE TEMP TABLE t_fls AS
SELECT im.inv_id, fm.arch_code, fm.fond_code, im.inv_code, s.code, nullif(trim(s.title),'') AS title
FROM mig_wiki_stage_files s
JOIN t_fmap fm ON fm.uarch=upper(s.arch) AND fm.ufond=s.fond
JOIN t_imap im ON im.fond_id=fm.fond_id AND im.uinv=s.inv;

CREATE TEMP TABLE t_flmap AS
SELECT f.id AS file_id, f.inventory_id, f.code, upper(f.code) AS ucode, f.title
FROM files f WHERE f.inventory_id IN (SELECT DISTINCT inv_id FROM t_fls);
CREATE INDEX ON t_flmap (inventory_id, ucode);

CREATE TEMP TABLE t_file_new AS
SELECT fls.* FROM t_fls fls
WHERE NOT EXISTS (SELECT 1 FROM t_flmap fm WHERE fm.inventory_id=fls.inv_id AND fm.ucode=fls.code);
INSERT INTO files (id, code, title, inventory_id, full_code, updated_at)
SELECT gen_random_uuid(), code, title, inv_id, arch_code||'-'||fond_code||'-'||inv_code||'-'||code, now()
FROM t_file_new;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'file', arch_code||'-'||fond_code||'-'||inv_code||'-'||code, 'create', title FROM t_file_new;

CREATE TEMP TABLE t_file_fill AS
SELECT fm.file_id, fls.arch_code, fls.fond_code, fls.inv_code, fm.code, fls.title
FROM t_fls fls JOIN t_flmap fm ON fm.inventory_id=fls.inv_id AND fm.ucode=fls.code
WHERE coalesce(trim(fm.title),'')='' AND fls.title IS NOT NULL;
UPDATE files f SET title=t.title, updated_at=now() FROM t_file_fill t WHERE f.id=t.file_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'file', arch_code||'-'||fond_code||'-'||inv_code||'-'||code, 'fill-title', title FROM t_file_fill;

-- override: existing title duplicated among sibling files of the same опис
CREATE TEMP TABLE t_file_dup AS
SELECT inventory_id, title FROM files
WHERE inventory_id IN (SELECT DISTINCT inv_id FROM t_fls) AND coalesce(trim(title),'')<>''
GROUP BY 1,2 HAVING count(*)>1;
CREATE INDEX ON t_file_dup (inventory_id, title);
CREATE TEMP TABLE t_file_ovr AS
SELECT fm.file_id, fls.arch_code, fls.fond_code, fls.inv_code, fm.code, fls.title, fm.title AS old_title
FROM t_fls fls JOIN t_flmap fm ON fm.inventory_id=fls.inv_id AND fm.ucode=fls.code
JOIN t_file_dup d ON d.inventory_id=fm.inventory_id AND d.title=fm.title
WHERE fls.title IS NOT NULL AND coalesce(trim(fm.title),'')<>'' AND fls.title <> fm.title;
UPDATE files f SET title=t.title, updated_at=now() FROM t_file_ovr t WHERE f.id=t.file_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title, old_title)
SELECT 'file', arch_code||'-'||fond_code||'-'||inv_code||'-'||code, 'override-title', title, old_title FROM t_file_ovr;

-- years (only for files with none)
CREATE TEMP TABLE t_fyk AS
SELECT DISTINCT f.id AS file_id, y.y1, y.y2
FROM mig_wiki_stage_file_years y
JOIN t_fmap fm ON fm.uarch=upper(y.arch) AND fm.ufond=y.fond
JOIN t_imap im ON im.fond_id=fm.fond_id AND im.uinv=y.inv
JOIN files f ON f.inventory_id=im.inv_id AND upper(f.code)=y.code
WHERE NOT EXISTS (SELECT 1 FROM file_years fy WHERE fy.file_id=f.id);
INSERT INTO file_years (file_id, start_year, end_year)
SELECT file_id, y1, y2 FROM t_fyk ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- assertions
----------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*)>1) d;
  IF n <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', n; END IF;
  SELECT count(*) INTO n FROM files f
  JOIN inventories i ON i.id=f.inventory_id JOIN fonds fo ON fo.id=i.fond_id JOIN archives a ON a.id=fo.archive_id
  WHERE f.updated_at >= now() - interval '30 minutes'
    AND f.full_code IS DISTINCT FROM a.code||'-'||fo.code||'-'||i.code||'-'||f.code;
  IF n <> 0 THEN RAISE EXCEPTION 'full_code inconsistency: % recently-touched files', n; END IF;
END $$;

COMMIT;

SELECT 'fonds_created' AS metric, count(*) FROM t_fond_new
UNION ALL SELECT 'fond_titles_filled', count(*) FROM t_fond_fill
UNION ALL SELECT 'invs_created', count(*) FROM t_inv_new
UNION ALL SELECT 'inv_titles_filled', count(*) FROM t_inv_fill
UNION ALL SELECT 'inv_titles_overridden', count(*) FROM t_inv_ovr
UNION ALL SELECT 'invs_years_added', count(DISTINCT inv_id) FROM t_inv_years
UNION ALL SELECT 'files_created', count(*) FROM t_file_new
UNION ALL SELECT 'file_titles_filled', count(*) FROM t_file_fill
UNION ALL SELECT 'file_titles_overridden', count(*) FROM t_file_ovr
UNION ALL SELECT 'files_years_added', count(DISTINCT file_id) FROM t_fyk
UNION ALL SELECT 'invs_skipped_glued', count(*) FROM t_skip_invs
UNION ALL SELECT 'invs_folded_vol', count(*) FROM t_vol_invs
UNION ALL SELECT 'files_skipped_glued', count(*) FROM t_skip_files
ORDER BY 1;
