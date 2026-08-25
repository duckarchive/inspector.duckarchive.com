-- Tier B: unlinked online copies whose parsed code is a clean 4-segment
-- архів-фонд-опис-справа ref where the fond EXISTS but the whole опис is
-- missing from the catalog. Creates the inventory (bare: code + fond_id),
-- the справа rows under it, and links the copies directly.
--
-- Tier B0: copies with an explicit `(опис)` marker whose fond exists but the
-- опис doesn't → create the inventory and link the copy at inventory level.
--
-- Deliberately NOT handled: bare 2-segment `фонд-N` refs with a missing опис —
-- ambiguous (N is often a справа with опис 1 elided, cf. FS titles like
-- `218-1-103` for ref `218-103`); left for manual review.
--
-- Run AFTER 01-create-missing-files.sql (the leftovers pool is recomputed, so
-- copies handled there are already linked and excluded here).
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

CREATE TEMP TABLE af AS
SELECT f.id AS fond_id, a.code AS a_code,
  a.code || '-' || f.code AS fond_full,
  translate(upper(a.code || '-' || f.code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
FROM fonds f JOIN archives a ON a.id = f.archive_id;

CREATE TEMP TABLE ii_full AS
SELECT i.id AS inventory_id,
  translate(upper(a.code || '-' || f.code || '-' || i.code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
FROM inventories i JOIN fonds f ON f.id = i.fond_id JOIN archives a ON a.id = f.archive_id;

-- B0: explicit (опис)-marker refs, fond exists, опис missing → inventory + link
CREATE TEMP TABLE cand_b0 AS
SELECT l.id AS online_copy_id,
  min(af.fond_id::text)::uuid AS fond_id,
  substring(l.inv_code from '([^-]+)$') AS inv_code
FROM leftovers l
JOIN af ON af.folded = substring(l.inv_code from '^(.+)-[^-]+$')
WHERE l.code <> l.inv_code
  AND l.inv_code ~ '^.+-[^-]+$'
  AND substring(l.inv_code from '([^-]+)$') ~ '^\d+[А-ЯІЇЄҐ]{0,2}$'
  AND length(substring(l.inv_code from '([^-]+)$')) <= 20
  AND af.a_code <> 'ЦДНТА'
GROUP BY l.id, l.inv_code
HAVING count(DISTINCT af.fond_id) = 1;

SELECT count(*) AS b0_copies, count(DISTINCT (fond_id, inv_code)) AS b0_inventories FROM cand_b0;

-- B: 4-segment refs, fond exists, опис (and file) missing → inventory + file + link
CREATE TEMP TABLE cand_b AS
SELECT l.id AS online_copy_id,
  min(af.fond_id::text)::uuid AS fond_id,
  min(af.fond_full) AS fond_full,
  substring(l.code_base from '([^-]+)-[^-]+$') AS inv_code,
  substring(l.code_base from '([^-]+)$') AS file_code
FROM leftovers l
JOIN af ON af.folded = substring(l.code_base from '^(.+)-[^-]+-[^-]+$')
WHERE l.code_base ~ '^.+-[^-]+-[^-]+$'
  AND substring(l.code_base from '([^-]+)-[^-]+$') ~ '^\d+[А-ЯІЇЄҐ]{0,2}$'
  AND substring(l.code_base from '([^-]+)$') ~ '^\d+[А-ЯІЇЄҐ]{0,2}$'
  AND length(substring(l.code_base from '([^-]+)-[^-]+$')) <= 20
  AND length(substring(l.code_base from '([^-]+)$')) <= 20
  AND af.a_code <> 'ЦДНТА'
  AND NOT EXISTS (SELECT 1 FROM ii_full ii WHERE ii.folded = substring(l.code_base from '^(.+)-[^-]+$'))
GROUP BY l.id, l.code_base
HAVING count(DISTINCT af.fond_id) = 1;

SELECT count(*) AS b_copies,
  count(DISTINCT (fond_id, inv_code)) AS b_inventories,
  count(DISTINCT (fond_id, inv_code, file_code)) AS b_files
FROM cand_b;

WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT inv_code, fond_id FROM cand_b0
  UNION
  SELECT DISTINCT inv_code, fond_id FROM cand_b
  ON CONFLICT (code, fond_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS inventories_created FROM ins;

WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT c.file_code, c.fond_full || '-' || c.inv_code || '-' || c.file_code, i.id
  FROM cand_b c
  JOIN inventories i ON i.fond_id = c.fond_id AND i.code = c.inv_code
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS files_created FROM ins;

WITH upd AS (
  UPDATE online_copies oc
  SET inventory_id = i.id, updated_at = now()
  FROM cand_b0 c
  JOIN inventories i ON i.fond_id = c.fond_id AND i.code = c.inv_code
  WHERE oc.id = c.online_copy_id
  RETURNING 1
)
SELECT count(*) AS b0_copies_linked FROM upd;

WITH upd AS (
  UPDATE online_copies oc
  SET file_id = f.id, updated_at = now()
  FROM cand_b c
  JOIN inventories i ON i.fond_id = c.fond_id AND i.code = c.inv_code
  JOIN files f ON f.inventory_id = i.id AND f.code = c.file_code
  WHERE oc.id = c.online_copy_id
  RETURNING 1
)
SELECT count(*) AS b_copies_linked FROM upd;

COMMIT;
