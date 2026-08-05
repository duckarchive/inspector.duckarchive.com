\set ON_ERROR_STOP on
SET statement_timeout = '300s';

CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.norm2(p text) RETURNS text AS $$
  SELECT regexp_replace(
           regexp_replace(pg_temp.fold($1), '^([^-]+)-([РП])-', '\1-\2'),
           '-([А-ЯЄІЇҐA-Z])$', '\1');
$$ LANGUAGE sql IMMUTABLE;

CREATE TEMP TABLE cand AS
SELECT oc.id AS copy_id, oc.parsed, oc.resource_id, f.id AS file_id, f.full_code
FROM online_copies oc
JOIN files f ON pg_temp.fold(f.full_code) = pg_temp.norm2(oc.parsed)
WHERE oc.inventory_id IS NULL
  AND oc.file_id IS NULL
  AND oc.parsed !~ '\(';

-- refuse to run if any copy resolved to more than one file
DO $$
DECLARE dup int;
BEGIN
  SELECT count(*) INTO dup FROM (SELECT copy_id FROM cand GROUP BY 1 HAVING count(*) > 1) x;
  IF dup > 0 THEN RAISE EXCEPTION 'ambiguous candidates: %', dup; END IF;
END $$;

BEGIN;

UPDATE online_copies o
SET file_id = c.file_id, updated_at = now()
FROM cand c
WHERE o.id = c.copy_id
  -- guard: never give a file a second copy from the same resource
  AND NOT EXISTS (
    SELECT 1 FROM online_copies o2
    WHERE o2.file_id = c.file_id AND o2.resource_id = c.resource_id
  );

COMMIT;

\copy (SELECT copy_id, parsed, full_code, file_id FROM cand ORDER BY parsed) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rest-online-copy-file-map.csv' CSV HEADER
\copy (SELECT 'UPDATE online_copies SET file_id = NULL WHERE id = '''||copy_id||''';' FROM cand) TO '/private/tmp/claude-501/-Users-alexandrtovmach-Developer-duckarchive-inspector-duckarchive-com/c5db3155-cefe-4b8d-98e1-53519ff70e7b/scratchpad/rollback-rest-link.sql'
