-- Rollback for create-and-link.sql (2026-08-06, ДАОО fond 1008 linking)
-- Unlink online_copies BEFORE deleting created rows, then delete
-- files → inventory → fond (child-first; files_inventory_id_fkey and
-- inventories_fond_id_fkey are NOT cascading).
-- Created ids: fond 1106ad96-917b-47d6-88ab-3799874706c9,
--              inventory 3b42e85b-75d9-41e5-a90e-e6c1b1b0ee98.

BEGIN;

UPDATE online_copies SET file_id = NULL
WHERE file_id IN (
  SELECT id FROM files
  WHERE inventory_id = '3b42e85b-75d9-41e5-a90e-e6c1b1b0ee98'
);

UPDATE online_copies SET inventory_id = NULL
WHERE inventory_id = '3b42e85b-75d9-41e5-a90e-e6c1b1b0ee98';

DELETE FROM files WHERE inventory_id = '3b42e85b-75d9-41e5-a90e-e6c1b1b0ee98';
DELETE FROM inventories WHERE id = '3b42e85b-75d9-41e5-a90e-e6c1b1b0ee98';
DELETE FROM fonds WHERE id = '1106ad96-917b-47d6-88ab-3799874706c9';

COMMIT;
