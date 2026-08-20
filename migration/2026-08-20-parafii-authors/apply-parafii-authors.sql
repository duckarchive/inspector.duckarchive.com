-- Парафії України (5 CSVs by confession, 1,185 rows) → authors add/enrich.
-- Source CSVs: Google MyMaps-style export — WKT point, назва, реєстр (URL to
-- FamilySearch viewer / daro-metric-map / regestry.lubgens.eu), населені
-- пункти, повіт (+ redundant Координати column in 2 files, verified 0
-- mismatches vs WKT).
--
-- Matching against existing authors (16,187 rows; parishes titled like
-- "Церква X, с. Y ... повіт" with confession tags):
--   - candidate = best trigram match (similarity >= 0.4) per CSV row;
--   - ENRICH when: similarity >= 0.5 AND distance < 2km (geo-confirmed), or
--     similarity >= 0.75 when the author has no coords;
--   - confession-conflict guard: an author tagged with a DIFFERENT confession
--     is never enriched (this correctly rejected "Олицький костел" →
--     "Синагога, м. Олика" at 0km, and "Радзивилівський костел" → church);
--   - when several CSV rows win the same author, only the best (similarity,
--     then distance) enriches — the rest are inserted as new;
--   - everything else is inserted as a new author.
-- Expected outcome: 157 enriched, 1,028 inserted (ON CONFLICT-protected by
-- the (title, lat, lng) unique constraint).
--
-- Enrich writes: append "Населені пункти: ... | Реєстр: <url>" to info, add
-- the confession tag if missing, fill lat/lng only where NULL.
-- Insert writes: title as-is (trimmed), coords from WKT, tags=[confession],
-- info = "Повіт: ... | Населені пункти: ... | Реєстр: <url>".
-- Confession tag normalized to the existing vocabulary ('іудаїзм', not
-- 'юдаїзм').
--
-- Run from this directory:  psql "$DB" -f apply-parafii-authors.sql
-- Pre-state snapshot (for rollback-parafii-authors.sql): pre-state-authors.csv

CREATE TEMP TABLE stg (
  id serial,
  wkt text, title text, registry text, settlements text, povit text, koord text,
  confession text, conf_tag text, lat float8, lng float8
);

\copy stg (wkt,title,registry,settlements,povit,koord) FROM 'Парафії України - Греко-католики.csv' CSV HEADER
UPDATE stg SET confession = 'греко-католицизм' WHERE confession IS NULL;
\copy stg (wkt,title,registry,settlements,povit,koord) FROM 'Парафії України - Православні.csv' CSV HEADER
UPDATE stg SET confession = 'православ''я' WHERE confession IS NULL;
\copy stg (wkt,title,registry,settlements,povit) FROM 'Парафії України - Протестанти.csv' CSV HEADER
UPDATE stg SET confession = 'протестантизм' WHERE confession IS NULL;
\copy stg (wkt,title,registry,settlements,povit) FROM 'Парафії України - Римо-католики.csv' CSV HEADER
UPDATE stg SET confession = 'римо-католицизм' WHERE confession IS NULL;
\copy stg (wkt,title,registry,settlements,povit) FROM 'Парафії України - Юдеї.csv' CSV HEADER
UPDATE stg SET confession = 'юдаїзм' WHERE confession IS NULL;

UPDATE stg SET conf_tag = CASE confession WHEN 'юдаїзм' THEN 'іудаїзм' ELSE confession END;

-- WKT is "POINT (lng lat)"; a few rows have a stray leading space
UPDATE stg SET
  lng = (regexp_match(wkt, '^POINT \( *(-?[0-9.]+) +(-?[0-9.]+) *\)$'))[1]::float8,
  lat = (regexp_match(wkt, '^POINT \( *(-?[0-9.]+) +(-?[0-9.]+) *\)$'))[2]::float8;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM stg WHERE lat IS NULL OR lng IS NULL
             OR coalesce(trim(title),'') = '' OR coalesce(trim(registry),'') = '') THEN
    RAISE EXCEPTION 'staging has unparsable/empty rows — aborting';
  END IF;
END $$;

BEGIN;

SET LOCAL pg_trgm.similarity_threshold = 0.4;

CREATE TEMP TABLE cand ON COMMIT DROP AS
SELECT
  s.id AS stg_id, s.title, s.registry, s.settlements, s.povit, s.conf_tag,
  s.lat AS s_lat, s.lng AS s_lng,
  a.id AS author_id, a.title AS a_title, a.lat AS a_lat,
  a.info AS a_info, a.tags AS a_tags,
  similarity(a.title, s.title) AS sim,
  CASE WHEN a.lat IS NOT NULL THEN
    sqrt(power((a.lat - s.lat)*111.0, 2) + power((a.lng - s.lng)*70.0, 2))
  END AS dist_km
FROM stg s
LEFT JOIN LATERAL (
  SELECT a.* FROM authors a WHERE a.title % s.title
  ORDER BY similarity(a.title, s.title) DESC LIMIT 1
) a ON true;

CREATE TEMP TABLE enrich ON COMMIT DROP AS
SELECT *,
  row_number() OVER (PARTITION BY author_id ORDER BY sim DESC, dist_km ASC NULLS LAST) AS rn
FROM cand
WHERE author_id IS NOT NULL
  -- confession-conflict guard
  AND NOT (
    a_tags && ARRAY['православ''я','римо-католицизм','греко-католицизм','іудаїзм',
                    'лютеранство','протестантизм','іслам','старообрядництво','вірмено-католицизм']
    AND NOT a_tags @> ARRAY[conf_tag]
  )
  AND ((sim >= 0.5 AND dist_km < 2) OR (sim >= 0.75 AND dist_km IS NULL));

-- 1) enrich matched authors
UPDATE authors a SET
  info = concat_ws(' | ',
    a.info,
    CASE WHEN coalesce(trim(e.settlements),'') <> ''
         THEN 'Населені пункти: ' || trim(e.settlements) END,
    'Реєстр: ' || trim(e.registry)),
  tags = CASE WHEN a.tags @> ARRAY[e.conf_tag] THEN a.tags ELSE a.tags || e.conf_tag END,
  lat  = coalesce(a.lat, e.s_lat),
  lng  = coalesce(a.lng, e.s_lng)
FROM enrich e
WHERE e.rn = 1 AND a.id = e.author_id;

-- 2) insert everything else as new authors
INSERT INTO authors (title, info, lat, lng, tags)
SELECT
  trim(s.title),
  concat_ws(' | ',
    CASE WHEN coalesce(trim(s.povit),'') <> '' THEN 'Повіт: ' || trim(s.povit) END,
    CASE WHEN coalesce(trim(s.settlements),'') <> ''
         THEN 'Населені пункти: ' || trim(s.settlements) END,
    'Реєстр: ' || trim(s.registry)),
  s.lat, s.lng, ARRAY[s.conf_tag]
FROM stg s
WHERE s.id NOT IN (SELECT stg_id FROM enrich WHERE rn = 1)
ON CONFLICT (title, lat, lng) DO NOTHING;

-- verification: expect 157 enriched / 1,028 inserted / authors total 16187+1028
SELECT (SELECT count(*) FROM enrich WHERE rn = 1) AS enriched,
       (SELECT count(*) FROM authors) - 16187 AS inserted,
       (SELECT count(*) FROM authors WHERE info LIKE '%Реєстр:%') AS with_registry;

-- confession breakdown of what landed
SELECT unnest(tags) AS tag, count(*) FROM authors
WHERE info LIKE '%Реєстр:%' GROUP BY 1 ORDER BY 2 DESC;

COMMIT;
