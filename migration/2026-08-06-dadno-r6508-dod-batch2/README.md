# 2026-08-06 — ДАДнО-Р6508 «дод.» описи, batch 2

Follow-up to `../2026-08-06-dadno-r6508-6dod-linking`: linked the unlinked
FamilySearch copies of nine more Р6508 додаткові описи to the inventory
ids specified by the user:

| parsed prefix | inventory | id |
|---|---|---|
| `8дод.` | 8ДОД (Заводський район, м. Дніпродзержинськ) | `81c71a83…` |
| `30.дод` | 30ДОД (Васильківський район) | `b843aada…` |
| `10дод.` | 10ДОД (Покровський район) | `34f393f9…` |
| `10дод.№2` | 10ДОД2 (Покровський район) | `68f06e90…` |
| `29дод.` | 29ДОД (Межівський район) | `941ce28c…` |
| `27дод.` | 27ДОД (Новомосковський район) | `d33dab2a…` |
| `19дод.` | 19ДОД (Синельниківський район) | `4621fd5f…` |
| `25дод.` | 25ДОД (Царичанський район) | `90374df3…` |
| `22дод.` | 22ДОД (Павлоградський район) | `24414a0d…` |

Punctuation variants (`Nдод.` / `N.дод` / `Nдод`) fold to one опис per
number; `10дод.№2` matched separately from `10дод.`. Mapping pre-validated:
every already-linked sibling of each variant already pointed at exactly its
target inventory. Year-suffixed FS re-listings of the same scan link to the
same file, as before.

## Result

138 copies linked (справа numbers extracted from the first `+++` segment).
Only **2 files created** (30ДОД справи 6 and 12) — everything else already
existed. 0 unlinked copies remain for these nine описи.

Still unlinked in this fond, NOT covered here (no target given): `1дод.`
(5), `13дод.` (4), `14дод.` (34), `20дод./20.дод` (11), `23дод.` (1),
`24дод.` (2), `26дод.` (1), `28дод./28.дод` (4), `5дод.` (1), `7дод.` (3).

## Files

- `before-unlinked.csv` — the 138 rows before linking
- `create-and-link.sql` — the migration (dry-run-verified)
- `apply-output.log` — real-run output
- `created-files.csv` — the 2 created files
- `linked-copies.csv` — copy → file audit
- `rollback.sql` — run from repo root; unlinks the 138, deletes the 2
