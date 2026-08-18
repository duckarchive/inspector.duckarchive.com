-- НМІУДСВ-ТФ1-5499 — title/years fix for the 12 files left untitled after the
-- 2026-07-28 manual pass (codes 31-36, 1001-1006). Source: Gemini OCR of the
-- first 2 FamilySearch images per DGS (see gemini-ocr-cache.json for raw
-- extraction + confidence/notes per file). code/full_code are NOT touched —
-- see online-copies-parsed-conventions memory: the numeric code is this DB's
-- own sequential position, unrelated to the archive's real справа numbering.
--
-- Notable findings from this batch (see README.md):
--   - Not all files share the "Х РВК. Сповіщення про загибель..." boilerplate
--     used by the other 24 files in this inventory — 31-36/1001-1006 are a
--     mixed set (instructions, burial-registration cards, alphabetical
--     registry books), so each title uses that file's own printed title text.
--   - file_years for the four "Алфавітна книга" registers (1001-1004) uses the
--     WWII subject period stated in each book's own title (1941-1945), not the
--     book's physical operating dates (e.g. 1956-1957 for vol. 1/2) — per
--     explicit decision, since the title itself states the subject period.
--   - 5499-1005 carries a handwritten note "фонда №1187 оп.№0256-601" that may
--     indicate it's misfiled from a different fond; titled anyway per decision,
--     flagged here for anyone who later investigates the fond/opis mismatch.

BEGIN;

UPDATE files SET title = v.title
FROM (VALUES
  ('2040531e-a971-4b74-8255-fcb0b634e876'::uuid, 'Шепетівсько-Полонський ОРВК. Іменні списки на загиблих та зниклих безвісти військовослужбовців Червоної армії у роки Другої світової війни'),
  ('19bd4276-fbf7-4699-adb2-386d046f24cc'::uuid, 'Шепетовский РВК. Список погибших и пропавших без вести офицеров Красной Армии'),
  ('79cc490d-2f0a-4b2d-b28d-74490aeed70a'::uuid, 'Шепетовский РВК. Инструкция военным комиссариатам о порядке выплаты пособий в соответствии с пунктом 3 постановления Государственного Комитета Обороны от 9 апреля 1942 года'),
  ('d9d634ae-df2c-4d2f-a6ed-b86080f534b4'::uuid, 'Каменец-Подольский областной военный комиссариат. Список офицерского состава по погибшим /пропавшим без вести/ в боях за Родину, для розыска их семей /проживающих в Каменец-Подольской области/'),
  ('11897f0d-a9b4-42ad-b095-d0eafab97602'::uuid, 'Полонський р-н. Учетная карточка воинского захоронения'),
  ('aba5d5df-1ce8-479b-b46c-cdc1a15478ef'::uuid, 'Шепетівський р-н. Учетная карточка воинского захоронения'),
  ('86e23604-a085-49cc-872b-a06c6b2328d7'::uuid, 'Міністерство оборони України Шепетівсько-Полонський об''єднаний міський військовий комісаріат. Алфавітна книга надходжень сповіщень про загибель воїнів Великої Вітчизняної війни 1941-1945 р.р. (офіцерів)'),
  ('3e0e03e2-2d3d-4479-b877-99f93dbfad2b'::uuid, 'Шепетівсько-Полонський об''єднаний міський військовий комісаріат. Алфавітна книга надходжень сповіщень про загибель воїнів Великої Вітчизняної війни 1941-1945 р.р. Том № 1'),
  ('fb8fb3a0-6ebe-4d00-bd2f-0fd494f1f65e'::uuid, 'Міністерство оборони України Шепетівсько-Полонський об''єднаний міський військовий комісаріат. Алфавітна книга надходжень сповіщень про загибель воїнів Великої Вітчизняної війни 1941-1945 р.р. Том № 2'),
  ('53845861-0d23-47ad-840a-57a6eb61ee73'::uuid, 'Міністерство оборони України Шепетівсько-Полонський об''єднаний міський військовий комісаріат. Алфавітна книга надходжень сповіщень про загибель воїнів Великої Вітчизняної війни 1941-1945 р.р. (Полонський район)'),
  ('a2b6e97e-a565-4c6c-b621-323d102c6254'::uuid, 'Р.В.К. Журнал обліку політобов''язаних гр-н населеного пункту село Осетрівка'),
  ('5816f3aa-300b-450b-81cb-b4c6e352484c'::uuid, 'Полонський районний військовий комісаріат, Хмельницької області. Алфавітна книга обліку загиблих військовослужбовців та призначення пенсій їх сім''ям по Полонському райвійськкомату')
) AS v(id, title)
WHERE files.id = v.id;

INSERT INTO file_years (file_id, start_year, end_year) VALUES
  ('2040531e-a971-4b74-8255-fcb0b634e876', 1944, 1949),
  ('19bd4276-fbf7-4699-adb2-386d046f24cc', 1943, 1943),
  ('79cc490d-2f0a-4b2d-b28d-74490aeed70a', 1941, 1942),
  ('d9d634ae-df2c-4d2f-a6ed-b86080f534b4', 1944, 1944),
  ('11897f0d-a9b4-42ad-b095-d0eafab97602', 1941, 1945),
  ('aba5d5df-1ce8-479b-b46c-cdc1a15478ef', 1950, 1950),
  ('86e23604-a085-49cc-872b-a06c6b2328d7', 1941, 1945),
  ('3e0e03e2-2d3d-4479-b877-99f93dbfad2b', 1941, 1945),
  ('fb8fb3a0-6ebe-4d00-bd2f-0fd494f1f65e', 1941, 1945),
  ('53845861-0d23-47ad-840a-57a6eb61ee73', 1941, 1945),
  ('a2b6e97e-a565-4c6c-b621-323d102c6254', 1941, 1942),
  ('5816f3aa-300b-450b-81cb-b4c6e352484c', 1950, 1962);

-- verification: expect 12/12 titled, 12/12 with exactly one file_years row
SELECT count(*) AS titled FROM files
WHERE inventory_id = 'c2a8993d-c149-4a4d-b5b0-b2cbf075427c' AND title IS NOT NULL;

SELECT f.code, f.title, fy.start_year, fy.end_year
FROM files f
JOIN file_years fy ON fy.file_id = f.id
WHERE f.inventory_id = 'c2a8993d-c149-4a4d-b5b0-b2cbf075427c'
  AND f.code::int > 30
ORDER BY f.code::int;

COMMIT;
