-- DB-wide merge of file-level ТОМ/ЧАСТ volume records into single files.
-- Data-owner decisions (2026-07-27):
--   * volumes fold into base file (created when missing);
--   * titles: strip ", N арк." page counts; when volume titles genuinely differ,
--     use the longest common prefix trimmed to a word boundary (fallback: том1 title);
--   * existing base file keeps its own title (fill-if-empty).
-- Audit table mig_file_tom_merge is kept permanently.
-- Backup: ~/Projects/archive-duck/inspector_3_backup_<ts>.sql.gz (2026-07-27, pre-run)

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.lcp(a text, b text) RETURNS text AS $$
DECLARE n int := 0; m int := least(length(a), length(b));
BEGIN
  WHILE n < m AND substr(a, n+1, 1) = substr(b, n+1, 1) LOOP n := n + 1; END LOOP;
  RETURN left(a, n);
END $$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 1. volume files ───
CREATE TEMP TABLE vol AS
SELECT f.id, f.inventory_id, f.code, f.full_code, f.title,
  substring(f.code from '^(.+?)(?:ТОМ|ЧАСТ)(?=\d)') AS base_code,
  COALESCE((regexp_match(f.code, '(?:ТОМ|ЧАСТ)(\d+)'))[1]::int, 0) AS vol_n,
  NULLIF(trim(regexp_replace(f.title, ',?\s*\d+\s*арк\.?\s*$', '')), '') AS norm_title
FROM files f
WHERE f.code ~ '^.+(ТОМ|ЧАСТ)\d+[А-ЯA-Z]?$';
CREATE INDEX ON vol(inventory_id, base_code);

-- ─── 2. groups with computed title ───
CREATE TEMP TABLE grp AS
WITH g AS (
  SELECT inventory_id, base_code,
    count(*) AS vols,
    count(DISTINCT norm_title) AS dt,
    min(norm_title) AS t_min,
    max(norm_title) AS t_max,
    min(norm_title COLLATE "C") AS c_min,
    max(norm_title COLLATE "C") AS c_max,
    (array_agg(norm_title ORDER BY vol_n))[1] AS t_first,
    left((array_agg(full_code ORDER BY code))[1],
         length((array_agg(full_code ORDER BY code))[1]) - length((array_agg(code ORDER BY code))[1])) AS fc_prefix
  FROM vol GROUP BY 1, 2)
SELECT g.*, gen_random_uuid() AS new_id,
  b.id AS existing_base_id,
  CASE
    WHEN dt = 0 THEN NULL
    WHEN dt = 1 THEN t_min
    ELSE COALESCE(
      CASE WHEN pg_temp.lcp(c_min, c_max) = c_min THEN c_min          -- one title is a prefix of the rest: keep whole
      ELSE NULLIF(trim(regexp_replace(regexp_replace(
        regexp_replace(pg_temp.lcp(c_min, c_max), '\S*$', ''),      -- drop partial word
        '\s+(з|у|в|і|та|по|від|за|на|про|№)\s*$', ''),               -- drop dangling connector
        '[[:space:],;:\(\-–—]+$', '')), '') END,                      -- drop trailing punctuation
      t_first)                                                        -- fallback: том1 title
  END AS merged_title,
  CASE WHEN dt <= 1 THEN 'clean' ELSE 'common-prefix' END AS title_kind
FROM g
LEFT JOIN files b ON b.inventory_id = g.inventory_id AND b.code = g.base_code;

-- guard: prefix result shorter than 5 chars falls back to том1 title
UPDATE grp SET merged_title = t_first, title_kind = 'fallback-first'
WHERE title_kind = 'common-prefix' AND length(merged_title) < 5;

-- ─── 3. create missing base files (pre-generated ids in grp.new_id) ───
INSERT INTO files (id, code, full_code, title, inventory_id, updated_at)
SELECT new_id, base_code, fc_prefix || base_code, merged_title, inventory_id, now()
FROM grp WHERE existing_base_id IS NULL;

CREATE TEMP TABLE target AS
SELECT g.inventory_id, g.base_code, COALESCE(g.existing_base_id, g.new_id) AS target_id,
  g.existing_base_id IS NOT NULL AS pre_existing, g.merged_title, g.title_kind, g.vols
FROM grp g;

-- fill-if-empty title on pre-existing bases
UPDATE files b SET title = t.merged_title, updated_at = now()
FROM target t
WHERE b.id = t.target_id AND t.pre_existing
  AND (b.title IS NULL OR b.title = '') AND t.merged_title IS NOT NULL;

-- ─── 4. move online copies (dedupe against target + within group first) ───
CREATE TEMP TABLE vmap AS
SELECT v.id AS vol_id, t.target_id
FROM vol v JOIN target t ON t.inventory_id = v.inventory_id AND t.base_code = v.base_code;
CREATE INDEX ON vmap(vol_id);

-- drop would-be duplicates: same (resource_id, parsed, url) already at target
DELETE FROM file_online_copies foc
USING vmap m
WHERE foc.file_id = m.vol_id
  AND EXISTS (SELECT 1 FROM file_online_copies x
    WHERE x.file_id = m.target_id AND x.resource_id = foc.resource_id
      AND x.parsed = foc.parsed AND x.url = foc.url);
-- drop duplicates between sibling volumes (keep lowest id)
DELETE FROM file_online_copies foc
USING vmap m, file_online_copies o, vmap m2
WHERE foc.file_id = m.vol_id AND o.file_id = m2.vol_id
  AND m.target_id = m2.target_id AND o.id < foc.id
  AND o.resource_id = foc.resource_id AND o.parsed = foc.parsed AND o.url = foc.url;

UPDATE file_online_copies foc SET file_id = m.target_id, updated_at = now()
FROM vmap m WHERE foc.file_id = m.vol_id;

-- ─── 5. move years ───
INSERT INTO file_years (file_id, start_year, end_year)
SELECT DISTINCT m.target_id, fy.start_year, fy.end_year
FROM file_years fy JOIN vmap m ON m.vol_id = fy.file_id
ON CONFLICT DO NOTHING;

-- ─── 6. audit + delete volume files ───
CREATE TABLE IF NOT EXISTS mig_file_tom_merge (
  vol_full_code text, vol_title text, target_full_code text,
  target_title text, title_kind text, pre_existing boolean, merged_at timestamp DEFAULT now());
INSERT INTO mig_file_tom_merge (vol_full_code, vol_title, target_full_code, target_title, title_kind, pre_existing)
SELECT v.full_code, v.title, b.full_code, b.title, t.title_kind, t.pre_existing
FROM vol v JOIN vmap m ON m.vol_id = v.id
JOIN target t ON t.target_id = m.target_id JOIN files b ON b.id = t.target_id;

DELETE FROM files WHERE id IN (SELECT vol_id FROM vmap);

-- ─── 7. verify ───
DO $$
DECLARE leftover int; dup int; vcnt int;
BEGIN
  SELECT count(*) INTO leftover FROM files WHERE code ~ '^.+(ТОМ|ЧАСТ)\d+[А-ЯA-Z]?$';
  IF leftover <> 0 THEN RAISE EXCEPTION '% volume files left', leftover; END IF;
  SELECT count(*) INTO dup FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*) > 1) x;
  IF dup <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', dup; END IF;
  SELECT count(*) INTO vcnt FROM file_online_copies foc WHERE foc.file_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM files f WHERE f.id = foc.file_id);
  IF vcnt <> 0 THEN RAISE EXCEPTION '% orphan copies', vcnt; END IF;
  RAISE NOTICE 'verify OK';
END $$;

SELECT title_kind, pre_existing, count(*) AS vol_files, count(DISTINCT target_full_code) AS targets
FROM mig_file_tom_merge GROUP BY 1, 2 ORDER BY 3 DESC;

COMMIT;
