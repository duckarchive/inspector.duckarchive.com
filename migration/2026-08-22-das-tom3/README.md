# ДАС (Державний архів м. Севастополя) vs «Зведений каталог метричних книг», т. 3, с. 695–715

Research: `migration/acmb/research/mbv3-ДАС.md` (copy in `analysis/`). Generated with `migration/acmb/research/tools/generate.py config.json`.

**Applied 2026-08-22** (`migration.sql`, dry-run then COMMIT):
- A — 6 справи created in Ф. 11 оп. 1 (church of the Sevastopol naval hospital, 1820–1856): `01-missing-files.csv`.
- H — 1 year range widened from the catalog (`30-1-36`: 1896 → 1843–1896): `04-years.csv`.
- G — 30 bare «Метрична книга» titles → «Метрична книга. Церква Дунайської гребельної флотилії, м. Ізмаїл» (Ф. 3 оп. 1): `03-titles.csv`.

Nothing else needed: all 328 catalog справи are in the DB with titles, years and tags. Two titles of the «Метричні книги православних церков …» family were left as they are (descriptive, not placeholders).
