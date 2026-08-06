# 2026-08-06 — ДАДнО-Р6508-6ДОД online-copy linking

Task: link `ДАДнО-(Р-6508-6дод.-N…)` FamilySearch online copies to files of
inventory `06aef9aa-048f-489a-9faa-531f93d0af2f` (ДАДнО → fond Р6508 →
опис `6ДОД` "П'ятихатський район").

## State

24 unlinked copies, справи 1–24. Many are year-suffixed FS re-listings of
the same scan (e.g. `…-8` and `…-8_1924-1927` share one imageGroup URL) —
both variants link to the same file, per the duplicate convention. 11
sibling copies were already linked from a prior pass, all correctly into
this inventory. **All 24 files already existed — link-only, nothing
created.**

After: 35 copies linked to files 1–24; 0 unlinked remain. (One
`Р-6508-26дод.-3` copy belongs to опис `26ДОД`, not this one — untouched.)

## Files

- `before-unlinked.csv` — the 24 rows before linking
- `link.sql` — the migration (dry-run-verified: 24 updated, 0 left)
- `apply-output.log` — real-run output
- `linked-copies.csv` — all 35 copies of this опис after linking
- `rollback.sql` — run from repo root; unlinks exactly the 24 touched rows
