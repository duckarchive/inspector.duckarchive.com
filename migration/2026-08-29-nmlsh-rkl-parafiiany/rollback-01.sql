-- rollback-01.sql — undo 01-apply.sql.
-- Deletes the files created by the import (created-files.csv, written by apply),
-- reverts info fills on the 3 pre-existing ЦДІАЛ files, drops the НМЛШ tree.
-- Run from this folder: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f rollback-01.sql
\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE t_created (full_code text);
\copy t_created FROM 'created-files.csv' CSV

-- guard: none of the created files gained online copies since the import
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM online_copies oc JOIN files f ON f.id = oc.file_id
  JOIN t_created c ON c.full_code = f.full_code;
  IF n > 0 THEN RAISE EXCEPTION '% online copies now attached to created files — aborting', n; END IF;
END $$;

DELETE FROM file_years fy USING files f, t_created c
WHERE fy.file_id = f.id AND f.full_code = c.full_code;

DELETE FROM files f USING t_created c WHERE f.full_code = c.full_code;

-- pre-existing files enriched by the import: info was empty before
UPDATE files SET info = NULL, updated_at = now()
WHERE full_code IN ('ЦДІАЛ-201-1-22', 'ЦДІАЛ-201-4А-187',
                    'ЦДІАЛ-201-4А-5580', 'ЦДІАЛ-201-4А-3212');

-- drop the НМЛШ tree (files already deleted above)
DELETE FROM inventories i USING fonds fo, archives a
WHERE i.fond_id = fo.id AND fo.archive_id = a.id AND a.code = 'НМЛШ';
DELETE FROM fonds fo USING archives a WHERE fo.archive_id = a.id AND a.code = 'НМЛШ';
DELETE FROM archives WHERE code = 'НМЛШ';

COMMIT;
