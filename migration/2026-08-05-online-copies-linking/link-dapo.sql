BEGIN;

WITH oc AS (
  SELECT id, resource_id,
         upper(regexp_replace(
           regexp_replace(parsed, '^(ДАПО)-[рР]-', '\1-Р'),
           '-([А-ЯЄІЇҐа-яєіїґA-Za-z])$', '\1')) AS norm
  FROM online_copies
  WHERE inventory_id IS NULL
    AND file_id IS NULL
    AND parsed LIKE 'ДАПО%'
    AND parsed !~ '^ДАПО-\('
),
m AS (
  SELECT oc.id AS copy_id, f.id AS file_id
  FROM oc
  JOIN files f ON f.full_code = oc.norm
  -- guard: never create a second copy of the same resource on the target file
  WHERE NOT EXISTS (
    SELECT 1 FROM online_copies o2
    WHERE o2.file_id = f.id AND o2.resource_id = oc.resource_id
  )
)
UPDATE online_copies o
SET file_id = m.file_id, updated_at = now()
FROM m
WHERE o.id = m.copy_id;

COMMIT;
