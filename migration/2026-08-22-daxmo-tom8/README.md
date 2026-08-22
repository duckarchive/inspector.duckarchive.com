# ДАХмО vs «Зведений каталог метричних книг», т. 8 (mbv8-b1, mbv8-b2)

Research: `migration/acmb/research/mbv8-b1-ДАХмО.md`, `migration/acmb/research/mbv8-b2-ДАХмО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 51; B tagged | 2160; D fond-year rows | 4; H re-dated | 154; G retitled | 2516; ROLLBACK

- A — справи created by опис: {'227-1Д': 27, '227-5Д': 16, '17-1': 3, '685-2': 1, '227-9Д': 1, '227-3Д': 1, '227-2Д': 1, '277-1': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 154, 'typo>60y': 7, 'disjoint': 23} (the rest → editor review, `analysis/actions-ДАХмО.json` → `year_disagree`).
- G — placeholder-title family: `^Церковні записи, .*`.
- Excluded refs: none.
- опис 17-6 skipped (1 ref(s) — likely a typo)

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
