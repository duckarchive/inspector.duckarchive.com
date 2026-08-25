-- Part 2 of the ДАЧвО Н-307 fix: 240 online copies (refs Н-307-<опис>-<справа>)
-- were wrongly linked to files "1" and "3" of the bogus fond Н / опис 307.
-- Relinks them to their real справи under fond Н307 (creating the missing bare
-- file rows), then removes the bogus subtree: files 1 & 3, опис 307, fond Н.
-- Copies are relinked BEFORE deletion — online_copies FKs cascade on delete.
\set ON_ERROR_STOP on
\timing on
BEGIN;

CREATE TEMP TABLE wrong AS
SELECT oc.id AS copy_id,
  split_part(r.ref, '-', 3) AS inv_code,
  split_part(r.ref, '-', 4) AS file_code
FROM online_copies oc
CROSS JOIN LATERAL (
  SELECT regexp_replace(
    translate(upper(split_part(substring(oc.parsed from '^[^()]+-\((.*)\)$'), '+++', 1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'),
    '\s+', '', 'g') AS ref
) r
WHERE oc.file_id IN ('69e5cbeb-c712-4f1d-b07d-8f411ddd9931', 'a7b5b6a8-752a-4338-a9b7-02b4a643f2a8')
  AND r.ref ~ '^Н-307-\d+-\d+[А-ЯІЇЄҐ]{0,2}$';

SELECT count(*) AS to_relink, count(DISTINCT inv_code) AS inventories, count(DISTINCT (inv_code, file_code)) AS distinct_files FROM wrong;

WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT w.inv_code, f.id
  FROM wrong w
  JOIN archives a ON a.code = 'ДАЧвО'
  JOIN fonds f ON f.archive_id = a.id AND f.code = 'Н307'
  ON CONFLICT (code, fond_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS inventories_created FROM ins;

WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT w.file_code, 'ДАЧвО-Н307-' || w.inv_code || '-' || w.file_code, i.id
  FROM wrong w
  JOIN archives a ON a.code = 'ДАЧвО'
  JOIN fonds f ON f.archive_id = a.id AND f.code = 'Н307'
  JOIN inventories i ON i.fond_id = f.id AND i.code = w.inv_code
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS files_created FROM ins;

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = fl.id, updated_at = now()
  FROM wrong w
  JOIN files fl ON fl.full_code = 'ДАЧвО-Н307-' || w.inv_code || '-' || w.file_code
  WHERE oc.id = w.copy_id
  RETURNING 1
)
SELECT count(*) AS copies_relinked FROM upd;

-- the bogus subtree must be copy-free before deletion (FKs cascade-delete copies)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM online_copies
  WHERE file_id IN ('69e5cbeb-c712-4f1d-b07d-8f411ddd9931', 'a7b5b6a8-752a-4338-a9b7-02b4a643f2a8')
     OR inventory_id = 'b531742a-d905-4937-b014-7536073ef715';
  IF n > 0 THEN RAISE EXCEPTION 'still % copies linked to the bogus subtree', n; END IF;
END $$;

WITH del AS (
  DELETE FROM files WHERE inventory_id = 'b531742a-d905-4937-b014-7536073ef715' RETURNING 1
)
SELECT count(*) AS files_deleted FROM del;

DELETE FROM inventories WHERE id = 'b531742a-d905-4937-b014-7536073ef715';
DELETE FROM fonds f USING archives a
WHERE f.archive_id = a.id AND a.code = 'ДАЧвО' AND f.code = 'Н';

SELECT count(*) AS fond_n_left FROM fonds f JOIN archives a ON a.id = f.archive_id WHERE a.code = 'ДАЧвО' AND f.code = 'Н';

COMMIT;
