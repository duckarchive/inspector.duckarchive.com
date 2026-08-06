-- Rollback for create-and-link.sql (2026-08-06, ЦДІАК-128-1друк. linking)
-- Only unlinks/deletes the 34 files CREATED by this migration. The 3
-- pre-existing files (413, 501, 1294) that some of the 83 online copies
-- were also linked to are NOT touched — deleting them would also remove
-- their pre-existing no-suffix online copy link, which predates this
-- migration.

BEGIN;

-- unlink every online copy this migration touched (83 rows: all ч.-suffixed
-- ЦДІАК-128-1друк copies, whether they landed on a new or pre-existing file)
UPDATE online_copies oc
SET file_id = NULL
FROM files f
WHERE oc.file_id = f.id
  AND f.inventory_id = '9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c'
  AND oc.parsed ~ 'ч\.[0-9]+'
  AND oc.parsed ILIKE '%ЦДІАК%128%1друк%';

-- delete only the 34 files this migration created
DELETE FROM files
WHERE inventory_id = '9d8bfdcd-cfe4-4e42-b827-77e97aee9e2c'
  AND code IN ('219','272','471','493','521','553','578','589','858','943',
               '946','973','991','1057','1105','1109','1110','1116','1316',
               '1330','1348','1349','1350','1351','1556','1559','1560',
               '1565','1566','1573','1578','1582','1589','1593');

COMMIT;
