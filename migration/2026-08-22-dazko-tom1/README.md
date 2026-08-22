# ДАЗкО (Державний архів Закарпатської області) vs «Зведений каталог метричних книг», т. 1, с. 668–776

Research: `migration/acmb/research/mbv1-ДАЗкО.md` (copy in `analysis/`). Generated with `migration/acmb/research/tools/generate.py config.json`. Catalog refs use `ФР–1606, оп. 4, пр.22` (Р-fonds, `пр.` for `спр.`) → DB codes `Р1606`.

**Applied 2026-08-22** (`migration.sql`, dry-run then COMMIT):
- A — опис `Р151-6` created + 2 справи (`Р151-6-25` church of Міжгір’я 1922–1947; `Р1606-7-100` Lutheran church of Новий Кленовець 1891–1946): `01-missing-files.csv`. (A stray `1606–1606` range on `Р151-6-25`, leaked from the neighbouring fond number, was removed right after.)
- B — 10 files tagged «метрична книга» + kinds: `02-tags.csv`.
- H — 85 year ranges widened (DB ⊂ catalog): `04-years.csv`. Skipped: 45 catalog typos (>60-year spans), 12 disjoint and 5 shifted — note `Р1606-5-15` / `Р1606-5-16` carry each other's years (1854–1894 vs 1827–1852) in the DB vs the catalog: editor review.
- G — 1 231 FamilySearch titles «Колекція церковних метричних книг Закарпаття (ф. N), N-N» → «Метрична книга. <церква, село, район>»: `03-titles.csv`.

Two heuristic "suspicious" codes (`Р1606-13-9682`, `Р1606-3-4710`) have no twins and were left.
