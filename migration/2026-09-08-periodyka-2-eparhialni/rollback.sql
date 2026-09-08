-- Undo migration.sql. Safe because фонд ПЕРІОДИКА-2 was empty beforehand
-- (migration.sql asserts that), so everything under it is ours.
BEGIN;
DELETE FROM online_copies oc USING files f, inventories i
 WHERE oc.file_id = f.id AND f.inventory_id = i.id
   AND i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
DELETE FROM online_copies oc USING inventories i
 WHERE oc.inventory_id = i.id
   AND i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';
DELETE FROM files f USING inventories i
 WHERE f.inventory_id = i.id
   AND i.fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';   -- cascades file_years
DELETE FROM inventories
 WHERE fond_id = '8775ebfa-04ab-44e3-bea9-137704f39b06';     -- cascades inventory_years
COMMIT;
