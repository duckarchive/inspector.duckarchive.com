import { ActionType } from "@generated/prisma/client/client";

export type EditorEntity = "fond" | "inventory" | "file";

export const EDITOR_ENTITIES: EditorEntity[] = ["fond", "inventory", "file"];

export const isEditorEntity = (value: string): value is EditorEntity =>
  (EDITOR_ENTITIES as string[]).includes(value);

export type ActionStatus = "pending" | "executed" | "rejected";

export interface YearRange {
  start_year: number;
  end_year: number;
}

export const sameYearRange = (a: YearRange, b: YearRange): boolean =>
  a.start_year === b.start_year && a.end_year === b.end_year;

/** Body accepted by POST /api/editor/actions/[entity]. */
export interface SubmitActionBody {
  type: ActionType;
  /** fond_id / inventory_id / file_id depending on the entity. May be null for pure author edits. */
  target_id?: string | null;
  online_copy_id?: string | null;
  /** Free text, or a structured payload encoded via encodeNote(). */
  note?: string | null;
}

/**
 * Structured payload stored in the action `note` for edits that the bare
 * (type, target) columns cannot express (author target, field + new value).
 * `report` / `add_online_copy` keep using a plain string note instead.
 */
export interface ActionNotePayload {
  v: 1;
  /** Author target for author-related actions stored in file_actions. */
  author_id?: string;
  /** Which attribute is being changed. */
  field?: "title" | "info" | "code" | "tags" | "location" | "parent" | "year_range";
  /** New value: string | string[] | { lat, lng, radius_m } | { start_year, end_year } | parent id. */
  value?: unknown;
  /** Optional human comment alongside the structured change. */
  text?: string;
}

export const encodeNote = (payload: ActionNotePayload): string => JSON.stringify(payload);

export type DecodedNote = ActionNotePayload | { raw: string } | null;

export const decodeNote = (note: string | null | undefined): DecodedNote => {
  if (!note) {
    return null;
  }
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object" && parsed.v === 1) {
      return parsed as ActionNotePayload;
    }
    return { raw: note };
  } catch {
    return { raw: note };
  }
};

/** Ukrainian labels for action types (editor is uk-only). */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  report: "Скарга",
  connect_to_online_copy: "Прив'язати онлайн-копію",
  disconnect_from_online_copy: "Відв'язати онлайн-копію",
  add_online_copy: "Додати онлайн-копію",
  remove_online_copy: "Видалити онлайн-копію",
  add: "Додати",
  remove: "Видалити",
  merge_to: "Об'єднати з",
  change_parent: "Змінити батьківський запис",
  change_title: "Змінити назву",
  change_code: "Змінити індекс",
  change_info: "Змінити опис",
  add_year_range: "Додати роки",
  remove_year_range: "Видалити роки",
  connect_to_author: "Прив'язати автора",
  disconnect_from_author: "Відв'язати автора",
  add_author: "Додати автора",
  remove_author: "Видалити автора",
  change_author_title: "Змінити назву автора",
  change_author_info: "Змінити опис автора",
  change_author_tags: "Змінити теги автора",
  change_author_location: "Змінити локацію автора",
  add_location: "Додати локацію",
  remove_location: "Видалити локацію",
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "Очікує",
  executed: "Виконано",
  rejected: "Відхилено",
};

const ONLINE_COPY_TYPES: ActionType[] = [
  "connect_to_online_copy",
  "disconnect_from_online_copy",
  "add_online_copy",
  "remove_online_copy",
];
const AUTHOR_TYPES: ActionType[] = [
  "connect_to_author",
  "disconnect_from_author",
  "add_author",
  "remove_author",
  "change_author_title",
  "change_author_info",
  "change_author_tags",
  "change_author_location",
];
const LOCATION_TYPES: ActionType[] = ["add_location", "remove_location"];
const AUTHOR_ID_TYPES: ActionType[] = [
  "connect_to_author",
  "disconnect_from_author",
  "remove_author",
  "change_author_title",
  "change_author_info",
  "change_author_tags",
  "change_author_location",
];

/**
 * Server-side validation for a submitted action. Returns an error message, or
 * null when valid. Enforces entity applicability and required fields per type.
 */
export const validateSubmitAction = (entity: EditorEntity, body: SubmitActionBody): string | null => {
  const { type, target_id, online_copy_id, note } = body;
  if (!type || !(type in ACTION_TYPE_LABELS)) {
    return `Невідомий тип дії "${type}"`;
  }

  // Entity applicability.
  if (entity === "fond" && (ONLINE_COPY_TYPES.includes(type) || AUTHOR_TYPES.includes(type) || LOCATION_TYPES.includes(type))) {
    return `Дію "${type}" не можна застосувати до фонду`;
  }
  if (entity === "inventory" && (AUTHOR_TYPES.includes(type) || LOCATION_TYPES.includes(type))) {
    return `Дію "${type}" не можна застосувати до опису`;
  }

  // Author id payload check for author-targeting types.
  if (AUTHOR_ID_TYPES.includes(type)) {
    const decoded = decodeNote(note);
    if (!decoded || "raw" in decoded || !decoded.author_id) {
      return `Дія "${type}" потребує author_id у note`;
    }
  }

  switch (type) {
    case "change_title":
    case "change_code":
    case "change_info":
    case "change_parent":
    case "add_year_range":
    case "remove_year_range":
      if (!target_id) return `"target_id" обовʼязковий для "${type}"`;
      if (!note) return `"note" обовʼязковий для "${type}"`;
      return null;
    case "connect_to_online_copy":
      if (!target_id) return '"target_id" обовʼязковий';
      if (!online_copy_id) return '"online_copy_id" обовʼязковий';
      return null;
    case "disconnect_from_online_copy":
    case "remove_online_copy":
      if (!online_copy_id) return '"online_copy_id" обовʼязковий';
      return null;
    case "add_online_copy":
      if (!target_id) return '"target_id" обовʼязковий';
      if (!note || !note.trim()) return '"note" з URL обовʼязковий';
      return null;
    case "connect_to_author":
    case "disconnect_from_author":
      if (!target_id) return '"target_id" (справа) обовʼязковий';
      return null;
    case "add_author":
      if (!target_id) return '"target_id" (справа) обовʼязковий';
      if (!note) return '"note" з назвою автора обовʼязковий';
      return null;
    case "add_location":
    case "remove_location":
      if (!target_id) return '"target_id" (справа) обовʼязковий';
      if (!note) return '"note" з координатами обовʼязковий';
      return null;
    case "remove_author":
    case "change_author_title":
    case "change_author_info":
    case "change_author_tags":
    case "change_author_location":
    case "remove":
    case "report":
      return null;
    case "merge_to":
      if (!target_id) return `"target_id" обовʼязковий для "${type}"`;
      if (!note) return `"note" обовʼязковий для "${type}"`;
      return null;
    default:
      return `Тип дії "${type}" не підтримується`;
  }
};
