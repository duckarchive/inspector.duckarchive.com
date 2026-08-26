import { ActionType } from "@generated/prisma/client/client";

export type EditorEntity = "fond" | "inventory" | "file";

export const EDITOR_ENTITIES: EditorEntity[] = ["fond", "inventory", "file"];

/** Dashboard queues: the three entities plus the virtual "author" queue —
 * author-related actions live in file_actions but get their own table. */
export type EditorQueue = EditorEntity | "author";

export const isEditorQueue = (value: string): value is EditorQueue =>
  value === "author" || isEditorEntity(value);

/** The entity whose actions table actually stores a queue's rows. */
export const queueEntity = (queue: EditorQueue): EditorEntity =>
  queue === "author" ? "file" : queue;

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
  /** Structured proposal collected by the public report wizard (type "report"). */
  report?: ReportNotePayload;
}

/**
 * What a reporter proposed, section by section. Every section is optional — the
 * wizard is a linear set of yes/no gates, so a submission carries only the ones
 * the user opted into. Nothing here is executed: `report` is a no-op on approve,
 * an admin reads this and applies the real typed actions by hand.
 */
export interface ReportNotePayload {
  /** Proposed new place in the tree. Deepest filled level is the requested parent. */
  tree?: {
    archive?: ReportCatalogRef;
    fond?: ReportCatalogRef;
    inventory?: ReportCatalogRef;
    /** Proposed new code of the record itself (change_code). */
    code?: string;
  };
  /** A wrong/missing online copy: a picked copy of this record, and/or a typed URL. */
  online_copy?: {
    id?: string;
    url?: string;
  };
  data?: {
    title?: ReportFieldChange;
    info?: ReportFieldChange;
    years?: { add: YearRange[]; remove: YearRange[] };
  };
  /** File-only: authors to link and locations to add. */
  geo?: {
    /** Existing author (id + title) or a proposed new one (title only). */
    authors?: ReportCatalogRef[];
    locations?: ReportLocationValue[];
  };
  /** Free-text description, always the last step. */
  text?: string;
}

export interface ReportCatalogRef {
  id?: string;
  code?: string;
  title?: string;
}

export interface ReportFieldChange {
  old: string | null;
  value: string;
}

export interface ReportLocationValue {
  lat: number;
  lng: number;
  radius_m: number;
}

export type ReportSection = "tree" | "online_copy" | "data" | "geo" | "text";

/** Ukrainian section labels for the (uk-only) editor dashboard. */
export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  tree: "Реквізити",
  online_copy: "Онлайн-копія",
  data: "Основні дані",
  geo: "Геолокація",
  text: "Опис проблеми",
};

/** Sections a reporter actually filled in, in wizard order. */
export const reportSections = (report: ReportNotePayload): ReportSection[] =>
  (["tree", "online_copy", "data", "geo", "text"] as ReportSection[]).filter((section) => {
    const value = report[section];
    return typeof value === "string" ? Boolean(value.trim()) : Boolean(value);
  });

/** Server-side cap on the encoded note; the client caps individual inputs. */
export const MAX_REPORT_NOTE_LENGTH = 10_000;

/** `value` payload of an "add" action: the new entity, held in the note until the
 * action is approved (the FK target column stays NULL — the row doesn't exist yet). */
export interface AddActionValue {
  /** archive id for a fond, fond id for an inventory, inventory id for a file */
  parent_id: string;
  code: string;
  title?: string;
  info?: string;
  years?: YearRange[];
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
export const AUTHOR_TYPES: ActionType[] = [
  "connect_to_author",
  "disconnect_from_author",
  "add_author",
  "remove_author",
  "change_author_title",
  "change_author_info",
  "change_author_tags",
  "change_author_location",
];

/** Actions on the author entity itself → the Автори dashboard queue. Linking ops
 * (connect/disconnect/add to a справа) are file operations and stay in Справи. */
export const AUTHOR_DIRECT_TYPES: ActionType[] = [
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
 * Action types a non-admin authenticated user may propose directly, in
 * addition to "report" — every structured section the public report wizard
 * and the public authors page can produce a 1:1 action for. Like "report",
 * these sit pending until an admin approves them, so allowing the create (not
 * the apply) is safe.
 */
export const SELF_SERVICE_TYPES: ActionType[] = [
  "change_title",
  "change_info",
  "change_code",
  "change_parent",
  "add_year_range",
  "remove_year_range",
  "add_location",
  "add_author",
  "connect_to_author",
  "add_online_copy",
  // the public /authors page proposes these; merging and deleting an author
  // stay admin-only
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
    const hasSingle = Boolean(decoded && !("raw" in decoded) && decoded.author_id);
    // connect/disconnect can batch several ids from one save into `value`.
    const hasBatch =
      (type === "connect_to_author" || type === "disconnect_from_author") &&
      Boolean(decoded && !("raw" in decoded) && Array.isArray(decoded.value) && decoded.value.length > 0);
    if (!hasSingle && !hasBatch) {
      return `Дія "${type}" потребує author_id у note`;
    }
  }

  switch (type) {
    case "add": {
      if (target_id) return '"target_id" не використовується для "add" — новий запис ще не існує';
      const decoded = decodeNote(note);
      if (!decoded || "raw" in decoded) return '"note" з даними нового запису обовʼязковий';
      const value = decoded.value as Partial<AddActionValue> | undefined;
      if (!value?.parent_id) return 'Дія "add" потребує parent_id у note';
      if (!value.code?.trim()) return 'Дія "add" потребує code у note';
      return null;
    }
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
      return null;
    case "report": {
      // Plain-text reports (the legacy shape) stay valid with no target.
      if (note && note.length > MAX_REPORT_NOTE_LENGTH) {
        return `"note" задовгий — максимум ${MAX_REPORT_NOTE_LENGTH} символів`;
      }
      const decoded = decodeNote(note);
      const report = decoded && !("raw" in decoded) ? decoded.report : undefined;
      if (report) {
        if (!target_id) return '"target_id" обовʼязковий для структурованої скарги';
        if (reportSections(report).length === 0) return "Скарга порожня";
      }
      return null;
    }
    case "merge_to": {
      if (!note) return `"note" обовʼязковий для "${type}"`;
      // author merge: one action, no file target — {author_id: source, value: target author}
      const decoded = decodeNote(note);
      const isAuthorMerge = decoded && !("raw" in decoded) && decoded.author_id && decoded.value;
      if (!isAuthorMerge && !target_id) return `"target_id" обовʼязковий для "${type}"`;
      return null;
    }
    default:
      return `Тип дії "${type}" не підтримується`;
  }
};
