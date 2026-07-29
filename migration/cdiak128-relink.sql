-- ЦДІАК-128 copy re-link after manual merge/rename (2026-07-29).
-- Input: mig_cdiak128_redo_foc/_ioc snapshots (old full_code per detached copy)
-- + the data-owner's new опис codes (БАНК1, ВОТЧ1, …).
-- Step 1: re-link copies to existing new files (old опис code → new опис code,
--         file code preserved — numbering verified continuous/aligned).
-- Step 2: copies whose справа has no wiki row (1БУХ tail 330+, ДРУК1/2/3,
--         КДС1) get untitled files created + linked, per the DB-wide
--         FS-bucket1 convention (опис exists → create file, NULL title).
-- Skipped: old 1ЗАГ (514 copies) — «1заг» is ambiguous between the new
--         «Загальні справи» описи (1/2/3) and ЧЕРН1 (Загальночернецькі);
--         left unlinked for the data owner.
-- Audit: mig_cdiak128_relink (copy_id, old_full_code, new_full_code, action).
-- Only touches copies still detached (file_id IS NULL) — manual links kept.

BEGIN;

CREATE TEMP TABLE t_invmap (old_inv text, new_inv text, create_missing bool);
INSERT INTO t_invmap VALUES
 ('1ВОТ',  'ВОТЧ1',  true),
 ('1ВОТ1', 'ВОТЧ1',  true),
 ('1АВОТ', 'ВОТЧ1А', true),
 ('1БАНК', 'БАНК1',  true),
 ('1БЛАГ', 'БЛАГ1',  true),
 ('1БУХ',  'БУХГ1',  true),
 ('1ДРУК', 'ДРУК1',  true),
 ('2ДРУК', 'ДРУК2',  true),
 ('3ДРУК', 'ДРУК3',  true),
 ('1КДС',  'КДС1',   true),
 ('3ВОТ',  'ВОТЧ3',  true),
 ('3ВОТЧ', 'ВОТЧ3',  false),  -- 6 copies, codes 63..68 exist in ВОТЧ3
 ('4',     'ВОТЧ4',  true),
 ('1ПОСЛ', 'ПОСЛ1',  true);

CREATE TEMP TABLE t_inv AS
SELECT i.id, i.code FROM inventories i
JOIN fonds f ON f.id=i.fond_id JOIN archives a ON a.id=f.archive_id
WHERE a.code='ЦДІАК' AND f.code='128';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM t_invmap m WHERE NOT EXISTS (SELECT 1 FROM t_inv t WHERE t.code=m.new_inv);
  IF n <> 0 THEN RAISE EXCEPTION '% new опис codes not found', n; END IF;
END $$;

-- detached snapshot rows with their mapped target full_code
CREATE TEMP TABLE t_work AS
SELECT s.copy_id, s.old_full_code, s.old_title, m.new_inv, m.create_missing,
       upper(split_part(s.old_full_code,'-',4)) AS fcode,
       'ЦДІАК-128-'||m.new_inv||'-'||upper(split_part(s.old_full_code,'-',4)) AS new_full_code
FROM mig_cdiak128_redo_foc s
JOIN t_invmap m ON m.old_inv = split_part(s.old_full_code,'-',3)
JOIN file_online_copies oc ON oc.id=s.copy_id AND oc.file_id IS NULL;

CREATE TABLE mig_cdiak128_relink (
  copy_id uuid, old_full_code text, new_full_code text, action text,
  applied_at timestamp DEFAULT now());

-- ---------------------------------------------- step 1: link to existing
CREATE TEMP TABLE t_link AS
SELECT w.copy_id, w.old_full_code, w.new_full_code, fl.id AS file_id
FROM t_work w
JOIN t_inv iv ON iv.code=w.new_inv
JOIN files fl ON fl.inventory_id=iv.id AND upper(fl.code)=w.fcode;
UPDATE file_online_copies oc SET file_id=t.file_id, updated_at=now()
FROM t_link t WHERE oc.id=t.copy_id;
INSERT INTO mig_cdiak128_relink (copy_id, old_full_code, new_full_code, action)
SELECT copy_id, old_full_code, new_full_code, 'link' FROM t_link;

-- ------------------------------- step 2: create missing files, then link
CREATE TEMP TABLE t_need AS
SELECT DISTINCT ON (w.new_full_code) w.new_inv, w.fcode, w.new_full_code,
       gen_random_uuid() AS id
FROM t_work w
WHERE w.create_missing
  AND NOT EXISTS (SELECT 1 FROM t_link l WHERE l.copy_id=w.copy_id);
INSERT INTO files (id, code, title, inventory_id, full_code, updated_at)
SELECT n.id, n.fcode, NULL, iv.id, n.new_full_code, now()
FROM t_need n JOIN t_inv iv ON iv.code=n.new_inv;
CREATE TEMP TABLE t_link2 AS
SELECT w.copy_id, w.old_full_code, w.new_full_code, n.id AS file_id
FROM t_work w
JOIN t_need n ON n.new_full_code=w.new_full_code
WHERE NOT EXISTS (SELECT 1 FROM t_link l WHERE l.copy_id=w.copy_id);
UPDATE file_online_copies oc SET file_id=t.file_id, updated_at=now()
FROM t_link2 t WHERE oc.id=t.copy_id;
INSERT INTO mig_cdiak128_relink (copy_id, old_full_code, new_full_code, action)
SELECT copy_id, old_full_code, new_full_code, 'create-link' FROM t_link2;

-- -------------------------------------- inventory-level (wiki опис books)
CREATE TEMP TABLE t_iocmap (page text, new_inv text);
INSERT INTO t_iocmap VALUES
 ('1 Грамоти','ГРАМ1'), ('1 КДС','КДС1'), ('1 Алфавіт послушницьких справ','ПОСЛ1'),
 ('2 Чернецькі справи','ЧЕРН2'), ('2 Загальні справи','2'), ('2 Друкарські справи','ДРУК2'),
 ('3 Алфавіт чернецьких справ','ЧЕРН3'), ('3 Друкарські справи','ДРУК3'),
 ('3 Загальні справи','3'), ('3 Вотчинні справи','ВОТЧ3'), ('4 Вотчинні справи','ВОТЧ4');
CREATE TEMP TABLE t_ioc AS
SELECT s.copy_id, iv.id AS inventory_id, m.new_inv
FROM mig_cdiak128_redo_ioc s
JOIN t_iocmap m ON split_part(s.url,'/128/',2) = m.page
JOIN t_inv iv ON iv.code=m.new_inv
JOIN inventory_online_copies oc ON oc.id=s.copy_id AND oc.inventory_id IS NULL;
UPDATE inventory_online_copies oc SET inventory_id=t.inventory_id, updated_at=now()
FROM t_ioc t WHERE oc.id=t.copy_id;
INSERT INTO mig_cdiak128_relink (copy_id, old_full_code, new_full_code, action)
SELECT copy_id, NULL, 'ЦДІАК-128-'||new_inv, 'inv-link' FROM t_ioc;

-- -------------------------------------------------------------- assertions
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*)>1) d;
  IF n <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', n; END IF;
  SELECT count(*) INTO n FROM (
    SELECT copy_id FROM mig_cdiak128_relink WHERE action IN ('link','create-link') GROUP BY 1 HAVING count(*)>1) d;
  IF n <> 0 THEN RAISE EXCEPTION '% copies double-linked', n; END IF;
END $$;

COMMIT;

SELECT 'copies_linked_existing' AS metric, count(*) FROM t_link
UNION ALL SELECT 'files_created', count(*) FROM t_need
UNION ALL SELECT 'copies_linked_created', count(*) FROM t_link2
UNION ALL SELECT 'inv_copies_linked', count(*) FROM t_ioc
UNION ALL SELECT 'title_agreement_checked', count(*) FROM t_link l
  JOIN mig_cdiak128_redo_foc s ON s.copy_id=l.copy_id
  JOIN files fl ON fl.id=l.file_id
  WHERE coalesce(trim(s.old_title),'')<>'' AND coalesce(trim(fl.title),'')<>''
UNION ALL SELECT 'title_agreement_exact', count(*) FROM t_link l
  JOIN mig_cdiak128_redo_foc s ON s.copy_id=l.copy_id
  JOIN files fl ON fl.id=l.file_id
  WHERE lower(trim(s.old_title))=lower(trim(fl.title))
ORDER BY 1;
