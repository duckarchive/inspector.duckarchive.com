-- Review query (READ-ONLY): linked file copies whose CURRENT claim text no longer
-- names the linked file. Since the cutover the scrapper rewrites `parsed` in
-- place on linked rows, so a genuine re-cataloguing on the source (FamilySearch
-- corrects an archival reference from справа 24 to 42) shows up here instead of
-- as a twin. Same fold as the autolink matcher (FS blob → first segment, Latin
-- homoglyphs → Cyrillic, Р/П prefix glued, whitespace dropped). Range claims
-- (архів-фонд-опис-start-end, end > start — one image group spanning many
-- справи, linked to each file of the range) are excluded: they never equal a
-- single full_code and are not drift. Expect some noise from том/частина and
-- fond-prefix variants — it is a review list, not an action list.
-- Run from this folder: psql … -v cutover='2026-09-01 14:45' -f 06-review-drifted-links.sql
\set ON_ERROR_STOP on

CREATE TEMP TABLE t_drift AS
WITH linked AS (
  SELECT oc.id, r.code AS resource, oc.url, oc.parsed, f.full_code, oc.updated_at,
         regexp_replace(
           regexp_replace(
             translate(upper(regexp_replace(
               CASE WHEN oc.parsed LIKE '%+++%' AND oc.parsed ~ '^[^()]+-\(.*\)$'
                    THEN substring(oc.parsed from '^([^()]+)-\(') || '-' ||
                         btrim(split_part(substring(oc.parsed from '^[^()]+-\((.*)\)$'), '+++', 1))
                    ELSE oc.parsed END, '\s+', '', 'g')),
               'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'),
             '-(Р|П)[-. ](?=\d)', '-\1', 'g'),
           '[_/]', '-', 'g') AS code
  FROM online_copies oc
  JOIN files f ON f.id = oc.file_id
  JOIN resources r ON r.id = oc.resource_id
  WHERE oc.source_key IS NOT NULL
    AND oc.updated_at >= :'cutover'::timestamp
)
SELECT id, resource, url, parsed, full_code, updated_at, code
FROM linked
WHERE code <> translate(upper(full_code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ')
  AND NOT (code ~ '^[^-]+-[^-]+-[^-]+-\d+-\d+$'
           AND (substring(code from '-(\d+)-\d+$'))::numeric < (substring(code from '-(\d+)$'))::numeric);

SELECT 'linked rows whose claim text no longer names the file' AS what, count(*) FROM t_drift;
SELECT resource, count(*) FROM t_drift GROUP BY 1 ORDER BY 2 DESC;

\copy (SELECT id, resource, url, parsed, full_code, updated_at FROM t_drift ORDER BY updated_at DESC) TO 'audit/drifted-links.csv' CSV HEADER
