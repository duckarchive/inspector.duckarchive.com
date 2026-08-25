-- Undo 01-accept.sql: unlink the copies and reopen the actions.
\set ON_ERROR_STOP on
BEGIN;

DROP TABLE IF EXISTS r_acc;
CREATE TEMP TABLE r_acc (action_id uuid, online_copy_id uuid, file_id uuid,
                         full_code text, parsed text, url text);
\copy r_acc FROM 'audit/accepted.csv' CSV HEADER

UPDATE online_copies oc SET file_id = NULL, updated_at = now()
FROM r_acc r WHERE oc.id = r.online_copy_id AND oc.file_id = r.file_id;

UPDATE file_actions fa SET resolved_at = NULL, resolved_by = NULL, is_rejected = NULL
FROM r_acc r WHERE fa.id = r.action_id;

SELECT 'rolled back' AS step, count(*) FROM r_acc;

COMMIT;
