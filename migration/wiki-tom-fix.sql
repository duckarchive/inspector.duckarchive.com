-- Fix the том/ЧАСТ structures re-created by the 2026-07-29 wikisource enrichment
-- (staging guard 0b regex ^\d+(ТОМ\d+|ПР)$ missed glued short forms: 2РТ2, 1Т16, 18Ч2)
-- plus legacy glued file codes (10001ПТ2) that survived file-tom-merge.
-- Data-owner approved 2026-07-31: buckets A, B, C.
--
--   A: delete wiki junk-title том duplicates
--      * ДАКрО-П5907 2РТ1..2РТ23 — per-том numbering restarts at 1, titles are
--        «NNNN-П» numbers; base 2Р holds the real files with FS copies
--        (re-applies the 2026-07-27 2r-tom-cleanup owner decision)
--      * ДАДнО-Р6478 1Т2,1Т16..1Т20 — «/NNNNN/» junk titles; base опис 1 fully
--        titled from OCR books; томи tile continuously so years merge by code first
--      * ДАСО-Р7720 18Ч2 — wiki twin of the pre-existing genuine 18ЧАСТ2
--      * «том-book» file rows (files coded 2РТ1…, 1Т1…, 2Т1/2Т2, Т6 inside base описи)
--      * empty том-coded описи (ЦДАВО ?ОСТ?, ДАК 41Т1-3, ДАДнО 1Т3-13/1ДТ2 …)
--   B: fold real-title wiki томи into base by code (continuous tiling verified):
--      ДАДнО-Р6478 1Т1,1Т14,1Т15,1Т37,2Т1,2Т2 → описи 1/2; ДАВоО-35 9Т6 → 9.
--      Fill-if-empty titles, merge years, move code-missing rows, keep base titles
--      on conflict (logged).
--   C: legacy glued file codes ^digits[letter]?(Т|Ч)digits[letter]?$ fold into the
--      existing base file in the same опис (authors/copies/years re-pointed);
--      no base file -> logged for review, row untouched. ЦДІАК-128 excluded (curated).
--
-- Out of scope (bucket D, owner review): ДАСО 18ЧАСТ2, ДАДнО-Р6508 10ДОДТ2
-- (owner rejected merge_to in editor 2026-07-26), ДАХеО-Р471 1ЧАСТ, ДАОО-Р16 124ЧАСТ2.
--
-- Audit table mig_wiki_tom_fix is kept permanently. Idempotent: re-run touches 0 rows.

BEGIN;

-- ─── 0. scope: targeted описи ───
CREATE TEMP TABLE t_inv AS
SELECT i.id, a.code AS arch, fo.code AS fond, i.code, fo.id AS fond_id,
  CASE
    WHEN a.code='ДАКрО' AND fo.code='П5907'                                    THEN 'a-junk'
    WHEN a.code='ДАДнО' AND i.code IN ('1Т2','1Т16','1Т17','1Т18','1Т19','1Т20') THEN 'a-junk'
    WHEN a.code='ДАСО'                                                          THEN 'a-twin'
    ELSE 'b-fold'
  END AS bucket,
  regexp_replace(i.code, 'Т\d+$', '') AS base_code
FROM inventories i
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE (a.code='ДАКрО' AND fo.code='П5907' AND i.code ~ '^2РТ([1-9]|1[0-9]|2[0-3])$')
   OR (a.code='ДАДнО' AND fo.code='Р6478' AND i.code ~ '^(1Т(1|2|14|15|16|17|18|19|20|37)|2Т[12])$')
   OR (a.code='ДАСО'  AND fo.code='Р7720' AND i.code='18Ч2')
   OR (a.code='ДАВоО' AND fo.code='35'    AND i.code='9Т6');

ALTER TABLE t_inv ADD COLUMN base_id uuid;
UPDATE t_inv t SET base_id = b.id
FROM inventories b
WHERE b.fond_id = t.fond_id AND b.code = t.base_code AND b.id <> t.id;

-- pre-state snapshot for the verify block
CREATE TEMP TABLE pre AS
SELECT
  (SELECT count(*) FROM files) AS files_total,
  (SELECT count(*) FROM files fl JOIN inventories i ON i.id=fl.inventory_id
     JOIN fonds fo ON fo.id=i.fond_id JOIN archives a ON a.id=fo.archive_id
     WHERE a.code='ЦДІАК' AND fo.code='128') AS cdiak128_files,
  (SELECT count(*) FROM files fl JOIN inventories i ON i.id=fl.inventory_id
     JOIN fonds fo ON fo.id=i.fond_id
     WHERE fo.code='Р7720' AND i.code='18ЧАСТ2') AS chast2_files,
  (SELECT count(*) FROM files fl JOIN t_inv t ON t.id=fl.inventory_id WHERE t.bucket='b-fold'
     AND NOT EXISTS (SELECT 1 FROM files b WHERE b.inventory_id=t.base_id AND b.code=fl.code)) AS moves_expected;

-- ─── 0a. guards: abort on any drift from the analyzed state ───
DO $$
DECLARE bad int; r record;
BEGIN
  -- every targeted опис needs its base except the ДАСО twin (deleted outright)
  SELECT count(*) INTO bad FROM t_inv WHERE base_id IS NULL AND bucket <> 'a-twin';
  IF bad <> 0 THEN RAISE EXCEPTION '% targeted описи lack a base опис', bad; END IF;

  -- files under targeted описи must have no copies/authors/actions/locations
  SELECT count(*) INTO bad FROM files fl JOIN t_inv t ON t.id = fl.inventory_id
  WHERE EXISTS (SELECT 1 FROM file_online_copies x WHERE x.file_id = fl.id)
     OR EXISTS (SELECT 1 FROM file_authors     x WHERE x.file_id = fl.id)
     OR EXISTS (SELECT 1 FROM file_actions     x WHERE x.file_id = fl.id)
     OR EXISTS (SELECT 1 FROM file_locations   x WHERE x.file_id = fl.id);
  IF bad <> 0 THEN RAISE EXCEPTION '% files under targeted описи have children', bad; END IF;

  -- no inventory-level copies or actions on targeted описи
  SELECT count(*) INTO bad FROM t_inv t
  WHERE EXISTS (SELECT 1 FROM inventory_online_copies x WHERE x.inventory_id = t.id)
     OR EXISTS (SELECT 1 FROM inventory_actions      x WHERE x.inventory_id = t.id);
  IF bad <> 0 THEN RAISE EXCEPTION '% targeted описи have copies/actions', bad; END IF;

  -- a-junk описи must still be ≥95%% junk-number titles
  FOR r IN
    SELECT t.arch, t.code,
      count(*) FILTER (WHERE fl.title ~ '^\s*/?\d+\s*([-–—]\s*\S+)?/?\s*$')::float
        / greatest(count(*),1) AS junk_frac
    FROM t_inv t JOIN files fl ON fl.inventory_id = t.id
    WHERE t.bucket = 'a-junk' GROUP BY 1,2
  LOOP
    IF r.junk_frac < 0.95 THEN
      RAISE EXCEPTION 'опис %-% junk fraction %, expected ≥0.95', r.arch, r.code, r.junk_frac;
    END IF;
  END LOOP;

  -- the ДАСО twin: genuine 18ЧАСТ2 must exist with its copies
  SELECT count(*) INTO bad FROM inventories i JOIN fonds fo ON fo.id=i.fond_id
  WHERE fo.code='Р7720' AND i.code='18ЧАСТ2'
    AND EXISTS (SELECT 1 FROM files fl JOIN file_online_copies c ON c.file_id=fl.id
                WHERE fl.inventory_id=i.id);
  IF bad <> 1 THEN RAISE EXCEPTION '18ЧАСТ2 twin missing or lost its copies'; END IF;
  RAISE NOTICE 'guards OK';
END $$;

-- ─── 1. audit table ───
CREATE TABLE IF NOT EXISTS mig_wiki_tom_fix (
  bucket text, action text, full_code text, code text, title text,
  target_full_code text, target_title text, note text, at timestamp DEFAULT now());

-- ─── 2. bucket A: «том-book» file rows inside base описи ───
CREATE TEMP TABLE book_rows AS
SELECT fl.id, fl.code, fl.full_code, fl.title
FROM files fl
JOIN inventories i ON i.id = fl.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE (a.code='ДАКрО' AND fo.code='П5907' AND i.code='2Р' AND fl.code ~ '^2РТ\d+$')
   OR (a.code='ДАДнО' AND fo.code='Р6478' AND i.code='1'  AND fl.code ~ '^1Т\d+$')
   OR (a.code='ДАДнО' AND fo.code='Р6478' AND i.code='2'  AND fl.code ~ '^2Т\d+$')
   OR (a.code='ДАВоО' AND fo.code='35'    AND i.code='9'  AND fl.code = 'Т6');

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM book_rows b
  WHERE EXISTS (SELECT 1 FROM file_online_copies x WHERE x.file_id = b.id)
     OR EXISTS (SELECT 1 FROM file_authors x WHERE x.file_id = b.id)
     OR EXISTS (SELECT 1 FROM file_actions x WHERE x.file_id = b.id);
  IF bad <> 0 THEN RAISE EXCEPTION '% book rows have children', bad; END IF;
END $$;

INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title)
SELECT 'a', 'delete-book-row', full_code, code, title FROM book_rows;
DELETE FROM files WHERE id IN (SELECT id FROM book_rows);

-- ─── 3. bucket B: fold real-title томи into base by code ───
CREATE TEMP TABLE bmap AS
SELECT fl.id AS vol_id, fl.code, fl.full_code, fl.title AS vol_title,
       t.arch, t.fond, t.code AS inv_code, t.base_id, bi.code AS base_inv_code,
       bf.id AS base_file_id, bf.title AS base_title, bf.full_code AS base_full_code
FROM files fl
JOIN t_inv t ON t.id = fl.inventory_id AND t.bucket = 'b-fold'
JOIN inventories bi ON bi.id = t.base_id
LEFT JOIN files bf ON bf.inventory_id = t.base_id AND bf.code = fl.code;

-- 3a. fill-if-empty base titles (never with junk-number titles)
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, target_full_code, target_title)
SELECT 'b', 'fold-fill-title', m.full_code, m.code, m.vol_title, m.base_full_code, m.base_title
FROM bmap m WHERE m.base_file_id IS NOT NULL
  AND coalesce(m.base_title,'') = '' AND coalesce(m.vol_title,'') <> ''
  AND m.vol_title !~ '^\s*/?\d+\s*([-–—]\s*\S+)?/?\s*$';

UPDATE files bf SET title = m.vol_title, updated_at = now()
FROM bmap m
WHERE bf.id = m.base_file_id
  AND coalesce(bf.title,'') = '' AND coalesce(m.vol_title,'') <> ''
  AND m.vol_title !~ '^\s*/?\d+\s*([-–—]\s*\S+)?/?\s*$';

-- 3b. title conflicts: keep base, log for review
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, target_full_code, target_title, note)
SELECT 'b', 'fold-title-conflict', m.full_code, m.code, m.vol_title, m.base_full_code, m.base_title, 'kept base title'
FROM bmap m WHERE m.base_file_id IS NOT NULL
  AND coalesce(m.base_title,'') <> '' AND coalesce(m.vol_title,'') <> ''
  AND lower(m.base_title) <> lower(m.vol_title);

-- 3c. merge years into matched base files
INSERT INTO file_years (file_id, start_year, end_year)
SELECT DISTINCT m.base_file_id, y.start_year, y.end_year
FROM file_years y JOIN bmap m ON m.vol_id = y.file_id
WHERE m.base_file_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3d. move code-missing rows into the base опис (full_code from entity join)
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, target_full_code)
SELECT 'b', 'fold-move', m.full_code, m.code, m.vol_title,
       m.arch || '-' || m.fond || '-' || m.base_inv_code || '-' || m.code
FROM bmap m WHERE m.base_file_id IS NULL;

UPDATE files fl
SET inventory_id = m.base_id,
    full_code = m.arch || '-' || m.fond || '-' || m.base_inv_code || '-' || m.code,
    updated_at = now()
FROM bmap m WHERE fl.id = m.vol_id AND m.base_file_id IS NULL;

-- 3e. delete the matched (duplicate) том rows
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, target_full_code, target_title)
SELECT 'b', 'fold-delete-dup', m.full_code, m.code, m.vol_title, m.base_full_code, m.base_title
FROM bmap m WHERE m.base_file_id IS NOT NULL;
DELETE FROM files WHERE id IN (SELECT vol_id FROM bmap WHERE base_file_id IS NOT NULL);

-- ─── 4. bucket A: junk-title томи + the ДАСО twin ───
-- 4a. ДАДнО tile continuously → salvage years into base files by code first
INSERT INTO file_years (file_id, start_year, end_year)
SELECT DISTINCT bf.id, y.start_year, y.end_year
FROM files fl
JOIN t_inv t ON t.id = fl.inventory_id AND t.bucket = 'a-junk' AND t.arch = 'ДАДнО'
JOIN files bf ON bf.inventory_id = t.base_id AND bf.code = fl.code
JOIN file_years y ON y.file_id = fl.id
ON CONFLICT DO NOTHING;

-- 4b. log + delete all files under a-junk / a-twin описи
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, note)
SELECT 'a', CASE t.bucket WHEN 'a-twin' THEN 'delete-twin' ELSE 'delete-junk' END,
       fl.full_code, fl.code, fl.title, t.arch || '-' || t.fond || '-' || t.code
FROM files fl JOIN t_inv t ON t.id = fl.inventory_id AND t.bucket IN ('a-junk','a-twin');

DELETE FROM files fl USING t_inv t
WHERE fl.inventory_id = t.id AND t.bucket IN ('a-junk','a-twin');

-- ─── 5. delete the targeted (now empty) описи, salvaging their year rows ───
INSERT INTO inventory_years (inventory_id, start_year, end_year)
SELECT DISTINCT t.base_id, y.start_year, y.end_year
FROM inventory_years y JOIN t_inv t ON t.id = y.inventory_id
WHERE t.base_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, note)
SELECT left(t.bucket,1), 'delete-inventory', t.arch || '-' || t.fond || '-' || t.code, t.code,
       'base=' || coalesce(t.base_code,'-') FROM t_inv t;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM files fl JOIN t_inv t ON t.id = fl.inventory_id;
  IF bad <> 0 THEN RAISE EXCEPTION '% files still under targeted описи', bad; END IF;
END $$;
DELETE FROM inventories WHERE id IN (SELECT id FROM t_inv);

-- ─── 6. bucket A: empty том-coded описи (generic sweep, ЦДІАК-128 excluded) ───
CREATE TEMP TABLE empty_tomi AS
SELECT i.id, a.code AS arch, fo.code AS fond, i.code, fo.id AS fond_id,
       regexp_replace(i.code, '(Т|ТОМ)\.?\s?\d+$', '') AS base_code
FROM inventories i
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
WHERE i.code ~* '(т|том|ч|част)\.?\s?\d+$'
  AND NOT (a.code = 'ЦДІАК' AND fo.code = '128')
  AND NOT EXISTS (SELECT 1 FROM files fl WHERE fl.inventory_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_online_copies x WHERE x.inventory_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions x WHERE x.inventory_id = i.id);

INSERT INTO inventory_years (inventory_id, start_year, end_year)
SELECT DISTINCT b.id, y.start_year, y.end_year
FROM empty_tomi e
JOIN inventories b ON b.fond_id = e.fond_id AND b.code = e.base_code AND b.id <> e.id
JOIN inventory_years y ON y.inventory_id = e.id
ON CONFLICT DO NOTHING;

INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, note)
SELECT 'a', 'delete-empty-inventory', e.arch || '-' || e.fond || '-' || e.code, e.code,
       CASE WHEN EXISTS (SELECT 1 FROM inventories b WHERE b.fond_id = e.fond_id AND b.code = e.base_code AND b.id <> e.id)
            THEN 'years merged to base ' || e.base_code ELSE 'no base опис' END
FROM empty_tomi e;
DELETE FROM inventories WHERE id IN (SELECT id FROM empty_tomi);

-- ─── 7. bucket C: legacy glued file-level codes ───
CREATE TEMP TABLE cvol AS
SELECT fl.id, fl.code, fl.full_code, fl.title, fl.inventory_id,
       regexp_replace(fl.code, '[ТЧ][0-9]+[А-ЯA-ZІЇЄҐ]?$', '') AS base_code,
       bf.id AS base_file_id, bf.title AS base_title, bf.full_code AS base_full_code,
       NULLIF(trim(regexp_replace(fl.title, ',?\s*\d+\s*арк\.?\s*$', '')), '') AS norm_title
FROM files fl
JOIN inventories i ON i.id = fl.inventory_id
JOIN fonds fo ON fo.id = i.fond_id
JOIN archives a ON a.id = fo.archive_id
LEFT JOIN files bf ON bf.inventory_id = fl.inventory_id
  AND bf.code = regexp_replace(fl.code, '[ТЧ][0-9]+[А-ЯA-ZІЇЄҐ]?$', '')
WHERE fl.code ~ '^[0-9]+[А-ЯA-ZІЇЄҐ]?[ТЧ][0-9]+[А-ЯA-ZІЇЄҐ]?$'
  AND NOT (a.code = 'ЦДІАК' AND fo.code = '128');

-- 7a. no base file in the опис → review only, row untouched
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, note)
SELECT 'c', 'review-no-base', full_code, code, title, 'base ' || base_code || ' absent; kept as-is'
FROM cvol WHERE base_file_id IS NULL;
DELETE FROM cvol WHERE base_file_id IS NULL;

-- 7b. re-point authors (RESTRICT FK: merge then remove source links)
INSERT INTO file_authors (file_id, author_id)
SELECT DISTINCT c.base_file_id, fa.author_id
FROM file_authors fa JOIN cvol c ON c.id = fa.file_id
ON CONFLICT DO NOTHING;
DELETE FROM file_authors fa USING cvol c WHERE fa.file_id = c.id;

-- 7c. move online copies (dedupe against target + between sibling volumes)
DELETE FROM file_online_copies foc USING cvol c
WHERE foc.file_id = c.id
  AND EXISTS (SELECT 1 FROM file_online_copies x
    WHERE x.file_id = c.base_file_id AND x.resource_id = foc.resource_id
      AND x.parsed = foc.parsed AND x.url = foc.url);
DELETE FROM file_online_copies foc
USING cvol c, file_online_copies o, cvol c2
WHERE foc.file_id = c.id AND o.file_id = c2.id
  AND c.base_file_id = c2.base_file_id AND o.id < foc.id
  AND o.resource_id = foc.resource_id AND o.parsed = foc.parsed AND o.url = foc.url;
UPDATE file_online_copies foc SET file_id = c.base_file_id, updated_at = now()
FROM cvol c WHERE foc.file_id = c.id;

-- 7d. merge years, fill-if-empty base title
INSERT INTO file_years (file_id, start_year, end_year)
SELECT DISTINCT c.base_file_id, y.start_year, y.end_year
FROM file_years y JOIN cvol c ON c.id = y.file_id
ON CONFLICT DO NOTHING;

UPDATE files bf SET title = c.norm_title, updated_at = now()
FROM (SELECT DISTINCT ON (base_file_id) base_file_id, norm_title
      FROM cvol WHERE norm_title IS NOT NULL ORDER BY base_file_id, code) c
WHERE bf.id = c.base_file_id AND coalesce(bf.title,'') = '';

-- 7e. log + delete volume rows
INSERT INTO mig_wiki_tom_fix (bucket, action, full_code, code, title, target_full_code, target_title)
SELECT 'c', 'fold', c.full_code, c.code, c.title, bf.full_code, bf.title
FROM cvol c JOIN files bf ON bf.id = c.base_file_id;
DELETE FROM files WHERE id IN (SELECT id FROM cvol);

-- ─── 8. verify ───
DO $$
DECLARE bad bigint; moved int; p record;
BEGIN
  SELECT * INTO p FROM pre;

  SELECT count(*) INTO bad FROM (SELECT full_code FROM files GROUP BY 1 HAVING count(*) > 1) x;
  IF bad <> 0 THEN RAISE EXCEPTION '% duplicate full_codes', bad; END IF;

  SELECT count(*) INTO bad FROM file_online_copies foc
  WHERE foc.file_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM files f WHERE f.id = foc.file_id);
  IF bad <> 0 THEN RAISE EXCEPTION '% orphan copies', bad; END IF;

  -- untouched scopes
  SELECT count(*) INTO bad FROM files fl JOIN inventories i ON i.id=fl.inventory_id
    JOIN fonds fo ON fo.id=i.fond_id JOIN archives a ON a.id=fo.archive_id
    WHERE a.code='ЦДІАК' AND fo.code='128';
  IF bad <> p.cdiak128_files THEN RAISE EXCEPTION 'ЦДІАК-128 drifted: % -> %', p.cdiak128_files, bad; END IF;

  SELECT count(*) INTO bad FROM files fl JOIN inventories i ON i.id=fl.inventory_id
    JOIN fonds fo ON fo.id=i.fond_id WHERE fo.code='Р7720' AND i.code='18ЧАСТ2';
  IF bad <> p.chast2_files THEN RAISE EXCEPTION '18ЧАСТ2 drifted: % -> %', p.chast2_files, bad; END IF;

  -- every code-missing b-fold row was moved (none lost, none extra)
  SELECT count(*) INTO moved FROM mig_wiki_tom_fix WHERE action = 'fold-move' AND at >= now();
  IF moved <> p.moves_expected THEN
    RAISE EXCEPTION 'fold-move count %, expected %', moved, p.moves_expected;
  END IF;

  RAISE NOTICE 'verify OK: files % -> %', p.files_total, (SELECT count(*) FROM files);
END $$;

SELECT bucket, action, count(*) FROM mig_wiki_tom_fix
WHERE at >= now()
GROUP BY 1,2 ORDER BY 1,2;

COMMIT;
