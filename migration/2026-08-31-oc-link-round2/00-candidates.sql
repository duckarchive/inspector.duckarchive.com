-- Shared candidate builder for round 2 of online_copies → catalog linking.
-- Included by 01-preview.sql and 02-create-actions.sql with \i, so both see
-- exactly the same rules. Builds temp tables; modifies nothing.
--
-- Scope: LINK-ONLY. A copy qualifies only when its parsed code resolves to an
-- ALREADY EXISTING file (or inventory). Copies pointing at missing справи/описи
-- (tiers C/D of the 2026-08-31 review) are deliberately out of scope here.
\set ON_ERROR_STOP on

-- ── unlinked pool ────────────────────────────────────────────────────────────
-- FS blob shape: АРХІВ-(ref+++volume+++title) — arch and ref are split out so
-- the ref-level rules (R1-R3) can parse them.
CREATE TEMP TABLE t_un AS
SELECT oc.id AS oc_id, oc.url, oc.parsed, r.code AS res,
  CASE WHEN oc.parsed LIKE '%+++%' AND oc.parsed ~ '^[^()]+-\(.*\)$'
       THEN substring(oc.parsed from '^([^()]+)-\(') END AS arch,
  CASE WHEN oc.parsed LIKE '%+++%' AND oc.parsed ~ '^[^()]+-\(.*\)$'
       THEN btrim(split_part(substring(oc.parsed from '^[^()]+-\((.*)\)$'), '+++', 1)) END AS ref
FROM online_copies oc
JOIN resources r ON r.id = oc.resource_id
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL AND oc.parsed <> ''
  AND NOT EXISTS (SELECT 1 FROM file_actions fa
                  WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM inventory_actions ia
                  WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL);

-- ── candidate codes, one row per (copy, rule) ────────────────────────────────
-- R0  current autolink normalization PLUS two additions validated 2026-08-31:
--       * "_" and "/" as segment separators (ДАОО 2018_2_1937, ДАКО 782_1_5388)
--       * stray quote/backtick junk stripped (ЦДАГО 209-2-85`)
--     Fond-letter prefixes Р/П/Н glued to the number, homoglyphs folded,
--     whitespace collapsed — same as /api/editor/online-copies/autolink.
-- R1  FS ref carrying "ф-о-с - description" (ЦДАМЛМ: "464-1-15932 - Тичина …").
-- R2  FS ref carrying a single "Volume ф-о/с" (multi-Volume lists excluded).
-- R3  FS ref in Latin "F.n-Op.m-D.k" form (ДАЗкО).
CREATE TEMP TABLE t_cand AS
SELECT oc_id, 'R0 norm+separators'::text AS rule, 0 AS pri,
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    translate(upper(btrim(
      CASE WHEN parsed LIKE '%+++%' AND parsed ~ '^[^()]+-\(.*\)$'
        THEN substring(parsed from '^([^()]+)-\(') || '-' ||
             btrim(split_part(substring(parsed from '^[^()]+-\((.*)\)$'), '+++', 1))
        ELSE parsed END)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ')
    , '[_/]', '-', 'g')
    , '-(Р|П|Н)[-. ](?=\d)', '-\1', 'g')
    , '[`''"´]+', '', 'g')
    , '\s+', '', 'g') AS code
FROM t_un
UNION ALL
SELECT oc_id, 'R1 lead-code+desc', 1,
  regexp_replace(translate(upper(arch || '-' || btrim(substring(ref from
    '^\s*([0-9]+[-_/][0-9]+[-_/][0-9]+[А-Яа-яA-Za-z]?)\s*[-–—]\s'))),
    'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'), '[_/]', '-', 'g')
FROM t_un
WHERE res = 'fs' AND ref ~ '^\s*[0-9]+[-_/][0-9]+[-_/][0-9]+[А-Яа-яA-Za-z]?\s*[-–—]\s'
UNION ALL
SELECT oc_id, 'R2 Volume-in-ref', 2,
  regexp_replace(translate(upper(arch || '-' || substring(ref from
    '^Volume\s+([0-9А-Яа-яA-Za-z-]+-[0-9А-Яа-яA-Za-z]+/[0-9]+[А-Яа-яA-Za-z]?)\s*$')),
    'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'), '/', '-', 'g')
FROM t_un
WHERE res = 'fs' AND ref ~ '^Volume\s' AND ref !~ ';'
UNION ALL
SELECT oc_id, 'R3 F/Op/D latin', 3,
  translate(upper(arch || '-' || substring(ref from '^F\.?\s*([0-9]+)') || '-' ||
    substring(ref from 'Op\.?\s*([0-9]+)') || '-' ||
    substring(ref from 'D\.?\s*([0-9]+)')), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ')
FROM t_un
WHERE res = 'fs' AND ref ~ '^F\.?\s*[0-9]+' AND ref ~ 'Op\.' AND ref ~ 'D\.';

DELETE FROM t_cand WHERE code IS NULL OR code = '';
-- ЦДНТА is excluded everywhere: its 4-segment FS codes are internal renumbering
-- (36/301 agreement measured 2026-08-05) — never bulk-link them.
DELETE FROM t_cand WHERE code LIKE 'ЦДНТА-%';
CREATE INDEX ON t_cand (code);

-- ── catalog targets, folded the same way ─────────────────────────────────────
CREATE TEMP TABLE t_ff AS
SELECT id AS file_id,
  translate(upper(full_code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
FROM files WHERE full_code <> '';
CREATE INDEX ON t_ff (folded);

CREATE TEMP TABLE t_ii AS
SELECT i.id AS inventory_id,
  translate(upper(a.code || '-' || f.code || '-' || i.code),
            'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
FROM inventories i
JOIN fonds f ON f.id = i.fond_id
JOIN archives a ON a.id = f.archive_id;
CREATE INDEX ON t_ii (folded);

-- ── matches: file wins over inventory; lowest rule pri wins; must be unique ──
CREATE TEMP TABLE t_all AS
SELECT c.oc_id, c.rule, c.pri, c.code, 'file'::text AS target, f.file_id AS target_id
FROM t_cand c JOIN t_ff f ON f.folded = c.code
UNION ALL
SELECT c.oc_id, c.rule, c.pri, c.code, 'inventory', i.inventory_id
FROM t_cand c JOIN t_ii i ON i.folded = c.code;

CREATE TEMP TABLE t_best AS
SELECT oc_id, min(CASE WHEN target = 'file' THEN 0 ELSE 1 END) * 10 + min(pri) AS rank_key
FROM t_all GROUP BY oc_id;

-- one row per copy; ambiguous folds (>1 distinct target at the winning rank)
-- are dropped rather than guessed — measured 0 on 2026-08-31.
CREATE TEMP TABLE t_map AS
SELECT a.oc_id, min(a.rule) AS rule, a.target,
       min(a.target_id::text)::uuid AS target_id, min(a.code) AS code
FROM t_all a
JOIN t_best b ON b.oc_id = a.oc_id
 AND (CASE WHEN a.target = 'file' THEN 0 ELSE 1 END) * 10 + a.pri = b.rank_key
GROUP BY a.oc_id, a.target
HAVING count(DISTINCT a.target_id) = 1;

CREATE TEMP TABLE t_ambiguous AS
SELECT a.oc_id, count(DISTINCT a.target_id) AS targets
FROM t_all a
JOIN t_best b ON b.oc_id = a.oc_id
 AND (CASE WHEN a.target = 'file' THEN 0 ELSE 1 END) * 10 + a.pri = b.rank_key
GROUP BY a.oc_id, a.target HAVING count(DISTINCT a.target_id) > 1;

-- ── duplicate guard ──────────────────────────────────────────────────────────
-- FamilySearch re-scrapes change `parsed` for an unchanged url, and `parsed` is
-- part of online_copies' unique key — so a re-visit INSERTS a twin row instead
-- of updating. If the older twin is already linked, linking the new one puts two
-- copies with the same url on one target. Same defect `2026-08-25-fs-online-copies-dedup`
-- cleaned up after the fact; here we refuse to create it in the first place.
--
-- D1: a twin (same resource + url) is already linked to the SAME target.
CREATE TEMP TABLE t_dup_same AS
SELECT m.oc_id, m.target, m.target_id, m.code
FROM t_map m JOIN t_un u ON u.oc_id = m.oc_id
WHERE EXISTS (
  SELECT 1 FROM online_copies o2
  WHERE o2.resource_id = (SELECT resource_id FROM online_copies o WHERE o.id = m.oc_id)
    AND o2.url = u.url AND o2.id <> m.oc_id
    AND ((m.target = 'file'      AND o2.file_id      = m.target_id)
      OR (m.target = 'inventory' AND o2.inventory_id = m.target_id)));

-- D2: a twin is already linked to a DIFFERENT file that shares this опис and
-- справа but sits under another fond — i.e. the EXISTING link is mis-parented
-- (ДАЧкО fond "9310", an untitled 112-file artifact, vs the real fond "931").
-- Our match is the correct one, but accepting it while the bad link stands would
-- show the copy twice, so these are held back for the fond cleanup instead.
CREATE TEMP TABLE t_dup_fond AS
SELECT m.oc_id, m.target, m.target_id, m.code
FROM t_map m JOIN t_un u ON u.oc_id = m.oc_id
WHERE m.target = 'file' AND EXISTS (
  SELECT 1 FROM online_copies o2
  JOIN files f2 ON f2.id = o2.file_id
  JOIN files fm ON fm.id = m.target_id
  WHERE o2.resource_id = (SELECT resource_id FROM online_copies o WHERE o.id = m.oc_id)
    AND o2.url = u.url AND o2.id <> m.oc_id AND o2.file_id <> m.target_id
    AND f2.code = fm.code
    AND f2.inventory_id <> fm.inventory_id
    AND (SELECT i.code FROM inventories i WHERE i.id = f2.inventory_id)
      = (SELECT i.code FROM inventories i WHERE i.id = fm.inventory_id));

DELETE FROM t_map m USING t_dup_same d WHERE d.oc_id = m.oc_id AND d.target = m.target;
DELETE FROM t_map m USING t_dup_fond d WHERE d.oc_id = m.oc_id AND d.target = m.target;
