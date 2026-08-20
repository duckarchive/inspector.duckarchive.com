-- Rollback for cleanup-info-registry.sql: restores authors.info for the 337
-- linked authors from pre-state-info.csv.
--
-- Run from this directory:  psql "$DB" -f rollback-info-cleanup.sql

CREATE TEMP TABLE pre (id uuid, info text);
\copy pre FROM 'pre-state-info.csv' CSV HEADER

BEGIN;

UPDATE authors a
SET info = p.info
FROM pre p
WHERE a.id = p.id AND a.info IS DISTINCT FROM p.info;

-- verification: expect 337 carrying 'Реєстр:' again
SELECT count(*) FILTER (WHERE a.info LIKE '%Реєстр:%') AS with_registry
FROM authors a JOIN pre p ON p.id = a.id;

COMMIT;
