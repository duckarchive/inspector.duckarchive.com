-- ДАКрО-П5907: fold 2РТ2..2РТ23 volume inventories into base 2Р
-- Blank volume files are DROPPED (their cases already exist in base 2Р with
-- correct continuous codes + attached FamilySearch copies). The 4
-- wikisource-enriched files are MERGED into their base counterparts,
-- identified by the case code in the wikisource PDF filename.
-- Backup: ~/Projects/archive-duck/inspector_3_backup_<ts>.sql.gz (taken 2026-07-27)

BEGIN;

-- ─── 0. sanity: expected volume inventories and file counts ───
DO $$
DECLARE inv_cnt int; file_cnt int;
BEGIN
  SELECT count(*) INTO inv_cnt FROM inventories
    WHERE fond_id = (SELECT fond_id FROM inventories WHERE id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65')
    AND code ~ '^2РТ\d+$';
  SELECT count(*) INTO file_cnt FROM files
    WHERE inventory_id IN (SELECT id FROM inventories
      WHERE fond_id = (SELECT fond_id FROM inventories WHERE id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65')
      AND code ~ '^2РТ\d+$');
  IF inv_cnt <> 22 OR file_cnt <> 10591 THEN
    RAISE EXCEPTION 'unexpected state: % inventories, % files', inv_cnt, file_cnt;
  END IF;
END $$;

-- ─── 1. merge the 4 wikisource-enriched files into base counterparts ───
-- mapping:
--   2РТ2-356  (Крикун)    → 2Р-930   (per legacy FS url / FS parsed; wikisource PDF name 1616 overruled by data owner)
--   2РТ6-509  (Потапенко) → 2Р-4747  (FS + wikisource agree)
--   2РТ11-209 (Лашкул)    → 2Р-8504  (wikisource only, no FS url)
--   2РТ19-37  (Бриурош)   → 2Р-13325 (FS + wikisource agree)
CREATE TEMP TABLE merge4(tom_full text, base_full text);
INSERT INTO merge4 VALUES
  ('ДАКрО-П5907-2РТ2-356',  'ДАКрО-П5907-2Р-930'),
  ('ДАКрО-П5907-2РТ6-509',  'ДАКрО-П5907-2Р-4747'),
  ('ДАКрО-П5907-2РТ11-209', 'ДАКрО-П5907-2Р-8504'),
  ('ДАКрО-П5907-2РТ19-37',  'ДАКрО-П5907-2Р-13325');

-- move wikisource copies to base files
UPDATE file_online_copies foc SET file_id = b.id, updated_at = now()
FROM merge4 m, files t, files b
WHERE foc.file_id = t.id AND t.full_code = m.tom_full AND b.full_code = m.base_full;

-- real person-name titles beat generic FS boilerplate
UPDATE files b SET title = t.title, updated_at = now()
FROM merge4 m, files t
WHERE t.full_code = m.tom_full AND b.full_code = m.base_full;

-- years: only where base has none (2Р-1616)
INSERT INTO file_years (file_id, start_year, end_year)
SELECT b.id, fy.start_year, fy.end_year
FROM merge4 m
JOIN files t ON t.full_code = m.tom_full
JOIN files b ON b.full_code = m.base_full
JOIN file_years fy ON fy.file_id = t.id
WHERE NOT EXISTS (SELECT 1 FROM file_years x WHERE x.file_id = b.id);

-- ─── 2. drop ALL volume files (4 merged above lose their leftovers via CASCADE) ───
DELETE FROM files WHERE inventory_id IN (
  SELECT id FROM inventories
  WHERE fond_id = (SELECT fond_id FROM inventories WHERE id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65')
  AND code ~ '^2РТ\d+$');

-- ─── 3. move the 22 wikisource опис-book copies onto base 2Р inventory ───
UPDATE inventory_online_copies SET inventory_id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65', updated_at = now()
WHERE inventory_id IN (
  SELECT id FROM inventories
  WHERE fond_id = (SELECT fond_id FROM inventories WHERE id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65')
  AND code ~ '^2РТ\d+$');

-- ─── 4. drop the empty volume inventories ───
DELETE FROM inventories
WHERE fond_id = (SELECT fond_id FROM inventories WHERE id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65')
AND code ~ '^2РТ\d+$';

-- ─── 5. verify ───
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT b.full_code, b.title,
      (SELECT count(*) FROM file_online_copies foc WHERE foc.file_id = b.id) AS copies
    FROM merge4 m JOIN files b ON b.full_code = m.base_full
  LOOP
    RAISE NOTICE 'merged: % | % | copies=%', r.full_code, r.title, r.copies;
  END LOOP;
  IF EXISTS (SELECT 1 FROM inventories
    WHERE fond_id = (SELECT fond_id FROM inventories WHERE id = '7861c19c-2d6a-4a0b-a5c6-157e61d1dc65')
    AND code ~ '^2РТ') THEN
    RAISE EXCEPTION 'volume inventories still present';
  END IF;
  IF EXISTS (SELECT 1 FROM files WHERE full_code LIKE 'ДАКрО-П5907-2РТ%') THEN
    RAISE EXCEPTION 'volume files still present';
  END IF;
END $$;

COMMIT;
