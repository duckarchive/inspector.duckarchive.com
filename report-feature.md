# User Report Multistep Form (Modal Wizard) — implemented

## Context

The public fond/inventory/file pages had a single-textarea "Повідомити про помилку" modal (`components/report-button.tsx`) — hardcoded Ukrainian, free text only. It is now a localized **linear wizard**: five steps, one question per view, each of the first four a yes/no gate that reveals its form when answered "Так" and advances immediately on "Ні".

**Step order** (steps that cannot apply to the entity are skipped entirely):

| # | Question | "Так" reveals | Entities |
|---|---|---|---|
| 1 | Змінити реквізити? | archive / fond / inventory pickers (new parent) | all |
| 2 | Змінити посилання на онлайн копію? | select over the record's copies + free-text URL | inventory, file |
| 3 | Змінити основні дані? | title, info, years | all |
| 4 | Прив'язати геолокацію? | author linker + map location picker | file |
| 5 | Повідомте про проблему звичайним текстом | textarea | all |

Step 2 is skipped for fonds (an `OnlineCopy` attaches to an inventory or a file, never a fond); step 4 is file-only (`FileAuthor` / `FileLocation` are file-scoped).

**Locked decisions:**
- Data step fields: **title, info, years** only (no code).
- Submission model (updated — see "Structured submissions map to real action types" below): a **text-only** report still submits a single `type: "report"` action with a plain-string note, exactly as before. A **structured** report (any gate answered "Так") is instead split into one proper typed action per field that has a matching action type — `change_parent`, `change_title`, `change_info`, `add_year_range`/`remove_year_range`, `add_location`, `connect_to_author`/`add_author`, `add_online_copy` — via `buildReportActionBodies()` (`components/report/types.ts`). Only the pieces with no matching action type (an existing online copy flagged as wrong — there's no "change copy url" action — and any free-text comment left alongside structured fields) still go into a `type: "report"` note. `validateSubmitAction`/`applyMutation` are otherwise unchanged for those types, and their queue rows execute exactly like editor-submitted ones once an admin approves.
- Server permissions: `POST /api/editor/actions/[entity]` allows any authenticated (non-banned) user to submit `type: "report"` **or** one of `SELF_SERVICE_TYPES` (`lib/editor-actions.ts` — the typed actions the wizard can now produce); every other type still requires `is_admin`. Both stay pending until an admin approves, so widening the *create* permission carries no more risk than the original report-only bucket did.
- Security: the wizard reads only public endpoints. Writes go through `POST /api/editor/actions/[entity]`, one call per generated action body (sequential, not the admin-only `/batch` route), auth required, banned users 403.
- Both the report and CSV buttons render only for authenticated users (`useSession().status === "authenticated"`).

**Key constraint:** a partial unique index in `@duckarchive/prisma` allows only **one pending action per (type, target)** → a second action of the same type for the same target returns 409. A structured submission that produces several action bodies batches same-type values into one action's `note` (an array, e.g. multiple new locations/authors/year-ranges in one `value: [...]`) rather than one action per item, so it doesn't self-collide; `applyMutation` accepts both the array shape and the older single-value shape. A submission failure on one generated action (e.g. a genuine duplicate) doesn't block the others — the wizard reports success as long as at least one action was recorded.

**Structured submissions map to real action types (follow-up to the original "everything stays report" decision):** the original design kept every structured report under `type: "report"` because execute-on-report was a permanent no-op — an admin had to read the diff and manually recreate the equivalent typed actions (observed in practice: a `report` action approved, then the same title/info change resubmitted by hand as `change_title`/`change_info` minutes later). Routing structured content straight to the real action type removes that manual step: an admin approving the (now normal) `change_title`/`add_location`/etc. row in the queue applies the change directly, the same as an editor-submitted proposal.

## What was built

### 1. `app/api/authors/` — new public endpoint

`GET /api/authors?q=` returns a lean `PublicAuthor[]` (`id, title, info, lat, lng, tags`), capped at 200, ordered by title. Deliberately omits the editor's moderation metadata (`has_pending_action`, link counts) — computing those scans every pending action, and they are not public information.

`hooks/useAuthors.ts` wraps it, and the **editor pickers now share it**: `components/editor/authors-field.tsx` and the merge picker in `author-edit-modal.tsx` moved off admin-only `/api/editor/authors`. The editor *authors dashboard* (`app/editor/authors/page.tsx`) still uses `/api/editor/authors` because its table needs that enriched shape.

### 2. `lib/editor-actions.ts` — payload types + validation

`ReportNotePayload` holds one optional key per wizard section (`tree`, `online_copy`, `data`, `geo`, `text`); `ActionNotePayload` gained `report?: ReportNotePayload` (`decodeNote` already tolerates extra keys, so old notes are unaffected). Helpers: `reportSections()`, `REPORT_SECTION_LABELS`, `MAX_REPORT_NOTE_LENGTH = 10_000`.

`validateSubmitAction` case `"report"`: rejects notes over the cap; when the note carries `.report`, requires `target_id` and at least one non-empty section. Plain-text and empty-note reports stay valid (legacy compatible).

### 3. `lib/api.ts` — `ApiError extends Error { status?: number }`

`postFetcher` throws it so the client maps 409/401 to translated messages. Non-breaking: existing consumers only read `.message`.

### 4. `components/editor/year-ranges-field.tsx` — optional `labels` prop

Defaults to the current uk strings, so editor call sites are unchanged; the wizard passes translations.

### 5. `components/report/` + rewritten `components/report-button.tsx`

`report-button.tsx` keeps its import path and renders the trigger + `Modal.Container size="lg" scroll="inside"` shell; the wizard is remounted per open, which resets the step stack and draft.

```
components/report/
  types.ts             — ReportCurrentValues, ReportDraft, StepId, stepsForEntity, draftToPayload
  report-wizard.tsx    — step stack, draft state, gate buttons, footer (Back/Cancel/Next|Submit)
  step-tree.tsx        — cascading pickers on PUBLIC endpoints, client-side filtering
  step-online-copy.tsx — select over the record's own copies + free-text URL
  step-data.tsx        — title / info / YearRangesField, diffed against current values
  step-geo.tsx         — author search (public) + free-text new author + CoordinatesInput
  use-submit-report.ts — raw usePost (not useSubmitAction, whose toasts are hardcoded uk)
```

"Далі" stays disabled until a gate answered "Так" has actual content, so an empty section can never be submitted. Answering "Ні" clears whatever that gate had collected, keeping Back truthful.

**Tree step endpoints** (all public, whole-level dumps filtered client-side — none of them accept `q`):
- archives: `GET /api/catalog`
- fonds: `GET /api/catalog/[archive]` → `.fonds`
- inventories: `GET /api/catalog/[a]/[f]` → `.inventories`

The deepest picked level is an inventory, so the paginated files list is never needed.

### 6. Call sites

`components/fond-table.tsx`, `inventory-table.tsx`, `file-table.tsx` pass `current={{ title, info, years, codes, onlineCopies?, authors? }}` from data the page already has — no refetch. **Guard nested arrays with `?.`**: `fetcher` does not check `res.ok`, so a 404 body (`{message}`) arrives as data, and `file?.years.map()` would throw.

### 7. Admin dashboard — `components/editor/actions-table.tsx`

`noteCell()` replaces `noteLabel()` in the note column: structured reports render as section headers plus compact lines (`назва: "old" → "new"`, years `+1850–1861 / −1840–1849`, new location as a catalog link, online-copy host link, muted user comment). Anything else falls back to the previous `noteLabel` string, so legacy plain-text and `field/value` notes render as before.

### 8. Translations

New `report-form` namespace, 50 flat kebab-case keys, identical key sets across all 7 locales (uk, en, pl, cz, ro, es, it). `progress` uses ICU `{current}` / `{total}`.

Known gap: `components/coordinates-input.tsx` (the map picker reused in step 4) still has hardcoded uk placeholders.

## Verification status

- `npx tsc --noEmit` clean; `npx eslint` clean on all changed files.
- `npm run build` compiles; its lint gate fails only on three pre-existing errors in untouched files (`app/editor/catalog/fonds`, `.../inventories`, `app/editor/online-copies`) — identical on a clean tree.
- `validateSubmitAction` round-trip checked over 9 cases (legacy plain text, structured, missing target, empty sections, over-length, section detection).
- `GET /api/authors?q=` verified 200 unauthenticated, lean shape.
- Signed-out catalog pages render with both buttons hidden.
- **Not yet exercised:** the wizard itself end to end (needs a signed-in session), and the admin queue rendering of a structured report.
