-- Rollback for create-and-link.sql (2026-08-06 ДАОО bulk linking)
-- Run with psql from the REPO ROOT (relative \copy paths).
-- Order matters: unlink copies first, then delete files → invs → fonds
-- (created-only ids, loaded from the audit CSVs; pre-existing catalog
-- rows that some copies were linked to are never deleted).

CREATE TEMP TABLE r_fonds (id uuid, code text);
CREATE TEMP TABLE r_invs  (id uuid, code text, fond_id uuid);
CREATE TEMP TABLE r_files (id uuid, code text, inventory_id uuid);
CREATE TEMP TABLE r_links (online_copy_id uuid, seg text, fond text, inv text, file text, file_id uuid, inventory_id uuid);

\copy r_fonds FROM 'migration/2026-08-06-daoo-bulk-linking/created-fonds.csv' CSV HEADER
\copy r_invs  FROM 'migration/2026-08-06-daoo-bulk-linking/created-invs.csv' CSV HEADER
\copy r_files FROM 'migration/2026-08-06-daoo-bulk-linking/created-files.csv' CSV HEADER
\copy r_links FROM 'migration/2026-08-06-daoo-bulk-linking/linked-copies.csv' CSV HEADER

BEGIN;

UPDATE online_copies oc SET file_id = NULL
FROM r_links r WHERE oc.id = r.online_copy_id AND r.file_id IS NOT NULL;

UPDATE online_copies oc SET inventory_id = NULL
FROM r_links r WHERE oc.id = r.online_copy_id AND r.inventory_id IS NOT NULL;

DELETE FROM files       WHERE id IN (SELECT id FROM r_files);
DELETE FROM inventories WHERE id IN (SELECT id FROM r_invs);
DELETE FROM fonds       WHERE id IN (SELECT id FROM r_fonds);

COMMIT;
