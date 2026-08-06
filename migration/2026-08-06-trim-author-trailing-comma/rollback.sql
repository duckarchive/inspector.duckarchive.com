-- Rollback for this dev run only (dev DB duck_dev@localhost:5555/inspector).
-- Reconstructs the exact pre-apply.sql state from the snapshot CSVs captured
-- before running apply.sql on 2026-08-06.
--
-- If apply.sql was run against a different database, its batch 1 loop may
-- have matched a different set of duplicate authors — this script will not
-- correctly roll that back. Re-derive a rollback from a fresh snapshot taken
-- with the queries in README.md before applying there.
BEGIN;

-- Batch 2 rollback: restore the trailing comma on every author that was only
-- trimmed (not merged). \copy runs client-side against pre_trim_titles.csv.
CREATE TEMP TABLE _pre_trim (id uuid, title text) ON COMMIT DROP;
\copy _pre_trim FROM 'pre_trim_titles.csv' WITH (FORMAT csv, HEADER true)

UPDATE authors a
SET title = p.title
FROM _pre_trim p
WHERE a.id = p.id;

-- Batch 1 rollback: recreate the two merged-away source authors and move
-- their case_authors links back off the targets.
INSERT INTO authors (id, title, info, tags, lat, lng)
VALUES
  ('00f2b05a-22e5-4a3a-8099-f31c234dd44f', 'Покровська церква, с. Новокурське Херсонський повіт,', 'Херсонська єпархія', ARRAY['православ''я'], 47.5793559, 33.2248407),
  ('441519aa-a4ea-4df4-a81d-e7822645f625', 'Миколаївська церква, с. Чичиркозівка Катеринопільський повіт,', 'Катеринославська єпархія', ARRAY['православ''я'], 49.0341391, 31.1296096);

-- restore target rows to their pre-merge info (both were NULL; tags were
-- already identical to the merged union, so no tags change is needed)
UPDATE authors SET info = NULL WHERE id IN (
  'b78146e8-40f5-4c11-9872-a4ce7484c75e',
  '350e0c2f-76a4-40e8-a203-c01f3d32748f'
);

-- move the 13 case_authors rows back to their original source author
CREATE TEMP TABLE _moved_case_authors (src_author_id uuid, tgt_author_id uuid, case_id uuid) ON COMMIT DROP;
\copy _moved_case_authors FROM 'moved_case_authors.csv' WITH (FORMAT csv, HEADER true)

DELETE FROM case_authors ca
USING _moved_case_authors m
WHERE ca.author_id = m.tgt_author_id AND ca.case_id = m.case_id;

INSERT INTO case_authors (case_id, author_id)
SELECT case_id, src_author_id FROM _moved_case_authors;

-- file_authors: batch 1 found 0 rows to move for either source author on
-- 2026-08-06, so there is nothing to move back. If a future run does move
-- file_authors rows, snapshot them the same way as moved_case_authors.csv
-- before applying, and restore them here.

COMMIT;
