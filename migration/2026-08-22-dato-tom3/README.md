# ДАТО vs «Зведений каталог метричних книг», т. 3 (mbv3)

Research: `migration/acmb/research/mbv3-ДАТО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 117; B tagged | 323; D fond-year rows | 1; H re-dated | 31; G retitled | 37; ROLLBACK

- A — справи created by опис: {'486-1': 104, '426-2': 12, '487-1': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'disjoint': 37, 'shifted': 14, 'DB⊂catalog': 31, 'typo>60y': 18} (the rest → editor review, `analysis/actions-ДАТО.json` → `year_disagree`).
- G — placeholder-title family: `^\d+$`.
- Excluded refs: none.

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
