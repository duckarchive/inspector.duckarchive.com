# ДАЧвО vs «Зведений каталог метричних книг», т. 3 (mbv3)

Research: `migration/acmb/research/mbv3-ДАЧвО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 31; B tagged | 624; H re-dated | 124; G retitled | 142; ROLLBACK

- A — справи created by опис: {'1245-9': 18, '1245-1': 5, '605-1': 2, '1245-5': 2, '987-1': 2, '1245-7': 1, '1245-2': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 124, 'typo>60y': 132, 'shifted': 17, 'disjoint': 53} (the rest → editor review, `analysis/actions-ДАЧвО.json` → `year_disagree`).
- G — placeholder-title family: `^(Church Consistory Books, Chernivtsi.*|Church Books, Chernivtsi.*)$`.
- Excluded refs (year printed as a справа number / glued code): ['605-1-1871'].

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
