-- Manual mapping: FamilySearch image (DGS + 3-digit sequence within the film)
-- -> the specific ЦДІАЛ-201-4А file it depicts.
--
-- Derived 2026-09-01 by visiting each film's own search-results page
-- (https://www.familysearch.org/en/records/images/search-results?imageGroupNumbers=<DGS>)
-- while logged in, which lists "Item N of M" with a per-item date range
-- (and, for a few films, a direct catalog code). Matched against this
-- inventory's file titles (which carry their own year range / record type
-- in Ukrainian) — NOT against file_years, which disagrees with its own
-- file's title for several rows (e.g. file 2006: title says 1844-1866,
-- file_years says 1938; file 2258: title says 1811-1834, file_years says
-- 1785-1800) and was therefore not trusted as the match key.
--
-- Only the high-confidence subset is here: unique year-range match, or (for
-- 004933106 and three items of 004933147) a direct file code given by FS
-- itself. Ambiguous films (004932984 — Place label conflicts with the
-- catalog village; 007707393 — no справа number, would need village-name
-- matching; the rest of 004933147, 004933043, 004933133) are deliberately
-- left out — those copies keep their current inventory-level link.
--
-- \i'd by 01-preview.sql and 02-execute.sql.
CREATE TEMP TABLE t_mapping (dgs text, seq text, file_code text);
INSERT INTO t_mapping (dgs, seq, file_code) VALUES
  -- 004932891: files 1352-1359 (seq 001 and 008 have no stored row)
  ('004932891','002','1352'), ('004932891','003','1353'), ('004932891','004','1354'),
  ('004932891','005','1355'), ('004932891','006','1356'), ('004932891','007','1357'),
  ('004932891','009','1359'),
  -- 004932970: files 2006-2018, all 13 present
  ('004932970','001','2006'), ('004932970','002','2007'), ('004932970','003','2008'),
  ('004932970','004','2009'), ('004932970','005','2010'), ('004932970','006','2011'),
  ('004932970','007','2012'), ('004932970','008','2013'), ('004932970','009','2014'),
  ('004932970','010','2015'), ('004932970','011','2016'), ('004932970','012','2017'),
  ('004932970','013','2018'),
  -- 004933106: files 2160-2171, FS gives the code directly, all 12 present
  ('004933106','001','2160'), ('004933106','002','2161'), ('004933106','003','2162'),
  ('004933106','004','2163'), ('004933106','005','2164'), ('004933106','006','2165'),
  ('004933106','007','2166'), ('004933106','008','2167'), ('004933106','009','2168'),
  ('004933106','010','2169'), ('004933106','011','2170'), ('004933106','012','2171'),
  -- 004933147: only items 1-3 have a direct FS code (3187-3189); 4-10 stay unresolved
  ('004933147','001','3187'), ('004933147','002','3188'), ('004933147','003','3189'),
  -- 004933242: files 3826-3836, all 11 present
  ('004933242','001','3826'), ('004933242','002','3827'), ('004933242','003','3828'),
  ('004933242','004','3829'), ('004933242','005','3830'), ('004933242','006','3831'),
  ('004933242','007','3832'), ('004933242','008','3833'), ('004933242','009','3834'),
  ('004933242','010','3835'), ('004933242','011','3836'),
  -- 004933300: files 4246-4258 (seq 006 / file 4251 has no stored row)
  ('004933300','001','4246'), ('004933300','002','4247'), ('004933300','003','4248'),
  ('004933300','004','4249'), ('004933300','005','4250'), ('004933300','007','4252'),
  ('004933300','008','4253'), ('004933300','009','4254'), ('004933300','010','4255'),
  ('004933300','011','4256'), ('004933300','012','4257'), ('004933300','013','4258'),
  -- 004933386: files 4985-4992, all 8 present
  ('004933386','001','4985'), ('004933386','002','4986'), ('004933386','003','4987'),
  ('004933386','004','4988'), ('004933386','005','4989'), ('004933386','006','4990'),
  ('004933386','007','4991'), ('004933386','008','4992');

CREATE TEMP TABLE t_targets AS
SELECT
  m.dgs, m.seq, m.file_code,
  oc.id AS copy_id, oc.url, oc.parsed AS old_parsed, oc.inventory_id AS old_inventory_id,
  f.id AS file_id
FROM t_mapping m
JOIN online_copies oc
  ON oc.resource_id = 'e106fff5-12bd-4023-bbf6-fbf58faaf1b7'
 AND oc.inventory_id = 'a44c7f68-21cc-4ea5-89a2-c1c5fd94be78'
 AND oc.url LIKE 'https://www.familysearch.org/en/records/images/search-results?imageGroupNumbers=' || m.dgs || '_' || m.seq || '_%'
JOIN files f
  ON f.inventory_id = 'a44c7f68-21cc-4ea5-89a2-c1c5fd94be78'
 AND f.code = m.file_code;
