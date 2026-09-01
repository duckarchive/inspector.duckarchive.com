-- Review query (READ-ONLY): linked file copies whose CURRENT claim text no longer
-- names the linked file. Since the cutover the scrapper rewrites `parsed` in
-- place on linked rows, so a genuine re-cataloguing on the source (FamilySearch
-- corrects an archival reference from справа 24 to 42) shows up here instead of
-- as a twin. Same fold as the autolink matcher (FS blob → first segment, Latin
-- homoglyphs → Cyrillic, whitespace dropped). Expect noise from том/частина and
-- Р-prefix variants — it is a review list, not an action list.
-- Run from this folder: psql … -v cutover='2026-09-02 10:00' -f 06-review-drifted-links.sql
\set ON_ERROR_STOP on

\copy (SELECT oc.id, r.code AS resource, oc.url, oc.parsed, f.full_code, oc.updated_at FROM online_copies oc JOIN files f ON f.id = oc.file_id JOIN resources r ON r.id = oc.resource_id WHERE oc.source_key IS NOT NULL AND oc.updated_at >= :'cutover'::timestamp AND translate(upper(regexp_replace(CASE WHEN oc.parsed LIKE '%+++%' AND oc.parsed ~ '^[^()]+-\(.*\)$' THEN substring(oc.parsed from '^([^()]+)-\(') || '-' || btrim(split_part(substring(oc.parsed from '^[^()]+-\((.*)\)$'), '+++', 1)) ELSE oc.parsed END, '\s+', '', 'g')), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') <> translate(upper(f.full_code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') ORDER BY oc.updated_at DESC) TO 'audit/drifted-links.csv' CSV HEADER

SELECT 'rows written to audit/drifted-links.csv' AS what;
