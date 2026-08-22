# ДАКрО vs «Зведений каталог метричних книг», т. 7 (mbv7)

Research: `migration/acmb/research/mbv7-ДАКрО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 4; B tagged | 158; H re-dated | 416; G retitled | 2873; ROLLBACK

- A — справи created by опис: {'787-2': 2, '610-1': 1, '1-1': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 416, 'shifted': 26, 'disjoint': 35, 'typo>60y': 17} (the rest → editor review, `analysis/actions-ДАКрО.json` → `year_disagree`).
- G — placeholder-title family: `^(Метричні книги Православних церков.*|Church boards and churches, Kropyvnytsky.*)$`.
- Excluded refs (year printed as a справа number / glued code): ['149-1-1781'].

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
