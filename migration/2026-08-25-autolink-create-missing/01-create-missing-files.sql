-- Tier C: unlinked online copies whose parsed code resolves to an EXISTING
-- inventory but the справа row is missing from the catalog. Creates the file
-- (bare row: code + full_code, NULL title/info/tags — bulk-import shape) and
-- links the copy directly (no action queue — one-off admin migration).
--
-- Guards: plausible справа code (^\d+[А-ЯІЇЄҐ]{0,2}$, ≤20 chars), exactly one
-- inventory candidate per copy, ЦДНТА excluded (FS internal renumbering trap),
-- copies with pending actions excluded. том/частина copies collapse onto one
-- base справа per the 2026-08-05 conventions.
\set ON_ERROR_STOP on
\timing on
BEGIN;

CREATE TEMP TABLE leftovers AS
WITH unlinked AS (
  SELECT oc.id, oc.parsed,
    CASE
      WHEN oc.parsed LIKE '%+++%' AND oc.parsed ~ '^[^()]+-\(.*\)$'
        THEN substring(oc.parsed from '^([^()]+)-\(') || '-' || trim(split_part(substring(oc.parsed from '^[^()]+-\((.*)\)$'), '+++', 1))
      ELSE oc.parsed
    END AS code0
  FROM online_copies oc
  WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL AND oc.parsed <> ''
    AND NOT EXISTS (SELECT 1 FROM file_actions fa WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM inventory_actions ia WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL)
),
norm AS (
  SELECT id, parsed,
    regexp_replace(
      regexp_replace(
        translate(upper(code0), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'),
        '-(Р|П)[-. ](?=\d)', '-\1', 'g'),
      '\s+', '', 'g') AS code
  FROM unlinked
),
stripped AS (
  SELECT id, parsed, code,
    regexp_replace(code, '\(?(Ч|ТОМ|Т|ЧАСТИНА)\.?\d+\)?$', '') AS code_base,
    regexp_replace(code, '-?\(?(ОПИС|ОПИСЬ)\)?$', '') AS inv_code
  FROM norm
),
ff AS (
  SELECT translate(upper(full_code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
  FROM files WHERE full_code <> ''
),
ii0 AS (
  SELECT translate(upper(a.code || '-' || f.code || '-' || i.code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
  FROM inventories i JOIN fonds f ON f.id = i.fond_id JOIN archives a ON a.id = f.archive_id
)
SELECT s.* FROM stripped s
WHERE NOT EXISTS (SELECT 1 FROM ff WHERE ff.folded = s.code)
  AND NOT EXISTS (SELECT 1 FROM ff WHERE ff.folded = s.code_base)
  AND NOT EXISTS (SELECT 1 FROM ii0 WHERE ii0.folded = s.inv_code)
  AND NOT EXISTS (
    SELECT 1 FROM ii0 WHERE s.inv_code ~ '^.+-\d+-\d+$'
      AND (substring(s.inv_code from '-(\d+)-\d+$'))::numeric < (substring(s.inv_code from '-(\d+)$'))::numeric
      AND ii0.folded = substring(s.inv_code from '^(.+)-\d+-\d+$'));

CREATE TEMP TABLE ii_full AS
SELECT i.id AS inventory_id, a.code AS a_code,
  a.code || '-' || f.code || '-' || i.code AS inv_full_code,
  translate(upper(a.code || '-' || f.code || '-' || i.code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
FROM inventories i JOIN fonds f ON f.id = i.fond_id JOIN archives a ON a.id = f.archive_id;

CREATE TEMP TABLE cand AS
SELECT l.id AS online_copy_id,
  min(i.inventory_id::text)::uuid AS inventory_id,
  min(i.inv_full_code) AS inv_full_code,
  substring(l.code_base from '([^-]+)$') AS file_code
FROM leftovers l
JOIN ii_full i ON i.folded = substring(l.code_base from '^(.+)-[^-]+$')
WHERE l.code_base ~ '^.+-[^-]+$'
  AND substring(l.code_base from '([^-]+)$') ~ '^\d+[А-ЯІЇЄҐ]{0,2}$'
  AND length(substring(l.code_base from '([^-]+)$')) <= 20
  AND i.a_code <> 'ЦДНТА'
GROUP BY l.id, l.code_base
HAVING count(DISTINCT i.inventory_id) = 1;

SELECT count(*) AS copies_to_link, count(DISTINCT (inventory_id, file_code)) AS files_to_create FROM cand;

WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT c.file_code, c.inv_full_code || '-' || c.file_code, c.inventory_id
  FROM cand c
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS files_created FROM ins;

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = f.id, updated_at = now()
  FROM cand c
  JOIN files f ON f.inventory_id = c.inventory_id AND f.code = c.file_code
  WHERE oc.id = c.online_copy_id
  RETURNING 1
)
SELECT count(*) AS copies_linked FROM upd;

COMMIT;
