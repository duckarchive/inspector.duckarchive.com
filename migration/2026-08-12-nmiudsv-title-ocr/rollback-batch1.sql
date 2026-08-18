-- Rollback for fix-titles-batch1.sql

BEGIN;

DELETE FROM file_years WHERE file_id IN (
  '2040531e-a971-4b74-8255-fcb0b634e876','19bd4276-fbf7-4699-adb2-386d046f24cc',
  '79cc490d-2f0a-4b2d-b28d-74490aeed70a','d9d634ae-df2c-4d2f-a6ed-b86080f534b4',
  '11897f0d-a9b4-42ad-b095-d0eafab97602','aba5d5df-1ce8-479b-b46c-cdc1a15478ef',
  '86e23604-a085-49cc-872b-a06c6b2328d7','3e0e03e2-2d3d-4479-b877-99f93dbfad2b',
  'fb8fb3a0-6ebe-4d00-bd2f-0fd494f1f65e','53845861-0d23-47ad-840a-57a6eb61ee73',
  'a2b6e97e-a565-4c6c-b621-323d102c6254','5816f3aa-300b-450b-81cb-b4c6e352484c'
);

UPDATE files SET title = NULL WHERE id IN (
  '2040531e-a971-4b74-8255-fcb0b634e876','19bd4276-fbf7-4699-adb2-386d046f24cc',
  '79cc490d-2f0a-4b2d-b28d-74490aeed70a','d9d634ae-df2c-4d2f-a6ed-b86080f534b4',
  '11897f0d-a9b4-42ad-b095-d0eafab97602','aba5d5df-1ce8-479b-b46c-cdc1a15478ef',
  '86e23604-a085-49cc-872b-a06c6b2328d7','3e0e03e2-2d3d-4479-b877-99f93dbfad2b',
  'fb8fb3a0-6ebe-4d00-bd2f-0fd494f1f65e','53845861-0d23-47ad-840a-57a6eb61ee73',
  'a2b6e97e-a565-4c6c-b621-323d102c6254','5816f3aa-300b-450b-81cb-b4c6e352484c'
);

COMMIT;
