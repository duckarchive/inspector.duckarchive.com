-- Rollback for create-and-link.sql (2026-08-06, ЦДІАК-128-1заг. linking)
-- Unlink online_copies BEFORE deleting the files they now point to
-- (online_copies.file_id is ON DELETE CASCADE, but we unlink explicitly
-- for a clean two-step, auditable rollback).

BEGIN;

UPDATE online_copies oc
SET file_id = NULL
FROM files f
WHERE oc.file_id = f.id
  AND f.inventory_id = '6e8cf222-b07f-48f8-9bc5-26e288e2091f'
  AND f.code IN ('27','30','88','213','223','250','287','305','306','344','346',
                 '366','380','401','406','412','430','441','444','451','480',
                 '483','546','588','689');

DELETE FROM files
WHERE inventory_id = '6e8cf222-b07f-48f8-9bc5-26e288e2091f'
  AND code IN ('27','30','88','213','223','250','287','305','306','344','346',
               '366','380','401','406','412','430','441','444','451','480',
               '483','546','588','689');

COMMIT;
