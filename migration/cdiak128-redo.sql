-- ЦДІАК-128 REDO (2026-07-29, data-owner directed): the map128 merge attempt
-- was wrong — wipe the fond's contents and recreate the wiki structure
-- VERBATIM (one опис per wiki page/table row, no merging, no mapping); the
-- data owner will merge and rename manually.
-- Requires ЦДІАК staged: pnpm exec tsx migration/src/enrich-wikisource.ts --stage-only ЦДІАК
--
-- Precautions:
--   * file_online_copies / inventory_online_copies are ON DELETE CASCADE →
--     detached (id set NULL) BEFORE the delete; old link mapping preserved in
--     mig_cdiak128_redo_foc / _ioc (url+parsed → old full_code+title) for
--     re-linking after the manual merge.
--   * every deleted опис/файл/рік snapshotted in mig_cdiak128_redo_{invs,files,years}.
--   * fond row itself is KEPT (stable id/title); only children are wiped.
--   * glued опис codes >20 chars are trimmed to 20 (varchar limit); the raw
--     wiki опис page name is stored in inventories.info as 'wiki: <name>'.

BEGIN;

CREATE TEMP TABLE t_fond AS
SELECT f.id FROM fonds f JOIN archives a ON a.id=f.archive_id
WHERE a.code='ЦДІАК' AND f.code='128';

CREATE TEMP TABLE t_inv AS SELECT id, code, title, info FROM inventories WHERE fond_id IN (SELECT id FROM t_fond);
CREATE TEMP TABLE t_fl  AS SELECT id, inventory_id, code, full_code, title FROM files WHERE inventory_id IN (SELECT id FROM t_inv);

-- ------------------------------------------------------------------ backups
CREATE TABLE mig_cdiak128_redo_invs AS
SELECT i.code, i.title, i.info, now() AS deleted_at FROM t_inv i;
CREATE TABLE mig_cdiak128_redo_files AS
SELECT iv.code AS inv_code, fl.code, fl.full_code, fl.title, now() AS deleted_at
FROM t_fl fl JOIN t_inv iv ON iv.id=fl.inventory_id;
CREATE TABLE mig_cdiak128_redo_years AS
SELECT fl.full_code, fy.start_year, fy.end_year FROM file_years fy JOIN t_fl fl ON fl.id=fy.file_id;
CREATE TABLE mig_cdiak128_redo_foc AS
SELECT oc.id AS copy_id, oc.url, oc.parsed, fl.full_code AS old_full_code, fl.title AS old_title
FROM file_online_copies oc JOIN t_fl fl ON fl.id=oc.file_id;
CREATE TABLE mig_cdiak128_redo_ioc AS
SELECT oc.id AS copy_id, oc.url, oc.parsed, iv.code AS old_inv_code
FROM inventory_online_copies oc JOIN t_inv iv ON iv.id=oc.inventory_id;

-- ------------------------------------------------------- detach copy links
UPDATE file_online_copies SET file_id=NULL WHERE file_id IN (SELECT id FROM t_fl);
UPDATE inventory_online_copies SET inventory_id=NULL WHERE inventory_id IN (SELECT id FROM t_inv);

-- ------------------------------------------------------------------ delete
DELETE FROM files WHERE inventory_id IN (SELECT id FROM t_inv);
DELETE FROM inventories WHERE id IN (SELECT id FROM t_inv);

-- ---------------------------------------------------------------- recreate
-- raw wiki опис page names (canon code → readable name, for info + renaming)
CREATE TEMP TABLE t_raw (code text, raw text);
INSERT INTO t_raw VALUES
 ('1АЛФАВІТПОСЛУШНИЦЬКИХСПРАВ','1 Алфавіт послушницьких справ'),
 ('1БАНКІВСЬКІСПРАВИ','1 Банківські справи'),
 ('1БЛАГОЧИННИЦЬКІСПРАВИ','1 Благочинницькі справи'),
 ('1БУХГАЛТЕРСЬКІСПРАВИ','1 Бухгалтерські справи'),
 ('1ГРАМОТИ','1 Грамоти'),
 ('1ДРУКАРСЬКІСПРАВИ','1 Друкарські справи'),
 ('1ЗАГАЛЬНОЧЕРНЕЦЬКІСПРАВИ','1 Загальночернецькі справи'),
 ('1КДС','1 КДС'),
 ('1МАЛОВАЖНІСПРАВИ','1 Маловажні справи'),
 ('1ЧЕРНЕЦЬКІСПРАВИ','1 Чернецькі справи'),
 ('1Т1ВОТЧИННІСПРАВИ','1 т. 1 Вотчинні справи'),
 ('1Т1ЗАГАЛЬНІСПРАВИ','1 т. 1 Загальні справи'),
 ('1Т2ВОТЧИННІСПРАВИ','1 т. 2 Вотчинні справи'),
 ('1Т2ЗАГАЛЬНІСПРАВИ','1 т. 2 Загальні справи'),
 ('1АВОТЧИННІСПРАВИ','1а Вотчинні справи'),
 ('2ДРУКАРСЬКІСПРАВИ','2 Друкарські справи'),
 ('2ЗАГАЛЬНІСПРАВИ','2 Загальні справи'),
 ('2ЧЕРНЕЦЬКІСПРАВИ','2 Чернецькі справи'),
 ('3АЛФАВІТЧЕРНЕЦЬКИХСПРАВ','3 Алфавіт чернецьких справ'),
 ('3ВОТЧИННІСПРАВИ','3 Вотчинні справи'),
 ('3ДРУКАРСЬКІСПРАВИ','3 Друкарські справи'),
 ('3ЗАГАЛЬНІСПРАВИ','3 Загальні справи'),
 ('4','4'),
 ('4ВОТЧИННІСПРАВИ','4 Вотчинні справи');

CREATE TEMP TABLE t_new_inv AS
SELECT gen_random_uuid() AS id, left(s.code,20) AS code,
       nullif(trim(s.title),'') AS title,
       CASE WHEN r.raw IS NOT NULL THEN 'wiki: '||r.raw END AS info,
       s.code AS staged_code
FROM mig_wiki_stage_invs s LEFT JOIN t_raw r ON r.code=s.code
WHERE s.arch='ЦДІАК' AND s.fond='128';
INSERT INTO inventories (id, code, title, info, fond_id, updated_at)
SELECT id, code, title, info, (SELECT id FROM t_fond), now() FROM t_new_inv;

INSERT INTO inventory_years (inventory_id, start_year, end_year)
SELECT DISTINCT ni.id, y.y1, y.y2
FROM mig_wiki_stage_inv_years y JOIN t_new_inv ni ON ni.staged_code=y.code
WHERE y.arch='ЦДІАК' AND y.fond='128'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE t_new_fl AS
SELECT gen_random_uuid() AS id, ni.id AS inventory_id, upper(s.code) AS code,
       nullif(trim(s.title),'') AS title,
       'ЦДІАК-128-'||ni.code||'-'||upper(s.code) AS full_code,
       s.inv AS staged_inv
FROM mig_wiki_stage_files s JOIN t_new_inv ni ON ni.staged_code=s.inv
WHERE s.arch='ЦДІАК' AND s.fond='128';
INSERT INTO files (id, code, title, inventory_id, full_code, updated_at)
SELECT id, code, title, inventory_id, full_code, now() FROM t_new_fl;

INSERT INTO file_years (file_id, start_year, end_year)
SELECT DISTINCT fl.id, y.y1, y.y2
FROM mig_wiki_stage_file_years y
JOIN t_new_fl fl ON fl.staged_inv=y.inv AND fl.code=upper(y.code)
WHERE y.arch='ЦДІАК' AND y.fond='128'
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------- assertions
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (SELECT code FROM t_new_inv GROUP BY 1 HAVING count(*)>1) d;
  IF n <> 0 THEN RAISE EXCEPTION '% trimmed опис code collisions', n; END IF;
  SELECT count(*) INTO n FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*)>1) d;
  IF n <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', n; END IF;
END $$;

COMMIT;

SELECT 'invs_deleted' AS metric, count(*) FROM mig_cdiak128_redo_invs
UNION ALL SELECT 'files_deleted', count(*) FROM mig_cdiak128_redo_files
UNION ALL SELECT 'file_copies_detached', count(*) FROM mig_cdiak128_redo_foc
UNION ALL SELECT 'inv_copies_detached', count(*) FROM mig_cdiak128_redo_ioc
UNION ALL SELECT 'invs_created', count(*) FROM t_new_inv
UNION ALL SELECT 'files_created', count(*) FROM t_new_fl
UNION ALL SELECT 'files_titled', count(*) FROM t_new_fl WHERE title IS NOT NULL
ORDER BY 1;
