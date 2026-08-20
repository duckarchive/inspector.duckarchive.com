# 2026-08-20 — Парафії України → authors add/enrich

## Source

5 CSVs (Google MyMaps-style export, were sitting in the repo root) — parishes
of Ukraine by confession, one point each: `WKT` (lng lat), `Назва`, `Реєстр`
(URL to a metric-books registry: FamilySearch viewer, daro-metric-map.pages.dev,
regestry.lubgens.eu), `Населені пункти` (settlements the parish covered),
`Повіт`; the Греко-католики/Православні files carry an extra `Координати`
column — verified fully redundant vs WKT (359 rows, 0 mismatches) and ignored.

Row counts (per COPY; `wc -l` overcounts due to multiline quoted fields):
1,053 православні, 72 греко-католики, 49 римо-католики, 7 юдеї,
4 протестанти = **1,185 total**. All rows have valid WKT (7 had a stray
leading space inside `POINT (…)`) and a registry URL. 13 duplicate-title
groups (bare settlement names like "Селець" ×3) are genuinely distinct
parishes — different coords and registry URLs each — and were all kept.

## Matching against existing authors

`authors` had 16,187 rows before this; parishes there are titled
"Церква X, с. Y <волость> <повіт>" with confession tags. CSV titles are a mix
of that same style, "<settlement>, <dedication>", and bare settlement names
(512 rows) — **0 exact title matches**, so matching = best trigram candidate
(pg_trgm similarity ≥ 0.4) classified by title similarity × geographic
distance:

- **ENRICH** when similarity ≥ 0.5 AND distance < 2 km (geo-confirmed), or
  similarity ≥ 0.75 for authors without coords.
- **Confession-conflict guard**: an author tagged with a different confession
  is never matched. This caught real traps at 0 km: "Олицький костел" vs
  "Синагога, м. Олика" (sim 0.52), "Радзивилівський костел" vs the Radzivyliv
  church. Title similarity alone also mismatched villages on shared dedication
  phrases ("с. Рудники (церква Покрова…)" → "Церква Покрови…, с. Хлонь",
  sim 0.67) — hence the strict 0.75 bar when no geo check is possible.
- Same-name-but-far candidates (>10 km, 120 rows — same village names in
  different powiats, or повіт renames) were treated as NEW parishes.
- When several CSV rows won the same author (5 cases), only the best
  (similarity, then distance) enriched it; the rest were inserted.

## What was written (applied 2026-08-20)

- **157 authors enriched**: `info` += "Населені пункти: … | Реєстр: <url>"
  (appended to the existing eparchy/deanery text), confession tag added where
  missing (9), lat/lng filled where NULL (1).
- **1,028 authors inserted**: title as-is from the CSV (trimmed), coords from
  WKT, `tags = [<confession>]`, `info` = "Повіт: … | Населені пункти: … |
  Реєстр: <url>". The `(title, lat, lng)` unique constraint made the insert
  re-run-safe (`ON CONFLICT DO NOTHING`; 0 conflicts fired).
- Confession tag normalized to the existing vocabulary: `іудаїзм` (not
  юдаїзм); `протестантизм` used for the протестанти file (its 4 rows are
  lutheran/evangelical — existing `лютеранство` tag was left alone).
- All 1,185 CSV rows are queryable via `info LIKE '%Реєстр:%'`.
- **No file/case links were created** — linking parishes to files/cases is a
  separate future task; the registry URLs in `info` are the raw material.

## Files

- `Парафії України - *.csv` — the 5 source CSVs (moved from repo root).
- `apply-parafii-authors.sql` — the whole pipeline (staging, matching,
  guards, enrich UPDATE + insert), self-contained and deterministic.
- `pre-state-authors.csv` — full authors snapshot (16,187 rows) taken
  immediately before apply.
- `rollback-parafii-authors.sql` — deletes authors not in the snapshot and
  restores snapshot values (see its CAUTION note about post-snapshot app
  writes).
