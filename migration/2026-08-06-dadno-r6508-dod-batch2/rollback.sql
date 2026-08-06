-- Rollback for create-and-link.sql (2026-08-06 ДАДнО-Р6508 дод. batch 2)
-- Run with psql from the REPO ROOT. Unlinks the 138 touched copies, then
-- deletes only the 2 created files.

CREATE TEMP TABLE r_links (online_copy_id uuid, file_id uuid, target_inventory uuid, sprava text, parsed text);
CREATE TEMP TABLE r_files (id uuid, code text, inventory_id uuid);
\copy r_links FROM 'migration/2026-08-06-dadno-r6508-dod-batch2/linked-copies.csv' CSV HEADER
\copy r_files FROM 'migration/2026-08-06-dadno-r6508-dod-batch2/created-files.csv' CSV HEADER

BEGIN;
UPDATE online_copies oc SET file_id = NULL
FROM r_links r WHERE oc.id = r.online_copy_id;
DELETE FROM files WHERE id IN (SELECT id FROM r_files);
COMMIT;
