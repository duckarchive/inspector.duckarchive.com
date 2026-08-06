-- ДАДнО-Р6508-6ДОД online-copy linking
-- Target inventory: 06aef9aa-048f-489a-9faa-531f93d0af2f
-- (ДАДнО → fond Р6508 → опис 6ДОД "П'ятихатський район")
--
-- 24 unlinked FamilySearch copies parse as Р-6508-6дод.-<справа>, справи
-- 1–24 (several are year-suffixed FS re-listings of the same scan, e.g.
-- "…-8" and "…-8_1924-1927" share one imageGroup URL — both link to file
-- 8 per the duplicate convention). All 24 files already exist in the
-- inventory (10 already carry links from a prior pass) — link only,
-- nothing to create.

BEGIN;

UPDATE online_copies oc
SET file_id = f.id
FROM files f
WHERE oc.file_id IS NULL AND oc.inventory_id IS NULL
  AND oc.parsed ~ '^ДАДнО-\(Р-6508-6дод\.-[0-9]+\+'
  AND f.inventory_id = '06aef9aa-048f-489a-9faa-531f93d0af2f'
  AND f.code = (regexp_match(oc.parsed, '^ДАДнО-\(Р-6508-6дод\.-([0-9]+)\+'))[1];

-- verification: expect 24 updated, 0 remaining
SELECT count(*) AS still_unlinked
FROM online_copies
WHERE parsed LIKE 'ДАДнО-(Р-6508-6дод.%' AND file_id IS NULL AND inventory_id IS NULL;

COMMIT;
