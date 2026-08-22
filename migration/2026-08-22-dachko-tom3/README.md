# ДАЧкО vs «Зведений каталог метричних книг», т. 3 (mbv3)

Research: `migration/acmb/research/mbv3-ДАЧкО.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 40; B tagged | 5602; D fond-year rows | 198; H re-dated | 402; G retitled | 48; ROLLBACK

- A — справи created by опис: {'931-1': 8, '552-1': 6, '931-2': 3, 'Р5899-24': 3, '152-14': 2, '93-1': 2, '91-1': 2, 'Р5899-21': 2, '403-1': 2, '403-6': 2, '562-1': 1, '599-1': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'DB⊂catalog': 402, 'shifted': 35, 'typo>60y': 5, 'disjoint': 54} (the rest → editor review, `analysis/actions-ДАЧкО.json` → `year_disagree`).
- G — placeholder-title family: `^Релігійні установи$`.
- Excluded refs: none.
- опис 162-2 skipped (1 ref(s) — likely a typo)
- опис 488-2 skipped (1 ref(s) — likely a typo)
- опис 556-16 skipped (1 ref(s) — likely a typo)

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
