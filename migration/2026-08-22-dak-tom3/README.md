# ДАК vs «Зведений каталог метричних книг», т. 3 (mbv3)

Research: `migration/acmb/research/mbv3-ДАК.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 21; B tagged | 6; D fond-year rows | 6; H re-dated | 15; G retitled | 25; ROLLBACK

- A — справи created by опис: {'237-1': 19, '312-1': 2}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 15, 'disjoint': 1} (the rest → editor review, `analysis/actions-ДАК.json` → `year_disagree`).
- G — placeholder-title family: `^Метричні книги (католиків|костьолів|римо-католицьких костелів) .*$`.
- Excluded refs: none.

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
