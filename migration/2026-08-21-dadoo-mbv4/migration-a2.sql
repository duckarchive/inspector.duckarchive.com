-- Class A2: 3-digit glued codes (page number over a short справа number) that duplicate an existing file — identical title AND years. Input: 06-glued-3digit.csv.
BEGIN;
CREATE TEMP TABLE mg(src text, dst text);
INSERT INTO mg VALUES ('ДАДоО-198-1-183','ДАДоО-198-1-8'),
('ДАДоО-200-1-184','ДАДоО-200-1-5'),
('ДАДоО-208-1-84','ДАДоО-208-1-5'),
('ДАДоО-214-1-87','ДАДоО-214-1-5'),
('ДАДоО-235-1-97','ДАДоО-235-1-5'),
('ДАДоО-243-1-100','ДАДоО-243-1-8'),
('ДАДоО-249-1-102','ДАДоО-249-1-11'),
('ДАДоО-270-1-157','ДАДоО-270-1-11'),
('ДАДоО-334-1-196','ДАДоО-334-1-5'),
('ДАДоО-391-1-172','ДАДоО-391-1-6'),
('ДАДоО-416-1-136','ДАДоО-416-1-5');
CREATE TEMP TABLE g AS SELECT m.*, s.id AS src_id, d.id AS dst_id FROM mg m JOIN files s ON s.full_code = m.src JOIN files d ON d.full_code = m.dst;
DO $$ BEGIN IF (SELECT count(*) FROM g) <> (SELECT count(*) FROM mg) THEN RAISE EXCEPTION 'source or target missing'; END IF; END $$;
-- guard: duplicate must still have the same title and years as the target, and no online copies
DO $$ BEGIN IF EXISTS (SELECT 1 FROM g JOIN files s ON s.id = g.src_id JOIN files d ON d.id = g.dst_id
  WHERE s.title IS DISTINCT FROM d.title
     -- class E re-split the target's ranges from the catalog; compare the overall span
     OR (SELECT min(start_year)||'-'||max(end_year) FROM file_years WHERE file_id = s.id) IS DISTINCT FROM (SELECT min(start_year)||'-'||max(end_year) FROM file_years WHERE file_id = d.id)
     OR EXISTS (SELECT 1 FROM online_copies WHERE file_id = s.id)) THEN RAISE EXCEPTION 'not an exact duplicate'; END IF; END $$;
INSERT INTO file_authors (file_id, author_id) SELECT g.dst_id, fa.author_id FROM file_authors fa JOIN g ON fa.file_id = g.src_id ON CONFLICT DO NOTHING;
DELETE FROM file_authors fa USING g WHERE fa.file_id = g.src_id;
UPDATE file_actions x SET file_id = g.dst_id FROM g WHERE x.file_id = g.src_id;
UPDATE files d SET tags = CASE WHEN cardinality(d.tags) = 0 THEN s.tags ELSE d.tags END FROM g JOIN files s ON s.id = g.src_id WHERE d.id = g.dst_id;
DELETE FROM files f USING g WHERE f.id = g.src_id;
SELECT 'duplicates removed', count(*) FROM mg WHERE NOT EXISTS (SELECT 1 FROM files WHERE full_code = mg.src);
