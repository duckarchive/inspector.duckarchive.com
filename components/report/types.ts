import { EditorEntity, ReportNotePayload, YearRange } from "@/lib/editor-actions";

export interface ReportOnlineCopy {
  id: string;
  url: string;
}

export interface ReportAuthor {
  id: string;
  title: string;
}

/**
 * Everything the wizard needs about the record being reported. The catalog page
 * already has it loaded, so the wizard never refetches the record itself.
 */
export interface ReportCurrentValues {
  title: string | null;
  info: string | null;
  years: YearRange[];
  /** Codes of the record and its ancestors, deepest last. */
  codes: {
    archive: string;
    fond?: string;
    inventory?: string;
    file?: string;
  };
  /** Inventories and files only. */
  onlineCopies?: ReportOnlineCopy[];
  /** Files only. */
  authors?: ReportAuthor[];
}

export type StepId = "tree" | "online-copy" | "data" | "geo" | "text";

export interface ReportDraft {
  tree?: ReportNotePayload["tree"];
  onlineCopy?: ReportNotePayload["online_copy"];
  data?: ReportNotePayload["data"];
  geo?: ReportNotePayload["geo"];
  text: string;
}

export const emptyDraft = (): ReportDraft => ({ text: "" });

/**
 * Steps that can apply to the entity: online copies hang off inventories and
 * files (never fonds), authors and locations off files only.
 */
export const stepsForEntity = (entity: EditorEntity): StepId[] => {
  const steps: StepId[] = ["tree"];
  if (entity !== "fond") {
    steps.push("online-copy");
  }
  steps.push("data");
  if (entity === "file") {
    steps.push("geo");
  }
  steps.push("text");
  return steps;
};

/** The wizard's payload, minus the sections the reporter skipped. */
export const draftToPayload = (draft: ReportDraft): ReportNotePayload => {
  const payload: ReportNotePayload = {};
  if (draft.tree) payload.tree = draft.tree;
  if (draft.onlineCopy) payload.online_copy = draft.onlineCopy;
  if (draft.data) payload.data = draft.data;
  if (draft.geo) payload.geo = draft.geo;
  if (draft.text.trim()) payload.text = draft.text.trim();
  return payload;
};

export const hasStructuredContent = (draft: ReportDraft): boolean =>
  Boolean(draft.tree || draft.onlineCopy || draft.data || draft.geo);
