-- Rollback for link.sql (2026-08-06 ДАДнО-Р6508-6ДОД linking)
-- Run with psql from the REPO ROOT. Unlinks only the 24 copies this
-- migration touched (before-unlinked.csv); no rows were created.

CREATE TEMP TABLE r_links (id uuid, resource_id uuid, parsed text, url text);
\copy r_links FROM 'migration/2026-08-06-dadno-r6508-6dod-linking/before-unlinked.csv' CSV HEADER

BEGIN;
UPDATE online_copies oc SET file_id = NULL
FROM r_links r WHERE oc.id = r.id;
COMMIT;
