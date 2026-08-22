# ДАВоО (Державний архів Волинської області) vs «Зведений каталог метричних книг», т. 1, с. 21–414

Research: `migration/acmb/research/mbv1-ДАВоО.md` (copy in `analysis/`). Generated with `migration/acmb/research/tools/generate.py config.json`.

**Applied 2026-08-22** (`migration.sql`, dry-run then COMMIT):
- B — «метрична книга» + kind tags on 10 files of Ф. 35 оп. 9 that had none: `02-tags.csv`.
- H — 147 year ranges widened where the DB span was a strict subset of the catalog's (mostly end year +1…+3, e.g. `35-9-1139` 1882–1920 → 1882–1921): `04-years.csv`. 16 disagreements with a >60-year catalog span are print typos and were skipped.
- G — 447 FamilySearch collection-name titles («Церковні записи, Луцько-Ковельський деканат (ф. 35)…», «…Ковельський деканат…», «…Луцький римсько-католицький деканат…») → «Метрична книга. <церква, село, волость, повіт>» from the catalog: `03-titles.csv`.

All 6 485 catalog справи exist in the DB; nothing to create. The other title families (`Метрична книга запису народжень, шлюбів та смерті …`, `Метрична книга парафіян Свято-… церкви …`, `Сповідна відомість …`, ЗАГС books) are descriptive and untouched. 22 high-numbered codes flagged by the heuristic (`35-2-117566`, `382-3-115352`, …) have no identical twin in the catalog set and were left alone.
