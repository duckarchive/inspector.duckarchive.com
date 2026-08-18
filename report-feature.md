# User Report Multistep Form (Modal Wizard)

## Context

The public fond/inventory/file pages have a single-textarea "Повідомити про помилку" modal (`components/report-button.tsx`) — hardcoded Ukrainian, free text only. Replace it with a localized multistep wizard that guides the user: **general report** (plain text) or **structured report** — issue with the record's *data* (title/info/years), its *location in the archive tree*, or *something else* (online copy issue / duplicate record / free text). A limited, simple echo of the admin editor modals.

**Locked decisions (user-confirmed):**
- Data step fields: **title, info, years** only (no code).
- "Else" branch: **online copy issue + duplicate record + free text**.
- Submission model: **everything stays `type: "report"`** — server permissions unchanged; structured proposals are encoded in the action `note` (JSON via `encodeNote`), general/free-text reports keep a plain string note. Admin reviews in the existing `/editor` dashboard and applies changes manually (execute on `report` is already a no-op).
- Security: wizard uses only public read endpoints (`/api/archives`, `/api/catalog/*`); the single write is the existing `POST /api/editor/actions/[entity]` with `type: "report"` (auth required, banned users 403). Admin-only `/api/editor/catalog/*` endpoints are never touched.

**Key constraint:** partial unique index in `@duckarchive/prisma` (unchangeable here) allows only **one pending report per target** → second submission returns 409; handle with a translated toast. One submission = one report action carrying the whole payload.

## Implementation

### 1. `lib/editor-actions.ts` — payload types + light validation

```ts
export type ReportKind = "data" | "tree" | "online_copy" | "duplicate";
export interface ReportNotePayload {
  kind: ReportKind;
  changes?: { field: "title" | "info"; old: string | null; value: string }[]; // data
  years?: { add: YearRange[]; remove: YearRange[] };                          // data
  parent?: { archive?: {id,code}; fond?: {id,code}; inventory?: {id,code} };  // tree
  online_copy?: { problem: "broken" | "missing"; id?: string; url?: string };
  duplicate?: { full_code: string };
  text?: string; // optional user comment on any branch
}
// ActionNotePayload gets optional `report?: ReportNotePayload` (decodeNote already tolerates extra keys — backward compatible)
export const MAX_REPORT_NOTE_LENGTH = 10_000;
export const REPORT_KIND_LABELS: Record<ReportKind, string> = { data: "Дані запису", tree: "Розташування в дереві", online_copy: "Онлайн-копія", duplicate: "Дублікат" };
```

`validateSubmitAction` case `"report"`: reject note > `MAX_REPORT_NOTE_LENGTH`; if decoded note has `.report`, require valid `kind` and `target_id`. Plain-text/empty-note reports stay valid (legacy compatible).

### 2. `lib/api.ts` — attach HTTP status to errors

`postFetcher` throws `ApiError extends Error { status?: number }` so the client can map 409/401 to translated messages. Non-breaking (existing consumers only read `.message`).

### 3. `components/editor/year-ranges-field.tsx` — optional `labels` prop

`labels?: { legend, empty, from, to, removeAria }` defaulting to current uk strings; editor call sites unchanged, wizard passes translations.

### 4. Translations — `messages/{uk,en,pl,cz,ro,es,it}.json`

New top-level namespace `"report-form"` (flat kebab-case keys, identical across all 7 files):

```
trigger-button, title,
sign-in-text, sign-in-button,
kind-legend, kind-structured, kind-structured-hint, kind-general, kind-general-hint,
branch-legend, branch-data, branch-data-hint, branch-tree, branch-tree-hint, branch-other, branch-other-hint,
other-legend, other-online-copy, other-online-copy-hint, other-duplicate, other-duplicate-hint, other-free-text, other-free-text-hint,
data-title-label, data-info-label, data-years-label, data-years-empty, data-years-from, data-years-to, data-years-remove, data-no-changes-hint,
tree-current-label, tree-new-label, tree-archive-label, tree-fond-label, tree-inventory-label, tree-unchanged-hint,
copy-problem-legend, copy-problem-broken, copy-problem-missing, copy-select-label, copy-url-label,
duplicate-code-label, duplicate-code-hint,
text-placeholder, comment-label, comment-placeholder,
back, cancel, submit,
success, error-already-pending, error-unauthorized, error-generic
```

uk + en written carefully; pl/cz/ro/es/it translated consistently (short UI strings).

### 5. New wizard — `components/report/` + rewrite `components/report-button.tsx`

`report-button.tsx` keeps its import path (used by the 3 tables): trigger `Button` (label = `t("trigger-button")`) + HeroUI v3 `Modal` shell (`Modal.Container size="lg" scroll="inside"`, like `components/editor/fond-edit-modal.tsx`) + auth gate + `<ReportWizard>`. Do NOT touch the unrelated `components/report-modal.tsx`.

New files (all client components):

```
components/report/
  types.ts             — ReportCurrentValues, ReportDraft, StepId
  report-wizard.tsx    — step stack + draft state + shared footer (Back/Cancel/Submit)
  option-list.tsx      — RadioGroup-based chooser (translated label + hint), advances on select
  step-data.tsx        — title Input / info TextArea (prefilled) / YearRangesField; diff like fond-edit-modal.tsx:56-93 but into one payload
  step-tree.tsx        — cascading picker on PUBLIC endpoints via components/select.tsx
  step-online-copy.tsx — broken (Select over current.onlineCopies, fallback URL Input) / missing (URL Input)
  step-duplicate.tsx   — plain full-code text input (e.g. ДАВіО-1-2-345), regex /^[^\s-]+(-[^\s-]+){0,3}$/, hint shows current record's code as example
  step-text.tsx        — TextArea; note stays a PLAIN string (general + free-text paths)
  sign-in-prompt.tsx   — useSession() unauthenticated → text + Button onPress={() => signIn("google")}
  use-submit-report.ts — usePost (NOT useSubmitAction — its toasts are hardcoded uk); maps 409→t("error-already-pending"), 401→t("error-unauthorized")
```

**Step graph** (stack with back-nav, draft survives back, reset on close):
`kind` → structured→`branch` | general→`text` · `branch` → `data`|`tree`|`other` · `other` → `online-copy`|`duplicate`|`text`. Terminal steps get an optional comment `TextArea` (maxLength 2000), except `text` where the textarea is the payload.

**Tree step** (entity-specific, lazy `useGet` with `null` URL until needed, prefilled from current codes, upper-level change resets lower, submit disabled while chain unchanged):
- fond → pick archive: `GET /api/archives`
- inventory → archive, then fond from `GET /api/catalog/[archive]` `.fonds`
- file → archive → fond → inventory from `GET /api/catalog/[a]/[f]` `.inventories`
(Never needs the paginated `files` list — deepest picked level is inventory.)

**Duplicate step rationale:** `/api/search` matches files only and a file-level cascade would hit pagination — plain code input is right for this rare branch; admin resolves manually anyway.

### 6. Call sites — pass current values (no refetch; data already loaded)

`components/fond-table.tsx:57`, `components/inventory-table.tsx:70`, `components/file-table.tsx:116` — add prop:
```ts
current={{ title, info, years, onlineCopies /* inventory+file only */, codes: { archive, fond, inventory?, file? } }}
```

### 7. Admin dashboard — `components/editor/actions-table.tsx` (stays uk-only)

Replace the `noteLabel(row.note)` cell (~line 275) with `noteCell(note): ReactNode`: when `decoded.report` exists render kind label (`REPORT_KIND_LABELS`) + compact lines — `назва: "old" → "new"`, years `+1850–1861 / −1840–1849`, `нове розташування: <codes joined>`, online-copy problem + linked URL (reuse `hostLabel`), duplicate code as `Link` via `catalogItemHref` (`lib/catalog-links.ts`), muted user comment. Fallback: existing `noteLabel` string (legacy plain-text and `field/value` notes render as before). Existing pencil deep-link (`editorHref()`) already opens the record's edit modal — no change.

## Edge cases

- 409 (report already pending) → translated warning toast, keep modal open.
- Unauthenticated → sign-in prompt in modal body; mid-flow session expiry → 401 toast.
- Data step with no diff / tree step with unchanged parent → submit disabled + hint.
- `targetId` undefined (record loading) → trigger button disabled (existing behavior).
- Client maxLength 2000 on inputs; server rejects notes > 10k.
- Fond has no online copies → broken-copy picker degrades to URL input.
- Modal close resets stack + draft.

## Verification

1. `npm run lint` && `npm run build`.
2. `npm run dev`; fond page logged out → sign-in prompt; after Google login → wizard.
3. Walk every branch on fond/inventory/file pages: data diff (single-field change → one entry in payload), tree cascade prefill/reset, online-copy both problems, duplicate validation, free text, general.
4. As admin, `/editor` dashboard: report rows render kind + readable lines + links; execute is still a no-op; reject works; legacy plain-text reports render verbatim.
5. Second report on same record → 409 toast in active locale.
6. Locale switch (en/pl) → wizard fully translated; editor stays uk.
