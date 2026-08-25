-- ДАЧвО Н-307 fix: 4,296 pending connect_to_online_copy inventory_actions were
-- wrongly proposed against inventory b531742a (fond Н, опис 307) — the wide
-- matcher's range rule truncated refs like Н-307-1-3059. The FS reality is
-- fond Н307, опис 1..4, справа (Н307/1/3059).
--
-- Creates fond Н307 + its описи + справи (bare rows, bulk-import shape) and
-- MOVES the pending actions to file_actions targeting the right справа,
-- preserving created_by/created_at. The wrong inventory_actions are deleted.
-- Actions whose ref does not parse as Н-307-<опис>-<справа> are left untouched.
\set ON_ERROR_STOP on
\timing on
BEGIN;

CREATE TEMP TABLE wrong_actions AS
SELECT ia.id AS action_id, ia.created_at, ia.created_by, oc.id AS copy_id,
  regexp_replace(
    translate(upper(split_part(substring(oc.parsed from '^[^()]+-\((.*)\)$'), '+++', 1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'),
    '\s+', '', 'g') AS ref
FROM inventory_actions ia
JOIN online_copies oc ON oc.id = ia.online_copy_id
WHERE ia.inventory_id = 'b531742a-d905-4937-b014-7536073ef715'
  AND ia.resolved_at IS NULL AND ia.type = 'connect_to_online_copy';

CREATE TEMP TABLE moves AS
SELECT action_id, created_at, created_by, copy_id,
  split_part(ref, '-', 3) AS inv_code,
  split_part(ref, '-', 4) AS file_code
FROM wrong_actions
WHERE ref ~ '^Н-307-\d+-\d+[А-ЯІЇЄҐ]{0,2}$';

SELECT (SELECT count(*) FROM wrong_actions) AS wrong_total,
  count(*) AS movable, count(DISTINCT inv_code) AS inventories, count(DISTINCT (inv_code, file_code)) AS files
FROM moves;

WITH ins AS (
  INSERT INTO fonds (code, archive_id)
  SELECT 'Н307', a.id FROM archives a WHERE a.code = 'ДАЧвО'
  ON CONFLICT (code, archive_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS fonds_created FROM ins;

WITH ins AS (
  INSERT INTO inventories (code, fond_id)
  SELECT DISTINCT m.inv_code, f.id
  FROM moves m
  JOIN archives a ON a.code = 'ДАЧвО'
  JOIN fonds f ON f.archive_id = a.id AND f.code = 'Н307'
  ON CONFLICT (code, fond_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS inventories_created FROM ins;

WITH ins AS (
  INSERT INTO files (code, full_code, inventory_id)
  SELECT DISTINCT m.file_code, 'ДАЧвО-Н307-' || m.inv_code || '-' || m.file_code, i.id
  FROM moves m
  JOIN archives a ON a.code = 'ДАЧвО'
  JOIN fonds f ON f.archive_id = a.id AND f.code = 'Н307'
  JOIN inventories i ON i.fond_id = f.id AND i.code = m.inv_code
  ON CONFLICT (code, inventory_id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS files_created FROM ins;

WITH ins AS (
  INSERT INTO file_actions (created_at, created_by, type, online_copy_id, file_id)
  SELECT m.created_at, m.created_by, 'connect_to_online_copy'::"ActionType", m.copy_id, fl.id
  FROM moves m
  JOIN files fl ON fl.full_code = 'ДАЧвО-Н307-' || m.inv_code || '-' || m.file_code
  ON CONFLICT DO NOTHING
  RETURNING 1
)
SELECT count(*) AS file_actions_created FROM ins;

WITH del AS (
  DELETE FROM inventory_actions ia
  USING moves m
  WHERE ia.id = m.action_id
  RETURNING 1
)
SELECT count(*) AS inventory_actions_deleted FROM del;

-- what stays behind unparsed (expected 0)
SELECT count(*) AS left_unmoved FROM wrong_actions w
WHERE NOT EXISTS (SELECT 1 FROM moves m WHERE m.action_id = w.action_id);

COMMIT;
