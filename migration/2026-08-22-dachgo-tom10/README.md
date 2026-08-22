# ДАЧгО vs «Зведений каталог метричних книг», т. 10 (mbv10-b1, mbv10-b2, mbv10-b3)

Research: `migration/acmb/research/mbv10-b1-ДАЧгО.md`, `migration/acmb/research/mbv10-b2-ДАЧгО.md`, `migration/acmb/research/mbv10-b3-ДАЧгО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 1165; B tagged | 9608; H re-dated | 50; G retitled | 3852; ROLLBACK

- A — справи created by опис: {'1530-2': 644, '679-18': 208, '679-15': 67, '679-16': 47, '1530-4': 45, '679-1': 25, '679-10': 23, '1462-1': 20, '1530-1': 16, '1530-3': 11, '679-12': 11, 'Р72-1': 8}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'disjoint': 98, 'DB⊂catalog': 50, 'shifted': 9, 'typo>60y': 5} (the rest → editor review, `analysis/actions-ДАЧгО.json` → `year_disagree`).
- G — placeholder-title family: `^(Church records, Chernihiv.*|Метричні книги церков .*)$`.
- Excluded refs (year printed as a справа number / glued code): ['1530-2-14020', '679-14-1631', '679-4-136913', '679-4-13704'].

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
