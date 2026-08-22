# ДАХеО vs «Зведений каталог метричних книг», т. 6 (mbv6)

Research: `migration/acmb/research/mbv6-ДАХеО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 104; B tagged | 5; D fond-year rows | 16; E removed | 1; H re-dated | 102; G retitled | 38; ROLLBACK

- A — справи created by опис: {'316-1': 22, '207-1': 12, '316-2': 11, '198-1': 11, '137-29': 11, '137-37': 6, '137-25': 5, '137-14': 3, '137-31': 3, '269-1': 2, '259-27': 2, '137-30': 2}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 1 [['ДАХеО-137-15-1603', 'ДАХеО-137-15-1']].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 102, 'disjoint': 50, 'typo>60y': 1} (the rest → editor review, `analysis/actions-ДАХеО.json` → `year_disagree`).
- G — placeholder-title family: `^(Метрическая книга|Метрична книга)$`.
- Excluded refs: none.

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
