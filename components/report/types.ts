import {
  EditorEntity,
  encodeNote,
  ReportCatalogRef,
  ReportLocationValue,
  ReportNotePayload,
  SubmitActionBody,
  YearRange,
} from "@/lib/editor-actions";

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

export type StepId = "tree" | "online-copy" | "data" | "authors" | "location" | "text";

export interface ReportDraft {
  tree?: ReportNotePayload["tree"];
  onlineCopy?: ReportNotePayload["online_copy"];
  data?: ReportNotePayload["data"];
  /** Existing authors (id + title) or proposed new ones (title only). */
  authors?: ReportCatalogRef[];
  locations?: ReportLocationValue[];
  text: string;
}

export const emptyDraft = (): ReportDraft => ({ text: "" });

/**
 * Sections that can apply to the entity: online copies hang off inventories and
 * files (never fonds), authors and locations off files only.
 */
export const stepsForEntity = (entity: EditorEntity): StepId[] => {
  const steps: StepId[] = ["tree"];
  if (entity !== "fond") {
    steps.push("online-copy");
  }
  steps.push("data");
  if (entity === "file") {
    steps.push("authors", "location");
  }
  steps.push("text");
  return steps;
};

export const hasStructuredContent = (draft: ReportDraft): boolean =>
  Boolean(draft.tree || draft.onlineCopy || draft.data || draft.authors?.length || draft.locations?.length);

/**
 * Turns a submitted draft into the bodies to POST. A pure free-text comment
 * (no structured section filled) keeps the legacy plain-string "report" note.
 * A structured draft is instead split into one proper typed action per field
 * that has a matching action type (change_title, add_year_range, add_location,
 * connect_to_author, ...) — so it lands in the normal review queue and an
 * admin can approve it directly instead of re-typing it by hand from a report.
 * Anything without a matching action type (an existing online copy flagged as
 * wrong — there's no "change copy url" action) and any free-text comment
 * alongside structured fields stay a lightweight "report" note.
 */
export const buildReportActionBodies = (
  entity: EditorEntity,
  targetId: string,
  draft: ReportDraft,
): SubmitActionBody[] => {
  if (!hasStructuredContent(draft)) {
    const text = draft.text.trim();
    return text ? [{ type: "report", target_id: targetId, note: text }] : [];
  }

  const bodies: SubmitActionBody[] = [];
  const leftover: ReportNotePayload = {};

  if (draft.tree) {
    const { code, ...parentRefs } = draft.tree;
    if (code) {
      bodies.push({ type: "change_code", target_id: targetId, note: encodeNote({ v: 1, field: "code", value: code }) });
    }
    const hasParentProposal = Boolean(parentRefs.archive || parentRefs.fond || parentRefs.inventory);
    if (hasParentProposal) {
      const parentId =
        entity === "fond" ? parentRefs.archive?.id : entity === "inventory" ? parentRefs.fond?.id : parentRefs.inventory?.id;
      if (parentId) {
        bodies.push({ type: "change_parent", target_id: targetId, note: encodeNote({ v: 1, field: "parent", value: parentId }) });
      } else {
        // Couldn't resolve a real catalog id for the proposed parent — leave it for a human to read.
        leftover.tree = parentRefs;
      }
    }
  }

  if (draft.onlineCopy) {
    if (draft.onlineCopy.url && !draft.onlineCopy.id) {
      // A brand-new copy: add_online_copy stores the URL as a plain-text note, not JSON.
      bodies.push({ type: "add_online_copy", target_id: targetId, note: draft.onlineCopy.url });
    } else {
      // Flagging an existing copy as wrong has no matching action type (no "change url").
      leftover.online_copy = draft.onlineCopy;
    }
  }

  if (draft.data?.title) {
    bodies.push({ type: "change_title", target_id: targetId, note: encodeNote({ v: 1, field: "title", value: draft.data.title.value }) });
  }
  if (draft.data?.info) {
    bodies.push({ type: "change_info", target_id: targetId, note: encodeNote({ v: 1, field: "info", value: draft.data.info.value }) });
  }
  if (draft.data?.years?.remove.length) {
    bodies.push({
      type: "remove_year_range",
      target_id: targetId,
      note: encodeNote({ v: 1, field: "year_range", value: draft.data.years.remove }),
    });
  }
  if (draft.data?.years?.add.length) {
    bodies.push({
      type: "add_year_range",
      target_id: targetId,
      note: encodeNote({ v: 1, field: "year_range", value: draft.data.years.add }),
    });
  }

  if (draft.authors?.length) {
    const existingIds = draft.authors.filter((a) => a.id).map((a) => a.id as string);
    const newTitles = draft.authors.filter((a) => !a.id && a.title).map((a) => a.title as string);
    if (existingIds.length > 0) {
      bodies.push({ type: "connect_to_author", target_id: targetId, note: encodeNote({ v: 1, value: existingIds }) });
    }
    if (newTitles.length > 0) {
      bodies.push({ type: "add_author", target_id: targetId, note: encodeNote({ v: 1, field: "title", value: newTitles }) });
    }
  }
  if (draft.locations?.length) {
    bodies.push({ type: "add_location", target_id: targetId, note: encodeNote({ v: 1, field: "location", value: draft.locations }) });
  }

  if (draft.text.trim()) {
    leftover.text = draft.text.trim();
  }
  if (Object.keys(leftover).length > 0) {
    bodies.push({ type: "report", target_id: targetId, note: encodeNote({ v: 1, report: leftover }) });
  }

  return bodies;
};
