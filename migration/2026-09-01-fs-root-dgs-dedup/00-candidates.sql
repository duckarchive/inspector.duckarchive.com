-- Shared candidate set, \i'd by 01-preview.sql and 02-execute.sql.
--
-- A FamilySearch online_copies.url is one of two shapes (verified: they
-- partition the FS rows exactly, no third shape exists):
--   root:     …?imageGroupNumbers=<DGS>                (whole-film browse link)
--   specific: …?imageGroupNumbers=<DGS>_<seq>_<imgId>   (pinpoints one item in the film)
-- See [[fs-url-to-dgs-conversion]] memory for the DGS id scheme.
--
-- t_losers = root copies that are redundant: a specific-form copy for the
-- SAME DGS is already linked to the SAME catalog target (file or inventory)
-- as the root copy. The specific copy is strictly more precise, so the root
-- one adds nothing and is deleted. Root copies that are unlinked, or whose
-- only specific siblings are unlinked/linked elsewhere, are left alone.
CREATE TEMP TABLE t_root AS
SELECT id, file_id, inventory_id, url,
       substring(url FROM 'imageGroupNumbers=([0-9]+)$') AS dgs
FROM online_copies
WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7'
  AND url ~ 'imageGroupNumbers=[0-9]+$'
  AND (file_id IS NOT NULL OR inventory_id IS NOT NULL);

CREATE TEMP TABLE t_specific AS
SELECT id, file_id, inventory_id, url,
       substring(url FROM 'imageGroupNumbers=([0-9]+)_') AS dgs
FROM online_copies
WHERE resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7'
  AND url ~ 'imageGroupNumbers=[0-9]+_[0-9]+_'
  AND (file_id IS NOT NULL OR inventory_id IS NOT NULL);

-- 47 of 1,607 roots match more than one same-target specific copy (the film
-- was split into several items covering the same справа); pick one
-- deterministic survivor per root (lowest url) to repoint history onto.
CREATE TEMP TABLE t_matches AS
SELECT r.id AS loser_id, s.id AS specific_id,
       r.file_id, r.inventory_id,
       row_number() OVER (PARTITION BY r.id ORDER BY s.url, s.id) AS rn
FROM t_root r
JOIN t_specific s
  ON s.dgs = r.dgs
 AND ( (s.file_id IS NOT NULL AND s.file_id = r.file_id)
    OR (s.inventory_id IS NOT NULL AND s.inventory_id = r.inventory_id) );

CREATE TEMP TABLE t_losers AS
SELECT loser_id, specific_id AS survivor_id, file_id, inventory_id
FROM t_matches
WHERE rn = 1;
