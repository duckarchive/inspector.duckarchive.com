# ДАДнО (Державний архів Дніпропетровської області) vs «Зведений каталог метричних книг», т. 1, с. 492–642

Research: `migration/acmb/research/mbv1-ДАДнО.md` (copy in `analysis/`). Generated with `migration/acmb/research/tools/generate.py config.json`.

**Applied 2026-08-22** (`migration.sql`, dry-run then COMMIT):
- B — 50 files tagged «метрична книга» + kinds: `02-tags.csv`.
- C — `193-3-663` got its years (1902).
- H — 103 year ranges widened (DB ⊂ catalog): `04-years.csv`. Skipped: 49 disjoint, 9 shifted, 4 catalog typos → editor review (`analysis/actions-ДАДнО.json` → `year_disagree`).
- G — 82 «Метричні книги Православних церков» placeholders → «Метрична книга. <church, place>»: `03-titles.csv`.

Excluded: `193-3-1900` (the year 1900 printed where a справа number should be — опис 3 ends at 887). ЗАГС books («Книга регистрации актов гражданского состояния …»), the rabbinate series and the descriptive «Метрична книга про народження… <church>» titles are real and untouched. Two heuristic suspicious codes (`104-1-17500`, `104-1-18498`) have no twins.
