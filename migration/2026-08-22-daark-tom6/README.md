# ДААРК vs «Зведений каталог метричних книг», т. 6 (mbv6)

Research: `migration/acmb/research/mbv6-ДААРК.md` (copies in `analysis/`). Generated with `migration/acmb/research/tools/execute.py` → `config.json` → `generate.py`.

**Applied 2026-08-22** (`migration.sql`, dry-run OK, then COMMIT): A created | 107; B tagged | 848; H re-dated | 35; G retitled | 170; ROLLBACK

- A — справи created by опис: {'293-1': 36, '142-1': 16, '321-1': 11, '319-1': 8, '324-1': 7, '320-1': 7, '299-1': 4, '142-2': 2, '316-1': 2, '370-1': 2, '669-1': 2, '309-1': 1}; описи created: —.
- E — glued duplicates (identical title + span twin in the catalog set): 0 [].
- H — year ranges widened only where DB ⊂ catalog; classification of all disagreements: {'disjoint': 142, 'typo>60y': 5, 'DB⊂catalog': 35, 'shifted': 4} (the rest → editor review, `analysis/actions-ДААРК.json` → `year_disagree`).
- G — placeholder-title family: `^(Метрическая книга рождения, бракосочетания, смерти.*|Метричні книги Православних церков.*|Метрична книга|Метрическая книга)$`.
- Excluded refs: none.
- опис 142-25 skipped (1 ref(s) — likely a typo)
- опис 142-51 skipped (1 ref(s) — likely a typo)
- опис 142-6 skipped (1 ref(s) — likely a typo)

Inputs: `01-missing-files.csv`, `02-tags.csv`, `03-titles.csv`, `04-years.csv`.
