-- STEP 3b: repair the 2 step3 merges that the acmb cross-check disproved.
--
-- 1. ДАКрО-674-1-421 was merged into справа 4; acmb (том 7, Диківка entry) shows
--    the years 1904–1905 belong to спр. 12 — «421» was the catalog's own page
--    number glued by OCR. Move the year range + church authors + title to
--    existing file ДАКрО-674-1-12.
-- 2. ДАОО-37-5-238 was merged into справа 2; acmb (том 4) lists
--    «1893: ф. 37, оп. 5, спр. 238» as a real справа. Recreate file 238 and move
--    the 1893 year range + authors back.
\set ON_ERROR_STOP on
BEGIN;

-- ---- ДАКрО: move 1904–1905 from спр.4 to спр.12 ----------------------------
DELETE FROM file_years
WHERE file_id = 'bbf78d53-57c3-4597-ad65-c1a3e279d93f'
  AND start_year = 1904 AND end_year = 1905;

INSERT INTO file_years (file_id, start_year, end_year)
SELECT f.id, 1904, 1905 FROM files f WHERE f.full_code = 'ДАКрО-674-1-12'
ON CONFLICT DO NOTHING;

-- Диківка church authors onto спр.12 (kept on спр.4 too — pre-merge provenance
-- there is unknown and the whole опис is this village's churches)
INSERT INTO file_authors (file_id, author_id)
SELECT f.id, a.id
FROM files f, authors a
WHERE f.full_code = 'ДАКрО-674-1-12'
  AND a.id IN ('2eea2824-12dd-4e8e-9a2e-f94f8faeec1c',
               '35761279-f7de-4ee3-9f5b-f337fda0c779',
               'a9da458b-9c24-44a9-ba99-94f4e53dac15')
ON CONFLICT DO NOTHING;

UPDATE files SET title = 'Метрична книга. Церква Покрови Пресвятої Богородиці, с. Диківка Олександрійського пов.Бандурівської вол.'
WHERE full_code = 'ДАКрО-674-1-12'
  AND title = 'Метричні книги Православних церков';

-- ---- ДАОО: recreate спр.238 in оп.5 and move 1893 back ----------------------
INSERT INTO files (id, code, full_code, inventory_id, title)
SELECT 'afd374fa-5bd4-4456-8e76-4afa1a17d69d', '238', 'ДАОО-37-5-238',
       f.inventory_id, 'Метрична книга. –'
FROM files f WHERE f.full_code = 'ДАОО-37-5-2';

DELETE FROM file_years
WHERE file_id = '7543782e-f6a8-4dde-95e7-19c2f055574f'
  AND start_year = 1893 AND end_year = 1893;

INSERT INTO file_years (file_id, start_year, end_year)
VALUES ('afd374fa-5bd4-4456-8e76-4afa1a17d69d', 1893, 1893);

INSERT INTO file_authors (file_id, author_id)
VALUES ('afd374fa-5bd4-4456-8e76-4afa1a17d69d', '964c1293-cb03-43f3-b416-d7bbc6047668'),
       ('afd374fa-5bd4-4456-8e76-4afa1a17d69d', 'd01becd9-c67b-47f0-9726-98deaec761e9')
ON CONFLICT DO NOTHING;

COMMIT;
