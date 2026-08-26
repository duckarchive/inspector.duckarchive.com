-- ДАЧгО-679-10: merge files with "Н" code prefix into the original files with
-- the same code without the prefix (34 pairs, verified 1:1 on 2026-08-26).
-- Creates PENDING merge_to file_actions for admin review; nothing is applied
-- until each action is accepted in the editor dashboard (Справи queue).
-- Source = Н-file (deleted on approve), target = plain-code file (keeps data;
-- authors/copies/locations/years move over with dedup).
INSERT INTO file_actions (created_by, type, file_id, note)
SELECT
  'ai-dachho-679-10-n-merge',
  'merge_to',
  src.id,
  json_build_object('v', 1, 'field', 'parent', 'value', tgt.id)::text
FROM files src
JOIN files tgt
  ON tgt.inventory_id = src.inventory_id
 AND tgt.code = substring(src.code FROM 2)
WHERE src.inventory_id = '2968ca91-41ee-487a-825f-731009685e21'
  AND src.code LIKE 'Н%';
