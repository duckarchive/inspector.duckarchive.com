-- Shared builder for the parsed-drift merge. \i-included by 03-dedup-preview.sql
-- and 04-dedup-execute.sql. Builds temp tables only.
--
-- Root cause: `parsed` is part of online_copies' unique key
-- (resource_id, inventory_id, file_id, parsed, url). FamilySearch re-scrapes
-- reword `parsed` for an unchanged url — "37_3_104" → "37-3-104_1805",
-- "78-2-546г" → Latin "546g", a title filled in later — so the ingest INSERTS a
-- twin row instead of updating. The old twin is already linked; round 2 matched
-- the new one, which would have put two copies with one url on one target.
--
-- Fix: collapse each group to ONE row that keeps the existing link AND carries
-- the LATEST `parsed`, so the next sync matches it and updates in place instead
-- of inserting yet another twin. Skipping the copies would leave the survivor
-- holding stale `parsed` and the drift would simply recur next sync.
\set ON_ERROR_STOP on

-- this round's queued matches
CREATE TEMP TABLE t_round AS
SELECT fa.id AS action_id, 'file'::text AS target, fa.online_copy_id AS oc_id, fa.file_id AS target_id
FROM file_actions fa
WHERE fa.created_by = :'who' AND fa.type = 'connect_to_online_copy' AND fa.resolved_at IS NULL
UNION ALL
SELECT ia.id, 'inventory', ia.online_copy_id, ia.inventory_id
FROM inventory_actions ia
WHERE ia.created_by = :'who' AND ia.type = 'connect_to_online_copy' AND ia.resolved_at IS NULL;

-- group members: the queued copy plus every existing copy sharing
-- (resource_id, url) that is ALREADY linked to the same target
CREATE TEMP TABLE t_members AS
SELECT r.target, r.target_id, mine.resource_id, mine.url,
       mine.id AS oc_id, mine.parsed, mine.updated_at, false AS is_linked
FROM t_round r JOIN online_copies mine ON mine.id = r.oc_id
WHERE EXISTS (
  SELECT 1 FROM online_copies o2
  WHERE o2.resource_id = mine.resource_id AND o2.url = mine.url AND o2.id <> mine.id
    AND ((r.target = 'file'      AND o2.file_id      = r.target_id)
      OR (r.target = 'inventory' AND o2.inventory_id = r.target_id)))
UNION
SELECT r.target, r.target_id, o2.resource_id, o2.url,
       o2.id, o2.parsed, o2.updated_at, true
FROM t_round r JOIN online_copies mine ON mine.id = r.oc_id
JOIN online_copies o2 ON o2.resource_id = mine.resource_id AND o2.url = mine.url AND o2.id <> mine.id
 AND ((r.target = 'file'      AND o2.file_id      = r.target_id)
   OR (r.target = 'inventory' AND o2.inventory_id = r.target_id));

-- survivor: the LINKED row, latest first (a group may already hold several —
-- leftovers the 2026-08-25 dedup predates). Extra linked rows are collapsed too.
CREATE TEMP TABLE t_survivor AS
SELECT DISTINCT ON (target, target_id, resource_id, url)
       target, target_id, resource_id, url, oc_id AS survivor_id
FROM t_members WHERE is_linked
ORDER BY target, target_id, resource_id, url, updated_at DESC, oc_id DESC;

-- latest parsed across the WHOLE group, linked or not
CREATE TEMP TABLE t_latest AS
SELECT DISTINCT ON (target, target_id, resource_id, url)
       target, target_id, resource_id, url, oc_id AS latest_id, parsed AS latest_parsed
FROM t_members
ORDER BY target, target_id, resource_id, url, updated_at DESC, oc_id DESC;

-- everything that is not the survivor gets deleted
CREATE TEMP TABLE t_losers AS
SELECT m.oc_id AS loser_id, s.survivor_id, m.target, m.target_id, m.is_linked
FROM t_members m
JOIN t_survivor s ON s.target = m.target AND s.target_id = m.target_id
 AND s.resource_id = m.resource_id AND s.url = m.url
WHERE m.oc_id <> s.survivor_id;

-- survivors whose parsed must be refreshed to the latest value.
--
-- GUARD: only adopt the newer parsed when, run through this round's own
-- normalization, it still resolves to the very target the survivor is linked to.
-- Group membership is keyed on (resource_id, url, target), and one FS url can
-- legitimately span several справи — so without this check a survivor could take
-- on a parsed string describing a DIFFERENT справа and the next sync would carry
-- that error forward. Measured 2026-08-31: 355/355 agree exactly, 0 blocked.
CREATE TEMP TABLE t_reparse_all AS
SELECT s.survivor_id, l.latest_parsed, o.parsed AS current_parsed,
  translate(upper(COALESCE(f.full_code, a.code||'-'||fo.code||'-'||i.code)),
            'ABCEHIKMOPTXY','АВСЕНІКМОРТХУ') AS linked_code,
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    translate(upper(btrim(
      CASE WHEN l.latest_parsed LIKE '%+++%' AND l.latest_parsed ~ '^[^()]+-\(.*\)$'
        THEN substring(l.latest_parsed from '^([^()]+)-\(') || '-' ||
             btrim(split_part(substring(l.latest_parsed from '^[^()]+-\((.*)\)$'), '+++', 1))
        ELSE l.latest_parsed END)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ')
    , '[_/]', '-', 'g'), '-(Р|П|Н)[-. ](?=\d)', '-\1', 'g')
    , '[`''"´]+', '', 'g'), '\s+', '', 'g') AS latest_code
FROM t_survivor s
JOIN t_latest l ON l.target = s.target AND l.target_id = s.target_id
 AND l.resource_id = s.resource_id AND l.url = s.url
JOIN online_copies o ON o.id = s.survivor_id
LEFT JOIN files f ON f.id = o.file_id
LEFT JOIN inventories i ON i.id = o.inventory_id
LEFT JOIN fonds fo ON fo.id = i.fond_id
LEFT JOIN archives a ON a.id = fo.archive_id
WHERE o.parsed IS DISTINCT FROM l.latest_parsed;

CREATE TEMP TABLE t_reparse AS
SELECT survivor_id, latest_parsed, current_parsed
FROM t_reparse_all WHERE latest_code = linked_code;

-- refreshes refused by the guard: reported, never applied
CREATE TEMP TABLE t_reparse_blocked AS
SELECT survivor_id, current_parsed, latest_parsed, linked_code, latest_code
FROM t_reparse_all WHERE latest_code IS DISTINCT FROM linked_code;
