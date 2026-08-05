-- Rollback for create-dahzo-1953.sql
-- ORDER MATTERS: online_copies.file_id has ON DELETE CASCADE, so the copies must be
-- unlinked BEFORE the files are dropped, or the 256 online_copies rows are destroyed.
\set ON_ERROR_STOP on
BEGIN;

UPDATE online_copies o
SET file_id = NULL
FROM files f
JOIN inventories i ON i.id = f.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE o.file_id = f.id
  AND a.code = 'ДАХеО' AND fo.code = 'Р1953' AND i.code = '1';

DELETE FROM files f
USING inventories i, fonds fo, archives a
WHERE f.inventory_id = i.id AND i.fond_id = fo.id AND fo.archive_id = a.id
  AND a.code = 'ДАХеО' AND fo.code = 'Р1953' AND i.code = '1';

DELETE FROM inventories i
USING fonds fo, archives a
WHERE i.fond_id = fo.id AND fo.archive_id = a.id
  AND a.code = 'ДАХеО' AND fo.code = 'Р1953' AND i.code = '1';

DELETE FROM fonds fo
USING archives a
WHERE fo.archive_id = a.id AND a.code = 'ДАХеО' AND fo.code = 'Р1953';

COMMIT;
