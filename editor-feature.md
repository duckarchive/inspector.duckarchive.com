# Editor Feature — Community Catalog Editing

Spec for letting the community control catalog values in Inspector: flagging and fixing the relations between archival instances and their online copies, with an admin-moderated action queue.

## Context

We are migrating from `fund → description → case` to `fond → inventory → file` structure. The migration is done at the DB level and in other services; Inspector switches after everything is ready. **This feature is built on the new structure only** — no support for the old naming.

**Terminology:** "instance" means `file` or `inventory`. Every instance can have online copies (`FileOnlineCopy`, `InventoryOnlineCopy`) pointing to digitized materials on external resources.

Prisma schema lives in the separate `@duckarchive/prisma` repo and is updated independently. The `Fond`/`Inventory`/`File`/`*OnlineCopy` models already exist; the actions tables below are added there as well.

## Core Idea

All community edits go through an **append-only action log** (`file_actions`, `inventory_actions`). Nothing mutates the catalog directly:

1. A user submits an action (their role determines which types they may submit).
2. The action is recorded as **pending** in the corresponding actions table.
3. An admin reviews the queue and **executes** (applies the catalog mutation) or **rejects** it.

This makes the actions tables a full audit trail of who proposed what, who resolved it, and how.

## Roles & Permissions

Roles come from the Duck API user object (`lib/user.ts` → `GET {DUCK_API_URL}/api/user`). The Duck API is extended (separately) with a role field; today it only has `is_admin` / `is_premium` / `is_banned`.

| Action type | viewer | editor | admin |
|---|---|---|---|
| view catalog | ✅ | ✅ | ✅ |
| `report` | ✅ | ✅ | ✅ |
| `connect_to_online_copy` | — | ✅ | ✅ |
| `disconnect_from_online_copy` | — | ✅ | ✅ |
| `add_online_copy` | — | — | ✅ |
| `remove_online_copy` | — | — | ✅ |
| execute / reject any action | — | — | ✅ |

- Roles only control which action types a user may **submit**. All actions queue for admin resolution — including actions submitted by admins themselves (an admin may submit and immediately execute in one flow, but the record is always created).
- `is_banned` users cannot submit anything.

## Action Lifecycle

State is derived from the row, no separate status column:

| State | Condition |
|---|---|
| **pending** | `resolved_at IS NULL` |
| **executed** | `resolved_at` set, `is_rejected` is not `true` |
| **rejected** | `resolved_at` set, `is_rejected = true` |

- `created_by` / `resolved_by` store the Duck user id.
- Only admins set `resolved_at` / `resolved_by` / `is_rejected`.
- Resolved actions are immutable; there is no un-reject or re-open — submit a new action instead.
- Duplicate prevention is enforced at the DB level (handled separately in the Prisma repo): an identical pending action for the same target cannot be inserted twice.

## Action Types

`ActionType` enum: `report`, `connect_to_online_copy`, `disconnect_from_online_copy`, `add_online_copy`, `remove_online_copy`.

For each type — required fields on submit, and what admin **execution** does. "Copy" below means `FileOnlineCopy` or `InventoryOnlineCopy` depending on the table.

### `report`
Flag something wrong with the relation between an instance and an online copy.
- **Submit:** `file_id` (or `inventory_id`) + `online_copy_id`, `note` required (free text describing the problem).
- **Execute:** no automatic mutation — the admin fixes the data manually (or via follow-up actions) and marks the report executed as "acknowledged/handled".

### `connect_to_online_copy`
Link an existing unlinked copy to an instance.
- **Submit:** `file_id` + `online_copy_id` of a copy whose `file_id` is currently `NULL` (or linked to the wrong instance — note must explain).
- **Execute:** set `Copy.file_id = action.file_id`.

### `disconnect_from_online_copy`
Remove a wrong link between an instance and a copy.
- **Submit:** `file_id` + `online_copy_id` of a copy currently linked to that instance.
- **Execute:** set `Copy.file_id = NULL`. The copy row stays (it may be reconnected elsewhere later).

### `add_online_copy`
Propose a new online copy for an instance.
- **Submit:** `file_id`; `note` carries the payload as a **plain string** — first line is the URL, optional free text on following lines. The resource is inferred from the URL domain at execution time (Inspector already has `Resource` matching logic in the availability code).
- **Execute:** create the `Copy` row (`url`, inferred `resource_id`, `file_id` from the action), then backfill `action.online_copy_id` with the new row's id.

### `remove_online_copy`
Propose deleting an online copy entirely (dead link, garbage data).
- **Submit:** `online_copy_id` (+ `file_id` if linked), `note` recommended.
- **Execute:** delete the `Copy` row.

### Future
Actions managing the instance itself (rename, dates, etc.) are deliberately **out of scope** — users with too much control over instances can mess up an inventory. The `ActionType` enum is extensible; instance-editing actions will be specified separately.

## Data Model

Managed in the `@duckarchive/prisma` repo (out of this repo's context, updated separately). `file_actions` shown; `inventory_actions` is identical with `inventory_id` / `InventoryOnlineCopy` instead.

```prisma
model FileActions {
  created_at     DateTime        @default(now()) @db.Timestamp(6)
  created_by     String          @db.VarChar(255)
  resolved_at    DateTime?       @db.Timestamp(6)
  resolved_by    String?         @db.VarChar(255)
  type           ActionType
  note           String?         @db.Text
  is_rejected    Boolean?
  online_copy_id String?         @db.Uuid
  online_copy    FileOnlineCopy? @relation(fields: [online_copy_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  file_id        String?         @db.Uuid
  file           File?           @relation(fields: [file_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@unique([type, created_by, created_at])
  @@map("file_actions")
}
```

## API (Inspector)

New endpoints, flat collections keyed by UUID (actions reference targets by id, not by archive codes). Auth follows the existing pattern: `Authorization: Bearer` token resolved to a Duck user via `lib/user.ts`; role checked per endpoint.

| Endpoint | Who | Purpose |
|---|---|---|
| `POST /api/actions/{file\|inventory}` | role allowing the `type` | Submit an action. Body: `type`, `file_id`/`inventory_id`, `online_copy_id?`, `note?`. Returns the created action. |
| `GET /api/actions/{file\|inventory}` | admin (full queue), any user (own actions) | List actions; filters: `status` (pending/executed/rejected), `file_id`, `type`. |
| `PATCH /api/actions/{file\|inventory}/{id}` | admin | Resolve: `{ "resolution": "execute" \| "reject", "note"? }`. Execution applies the catalog mutation from [Action Types](#action-types) in the same transaction as marking the action resolved. |

Error cases: `401` no/invalid token, `403` role too low or banned, `404` target not found, `409` action already resolved or duplicate pending action exists, `422` invalid payload (e.g. `add_online_copy` note has no valid URL).

## UI

- **Instance pages** (file / inventory): per online-copy row — "Report a problem" (everyone signed in), "Disconnect" (editor+); page-level "Connect existing copy" (editor+) and "Add online copy" (admin). All actions open a modal with an optional/required note; on submit show a toast: "Sent for review".
- **Admin queue page**: table of pending actions (type, target with link, author, note, age) with execute/reject buttons; filter by type/status. Resolved actions visible in a history tab.
- **i18n:** all strings added to all 7 locales in `messages/` (default `uk`).

## Abuse & Validation

- Banned users: rejected at submit (`403`).
- Duplicate pending actions: prevented at the DB level (see Lifecycle), surfaced as `409`.
- Server-side validation of targets: the referenced instance/copy must exist; `connect` requires the copy to be currently unlinked (or the note to justify relinking); `disconnect` requires it to be linked to the given instance.
- Rate limiting: deferred; the admin queue is the throttle for now.

## Open Issues

- **Cascade delete erases history:** `online_copy_id` has `onDelete: Cascade`, so executing `remove_online_copy` deletes every action that ever referenced that copy — including the remove action itself. Recommendation for the Prisma repo: switch to `onDelete: SetNull` (the column is already nullable) to preserve the audit trail.
- Duck API role field: shape TBD (enum vs boolean flags); Inspector reads it via `lib/user.ts` once available.
- Switchover timing: these endpoints/UI ship together with Inspector's migration to the fond/inventory/file routes.
