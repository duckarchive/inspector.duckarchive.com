-- ЦДІАК-128 glued-wiki-опис mapping (2026-07-29, data-owner approved).
-- Follow-up to wikisource-enrich.sql guard 0a: the skipped descriptive wiki
-- опис names are mapped onto existing short описи (FS-created shells + legacy
-- fragments). Requires ЦДІАК staged: enrich-wikisource.ts --stage-only ЦДІАК.
--
-- Evidence (see session 2026-07-29): code-range fingerprints (1БАНК 1..1603 ≈
-- wiki 1..1601; 1БЛАГ 3273..3560 ≈ wiki 3273..3561; 1АВОТ 1..329 = wiki
-- 1..329), continuous том numbering (т.1 = 1..1301, т.2 = 1303..4579) with
-- 1ВОТ1 = legacy head 1..162 and 1ВОТ = FS shell 163..4579, and
-- code+title-prefix matches (т.1↔1ВОТ1 154; 3ВОТ…↔опис 3 88).
-- ANOMALY: wiki page «1 Бухгалтерські справи» carries a carbon copy of the
-- «1а Вотчинні справи» table (341/341 identical rows) — its FILE rows are
-- skipped; only the опис title (from the fond page's описи table) is filled.
-- Policy identical to main run: create missing, fill empty titles, override
-- titles duplicated among siblings, years only when entity has none.

BEGIN;

CREATE TEMP TABLE t_map (wiki_inv text, tgt text, prio int, create_here bool);
INSERT INTO t_map VALUES
 ('1АВОТЧИННІСПРАВИ',          '1АВОТ',     1, true),
 ('1АЛФАВІТПОСЛУШНИЦЬКИХСПРАВ','1А',        1, true),
 ('1АЛФАВІТПОСЛУШНИЦЬКИХСПРАВ','1АЛПХАБЕТ', 2, false),
 ('1БАНКІВСЬКІСПРАВИ',         '1БАНК',     1, true),
 ('1БЛАГОЧИННИЦЬКІСПРАВИ',     '1БЛАГ',     1, true),
 ('1Т1ВОТЧИННІСПРАВИ',         '1ВОТ1',     1, false),
 ('1Т1ВОТЧИННІСПРАВИ',         '1ВОТ',      2, true),
 ('1Т2ВОТЧИННІСПРАВИ',         '1ВОТ1',     1, false),
 ('1Т2ВОТЧИННІСПРАВИ',         '1ВОТ',      2, true),
 ('3ВОТЧИННІСПРАВИ',           '3ВОТ',      1, true),
 ('3ВОТЧИННІСПРАВИ',           '3ВОТЧ',     2, false),
 ('4ВОТЧИННІСПРАВИ',           '4',         1, true),
 ('4ВОТЧИННІСПРАВИ',           '4ВОТ',      2, false),
 -- опис-title-only rows (0 staged files, or files skipped as mislabeled):
 ('1ДРУКАРСЬКІСПРАВИ',         '1ДРУК',     1, false),
 ('1ЗАГАЛЬНОЧЕРНЕЦЬКІСПРАВИ',  '1ЗАГ',      1, false),
 ('2ДРУКАРСЬКІСПРАВИ',         '2ДРУК',     1, false),
 ('3ДРУКАРСЬКІСПРАВИ',         '3ДРУК',     1, false),
 ('1БУХГАЛТЕРСЬКІСПРАВИ',      '1БУХ',      1, false);

-- resolve target описи
CREATE TEMP TABLE t_tgt AS
SELECT m.wiki_inv, m.tgt, m.prio, m.create_here, i.id AS inv_id, i.title AS inv_title
FROM t_map m
JOIN archives a ON a.code='ЦДІАК'
JOIN fonds f ON f.archive_id=a.id AND f.code='128'
JOIN inventories i ON i.fond_id=f.id AND i.code=m.tgt;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM t_map m WHERE NOT EXISTS
    (SELECT 1 FROM t_tgt t WHERE t.wiki_inv=m.wiki_inv AND t.tgt=m.tgt);
  IF n <> 0 THEN RAISE EXCEPTION '% mapping targets not found in DB', n; END IF;
END $$;

----------------------------------------------------------------------
-- 1. опис titles: fill empty target опис title from the staged (fond-page
--    table) title — only when the target has exactly one wiki candidate.
----------------------------------------------------------------------
CREATE TEMP TABLE t_invfill AS
SELECT DISTINCT ON (t.inv_id) t.inv_id, t.tgt, t.wiki_inv, s.title
FROM t_tgt t
JOIN mig_wiki_stage_invs s ON s.arch='ЦДІАК' AND s.fond='128' AND s.code=t.wiki_inv
WHERE coalesce(trim(t.inv_title),'')='' AND nullif(trim(s.title),'') IS NOT NULL
  AND (SELECT count(DISTINCT s2.title) FROM t_tgt t2
       JOIN mig_wiki_stage_invs s2 ON s2.arch='ЦДІАК' AND s2.fond='128' AND s2.code=t2.wiki_inv
       WHERE t2.inv_id=t.inv_id AND nullif(trim(s2.title),'') IS NOT NULL) = 1;
UPDATE inventories i SET title=t.title, updated_at=now() FROM t_invfill t WHERE i.id=t.inv_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title, old_title)
SELECT 'inventory', 'ЦДІАК-128-'||tgt, 'map128-fill-inv-title', title, 'wiki:'||wiki_inv FROM t_invfill;

-- опис years (only when target has none; skip multi-candidate targets not needed — DISTINCT)
CREATE TEMP TABLE t_invy AS
SELECT DISTINCT t.inv_id, y.y1, y.y2
FROM t_tgt t
JOIN mig_wiki_stage_inv_years y ON y.arch='ЦДІАК' AND y.fond='128' AND y.code=t.wiki_inv
WHERE t.prio=1
  AND NOT EXISTS (SELECT 1 FROM inventory_years iy WHERE iy.inventory_id=t.inv_id);
INSERT INTO inventory_years (inventory_id, start_year, end_year)
SELECT inv_id, y1, y2 FROM t_invy ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 2. files: match by code across the target union (prio order), create the
--    missing ones in the create_here target. 1БУХГАЛТЕРСЬКІСПРАВИ excluded
--    (mislabeled carbon-copy table).
----------------------------------------------------------------------
CREATE TEMP TABLE t_wf AS
SELECT sf.inv AS wiki_inv, upper(sf.code) AS code, nullif(trim(sf.title),'') AS title
FROM mig_wiki_stage_files sf
WHERE sf.arch='ЦДІАК' AND sf.fond='128'
  AND sf.inv IN (SELECT wiki_inv FROM t_map)
  AND sf.inv <> '1БУХГАЛТЕРСЬКІСПРАВИ';
INSERT INTO mig_wikisource_enrich (level, full_code, action, title)
SELECT 'file', 'ЦДІАК-128-1БУХГАЛТЕРСЬКІСПРАВИ-'||sf.code, 'map128-skip-mislabeled', sf.title
FROM mig_wiki_stage_files sf
WHERE sf.arch='ЦДІАК' AND sf.fond='128' AND sf.inv='1БУХГАЛТЕРСЬКІСПРАВИ';

-- first existing match in prio order
CREATE TEMP TABLE t_matched AS
SELECT DISTINCT ON (w.wiki_inv, w.code) w.wiki_inv, w.code, w.title,
       t.tgt, fl.id AS file_id, fl.title AS old_title, fl.inventory_id
FROM t_wf w
JOIN t_tgt t ON t.wiki_inv=w.wiki_inv
JOIN files fl ON fl.inventory_id=t.inv_id AND upper(fl.code)=w.code
ORDER BY w.wiki_inv, w.code, t.prio;

-- creates: unmatched → create_here target
CREATE TEMP TABLE t_create AS
SELECT DISTINCT ON (t.inv_id, w.code) w.wiki_inv, w.code, w.title, t.tgt, t.inv_id,
       gen_random_uuid() AS id
FROM t_wf w
JOIN t_tgt t ON t.wiki_inv=w.wiki_inv AND t.create_here
WHERE NOT EXISTS (SELECT 1 FROM t_matched m WHERE m.wiki_inv=w.wiki_inv AND m.code=w.code);
INSERT INTO files (id, code, title, inventory_id, full_code, updated_at)
SELECT id, code, title, inv_id, 'ЦДІАК-128-'||tgt||'-'||code, now() FROM t_create;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title, old_title)
SELECT 'file', 'ЦДІАК-128-'||tgt||'-'||code, 'map128-create', title, 'wiki:'||wiki_inv FROM t_create;

-- fill empty titles on matched
CREATE TEMP TABLE t_fill AS
SELECT m.* FROM t_matched m WHERE coalesce(trim(m.old_title),'')='' AND m.title IS NOT NULL;
UPDATE files f SET title=t.title, updated_at=now() FROM t_fill t WHERE f.id=t.file_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title, old_title)
SELECT 'file', 'ЦДІАК-128-'||tgt||'-'||code, 'map128-fill-title', title, 'wiki:'||wiki_inv FROM t_fill;

-- override titles duplicated among siblings (main-run rule)
CREATE TEMP TABLE t_dup AS
SELECT inventory_id, title FROM files
WHERE inventory_id IN (SELECT DISTINCT inv_id FROM t_tgt) AND coalesce(trim(title),'')<>''
GROUP BY 1,2 HAVING count(*)>1;
CREATE TEMP TABLE t_ovr AS
SELECT m.* FROM t_matched m
JOIN t_dup d ON d.inventory_id=m.inventory_id AND d.title=m.old_title
WHERE m.title IS NOT NULL AND coalesce(trim(m.old_title),'')<>'' AND m.title <> m.old_title;
UPDATE files f SET title=t.title, updated_at=now() FROM t_ovr t WHERE f.id=t.file_id;
INSERT INTO mig_wikisource_enrich (level, full_code, action, title, old_title)
SELECT 'file', 'ЦДІАК-128-'||tgt||'-'||code, 'map128-override-title', title, old_title FROM t_ovr;

-- file years (only files with none)
CREATE TEMP TABLE t_fy AS
SELECT DISTINCT fid.file_id, y.y1, y.y2
FROM mig_wiki_stage_file_years y
JOIN (SELECT wiki_inv, code, file_id FROM t_matched
      UNION ALL SELECT wiki_inv, code, id FROM t_create) fid
  ON fid.wiki_inv=y.inv AND fid.code=upper(y.code)
WHERE y.arch='ЦДІАК' AND y.fond='128'
  AND NOT EXISTS (SELECT 1 FROM file_years fy WHERE fy.file_id=fid.file_id);
INSERT INTO file_years (file_id, start_year, end_year)
SELECT file_id, y1, y2 FROM t_fy ON CONFLICT DO NOTHING;

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
  WHERE f.updated_at >= now() - interval '15 minutes'
    AND f.full_code IS DISTINCT FROM a.code||'-'||fo.code||'-'||i.code||'-'||f.code;
  IF n <> 0 THEN RAISE EXCEPTION 'full_code inconsistency: % recently-touched files', n; END IF;
END $$;

COMMIT;

SELECT 'inv_titles_filled' AS metric, count(*) FROM t_invfill
UNION ALL SELECT 'inv_years_added', count(DISTINCT inv_id) FROM t_invy
UNION ALL SELECT 'files_matched', count(*) FROM t_matched
UNION ALL SELECT 'files_created', count(*) FROM t_create
UNION ALL SELECT 'file_titles_filled', count(*) FROM t_fill
UNION ALL SELECT 'file_titles_overridden', count(*) FROM t_ovr
UNION ALL SELECT 'file_years_added', count(DISTINCT file_id) FROM t_fy
ORDER BY 1;
