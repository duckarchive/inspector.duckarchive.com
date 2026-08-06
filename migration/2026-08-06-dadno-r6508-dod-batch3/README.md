# 2026-08-06 — ДАДнО-Р6508 «дод.» описи, batch 3 (completion)

Final pass over `ДАДнО-Р-6508-*`: linked all 119 remaining unlinked
copies. **Fond Р6508 now has 0 unlinked online copies.**

## Patterns

One regex unifies three punctuation variants of the дод-опис code —
`Nдод.-S`, `N.дод-S`, and the newly-seen `N-дод.S` (dash before дод,
справа glued after the dot, e.g. `Р-6508-25-дод.10`). Опис number N maps
to the existing `NДОД` inventory, resolved by inventory *code* under fond
Р6508 (no hardcoded ids): 1, 5, 7, 13, 14, 20, 23, 24, 25, 26, 27, 28,
29, 30 — all 14 already existed. Letter suffixes fold (`14дод.-32а` →
file `32А`).

Special case: two copies `Р-6508--27-141` / `--27-29` carry **no «дод»
marker** → linked to plain опис `27` (file 141 exists only there; both
files pre-existed).

## Result

119 linked (by опис: 14ДОД 34, 27ДОД 31, 20ДОД 11, 29ДОД 10, 1ДОД 5,
25ДОД 5, 28ДОД 5, 13ДОД 4, 26ДОД 3, 7ДОД 3, 24ДОД 2, 30ДОД 2, 27 2,
23ДОД 1, 5ДОД 1). Only **2 files created** (30ДОД справи 8, 9).

## Files

- `before-unlinked.csv` — the 119 rows before linking
- `create-and-link.sql` — the migration (dry-run-verified)
- `apply-output.log` — real-run output
- `created-files.csv` — the 2 created files
- `linked-copies.csv` — copy → file audit
- `rollback.sql` — run from repo root; unlinks the 119, deletes the 2
