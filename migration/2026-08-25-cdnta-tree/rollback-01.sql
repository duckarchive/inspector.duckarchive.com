-- rollback-01.sql — undo 01-create-tree.sql (delete the created ЦДНТА tree).
-- Run from this folder AFTER rollback-02.sql.
-- Deletes ONLY rows belonging to the new tree (inventories not named OLD-3);
-- online_copies.file_id/inventory_id are ON DELETE CASCADE, so PDF copies and
-- any remaining links must go first — verified below instead of relying on cascade.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE t_ctx AS
SELECT (SELECT id FROM archives WHERE code = 'ЦДНТА') AS archive_id,
       (SELECT id FROM resources WHERE code = 'website_cdnta') AS resource_id;

CREATE TEMP TABLE t_new_invs AS
SELECT i.id FROM inventories i
JOIN fonds f ON i.fond_id = f.id
JOIN t_ctx c ON f.archive_id = c.archive_id
WHERE i.code <> 'OLD-3';

-- 1. delete опис PDF copies + guard: no other copies may reference the new tree
DELETE FROM online_copies WHERE resource_id = (SELECT resource_id FROM t_ctx);

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM online_copies
  WHERE inventory_id IN (SELECT id FROM t_new_invs)
     OR file_id IN (SELECT id FROM files WHERE inventory_id IN (SELECT id FROM t_new_invs));
  IF n > 0 THEN
    RAISE EXCEPTION '% online_copies still reference the new tree — run rollback-02 first', n;
  END IF;
END $$;

-- 2. delete the new tree
DELETE FROM files WHERE inventory_id IN (SELECT id FROM t_new_invs);
DELETE FROM inventory_years WHERE inventory_id IN (SELECT id FROM t_new_invs);
DELETE FROM inventories WHERE id IN (SELECT id FROM t_new_invs);

-- 3. delete fonds created by 01 (those with no inventories left = everything
--    except the 4 pre-existing fonds, which still hold their OLD-3 inventory)
DELETE FROM fonds f
USING t_ctx c
WHERE f.archive_id = c.archive_id
  AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.fond_id = f.id);

-- 4. restore bogus inventory codes and drop the resource
UPDATE inventories SET code = '3', updated_at = now()
WHERE code = 'OLD-3'
  AND fond_id IN (SELECT id FROM fonds f JOIN t_ctx c ON f.archive_id = c.archive_id);

DELETE FROM resources WHERE code = 'website_cdnta';

SELECT 'rollback-01 done' AS step,
  (SELECT count(*) FROM fonds f JOIN t_ctx c ON f.archive_id = c.archive_id) AS fonds_left,
  (SELECT count(*) FROM inventories i JOIN fonds f ON i.fond_id = f.id JOIN t_ctx c ON f.archive_id = c.archive_id) AS inventories_left;

COMMIT;
