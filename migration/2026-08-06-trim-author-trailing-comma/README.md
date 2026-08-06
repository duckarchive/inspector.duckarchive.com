# Trim trailing comma from author titles

## Why

Some `authors.title` values end with a stray trailing comma (e.g. `"Покровська
церква, с. Новокурське Херсонський повіт,"`). A plain

```sql
UPDATE authors SET title = regexp_replace(title, ',$', '') WHERE title LIKE '%,';
```

fails with a unique-constraint violation on `authors_title_lat_lng_key`
whenever trimming the comma makes a title collide with another author that
already has that exact `(title, lat, lng)`.

## Scope (as measured on duck_dev@localhost:5555/inspector, 2026-08-06)

- 171 authors have a trailing comma.
- Of those, 2 collide with an existing author once trimmed — real duplicates,
  not just formatting differences. No comma-vs-comma pairs collide with each
  other.
- The other 169 trim safely with no conflict.

## What `apply.sql` does

1. **Batch 1 — merge collisions.** For each comma-suffixed author whose
   trimmed title collides with another author's `(title, lat, lng)`, merges it
   into that author the same way the app's own author-merge action does
   (`mergeAuthorInto()` in
   `app/api/editor/actions/[entity]/[id]/data.ts`): re-point `file_authors`
   and `case_authors` to the target, union `tags`, fill blank `info`, then
   delete the source row. Written as a generic loop (not hardcoded IDs) so a
   different environment's duplicate set is handled the same way — see the
   caveat in `rollback.sql` if you run this elsewhere.
2. **Batch 2 — trim the rest.** Runs the original `UPDATE ... regexp_replace`
   query; safe now that batch 1 removed every colliding row.

Both batches run inside one transaction. Safe to re-run (idempotent): once a
row is merged or trimmed it no longer matches either batch's `WHERE`.

## Snapshots (dev run, 2026-08-06)

Captured before running `apply.sql`, needed by `rollback.sql`:

- `pre_merge_snapshot.csv` — the 2 merged pairs' full author rows before merge.
- `moved_case_authors.csv` — the 13 `case_authors` rows re-pointed by the merge.
- `pre_trim_titles.csv` — the 169 authors that were only trimmed, with their
  original (comma-suffixed) title.

## Rollback

```
psql "$DATABASE_URL" -f rollback.sql
```

Run from this directory (the `\copy` commands are relative to CWD). This
restores the exact dev-run state. **It only matches the dev run** — if
`apply.sql` is run against another database (staging/prod), batch 1's loop may
match a different set of duplicate authors there. Before applying elsewhere,
take fresh snapshots with the queries below and rewrite `rollback.sql`'s
hardcoded `INSERT INTO authors` / merged-pair values accordingly:

```sql
-- duplicate pairs batch 1 will merge
SELECT a.id AS src_id, a.title AS src_title, b.id AS tgt_id, b.title AS tgt_title
FROM authors a
JOIN authors b
  ON b.id <> a.id
 AND b.title = regexp_replace(a.title, ',$', '')
 AND b.lat IS NOT DISTINCT FROM a.lat
 AND b.lng IS NOT DISTINCT FROM a.lng
WHERE a.title LIKE '%,';

-- case_authors / file_authors rows about to move
SELECT author_id, case_id FROM case_authors WHERE author_id IN (/* src ids above */);
SELECT author_id, file_id FROM file_authors WHERE author_id IN (/* src ids above */);

-- authors that will only be trimmed (not merged)
SELECT id, title FROM authors WHERE title LIKE '%,' AND id NOT IN (/* src ids above */);
```
