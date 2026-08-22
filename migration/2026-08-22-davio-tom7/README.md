# ДАВіО (Державний архів Вінницької області) vs «Зведений каталог метричних книг», т. 7, с. 10–291

Research: `migration/acmb/research/mbv7-ДАВіО.md` (copy in `analysis/`). Generated with `migration/acmb/research/tools/generate.py config.json`.

**Applied 2026-08-22** (`migration.sql`, dry-run then COMMIT):
- A — 43 справи created (Ф. 116 оп. 1: 17; Ф. 904 various описи: 24; Ф. 109, 686): `01-missing-files.csv`.
- B — 22 files tagged «метрична книга» + kinds (4 of the 26 candidates already had it): `02-tags.csv`.
- C — 7 files got years, 1 a title.
- D — year ranges for 27 fonds that had none (Ф. 85, 86, 88, 92, 109, 113, 116, 124, …).
- E — 5 glued duplicates deleted, each with an identical-title-and-span twin in the catalog set (`669-1-18207`→`669-1-18`, `904-18-21133`→`904-18-21`, `904-19-15174`→`904-19-15`, `904-22-111897`→`904-22-11`, `904-22-50114`→`904-22-50`).
- H — 246 year ranges widened (DB ⊂ catalog): `04-years.csv`. Skipped: 116 disjoint, 5 shifted, 2 typos → editor review.
- G — 796 placeholder titles → «Метрична книга. <church, place, повіт, губернія>»: church-name-only titles («Покровська», «Різдво-Богородична», «Свято-Миколаївська» …, 759) and the generic «Метричні книги римо-католицьких костелів <повіт>у» (37): `03-titles.csv`. Rabbinate series («Метрична книга євреїв м. Янів» …) untouched.
