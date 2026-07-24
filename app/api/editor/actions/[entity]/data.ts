import prisma from "@/lib/db";
import { ActionStatus, AUTHOR_TYPES, decodeNote, EditorEntity, EditorQueue, SubmitActionBody } from "@/lib/editor-actions";
import { ActionType, Prisma } from "@generated/prisma/client/client";

export interface ListActionsFilters {
  status?: ActionStatus;
  type?: string;
  target_id?: string;
}

/** Scalar where-fields shared structurally by all three *ActionsWhereInput. */
const baseWhere = (filters: ListActionsFilters) => {
  const where: {
    resolved_at?: { not: null } | null;
    is_rejected?: boolean;
    NOT?: { is_rejected: true };
    type?: ActionType;
  } = {};
  if (filters.status === "pending") {
    where.resolved_at = null;
  } else if (filters.status === "executed") {
    where.resolved_at = { not: null };
    where.NOT = { is_rejected: true };
  } else if (filters.status === "rejected") {
    where.resolved_at = { not: null };
    where.is_rejected = true;
  }
  if (filters.type) {
    where.type = filters.type as ActionType;
  }
  return where;
};

export const targetExists = async (entity: EditorEntity, id: string): Promise<boolean> => {
  switch (entity) {
    case "fond":
      return Boolean(await prisma.fond.findUnique({ where: { id }, select: { id: true } }));
    case "inventory":
      return Boolean(await prisma.inventory.findUnique({ where: { id }, select: { id: true } }));
    case "file":
      return Boolean(await prisma.file.findUnique({ where: { id }, select: { id: true } }));
  }
};

export const createAction = async (entity: EditorEntity, body: SubmitActionBody, createdBy: string) => {
  const base = {
    created_by: createdBy,
    type: body.type,
    note: body.note ?? null,
  };

  switch (entity) {
    case "fond":
      return prisma.fondActions.create({
        data: { ...base, fond_id: body.target_id ?? null },
      });
    case "inventory":
      return prisma.inventoryActions.create({
        data: {
          ...base,
          inventory_id: body.target_id ?? null,
          online_copy_id: body.online_copy_id ?? null,
        },
      });
    case "file":
      return prisma.fileActions.create({
        data: {
          ...base,
          file_id: body.target_id ?? null,
          online_copy_id: body.online_copy_id ?? null,
        },
      });
  }
};

export const fondActionInclude = {
  fond: { select: { id: true, code: true, archive: { select: { code: true } } } },
} satisfies Prisma.FondActionsInclude;

export const inventoryActionInclude = {
  inventory: {
    select: {
      id: true,
      code: true,
      fond: { select: { id: true, code: true, archive: { select: { code: true } } } },
    },
  },
  online_copy: { select: { id: true, url: true } },
} satisfies Prisma.InventoryActionsInclude;

export const fileActionInclude = {
  file: {
    select: {
      id: true,
      code: true,
      full_code: true,
      inventory: {
        select: {
          id: true,
          code: true,
          fond: { select: { id: true, code: true, archive: { select: { code: true } } } },
        },
      },
    },
  },
  online_copy: { select: { id: true, url: true } },
} satisfies Prisma.FileActionsInclude;

export type FondActionRow = Prisma.FondActionsGetPayload<{ include: typeof fondActionInclude }>;
export type InventoryActionRow = Prisma.InventoryActionsGetPayload<{ include: typeof inventoryActionInclude }>;
export type FileActionRow = Prisma.FileActionsGetPayload<{ include: typeof fileActionInclude }>;
/** Author-queue rows are file actions with the referenced author (and, for merges,
 * the target author) resolved from the note. */
export type AuthorActionRow = FileActionRow & {
  author: { id: string; title: string } | null;
  merge_target: { id: string; title: string } | null;
};
export type ActionRow = FondActionRow | InventoryActionRow | FileActionRow | AuthorActionRow;

/** Author merges are merge_to file_actions distinguished by the author_id payload. */
const authorMergeFilter = { type: "merge_to" as ActionType, note: { contains: '"author_id"' } };

const listAuthorActions = async (where: ReturnType<typeof baseWhere>, targetId?: string): Promise<AuthorActionRow[]> => {
  const { type: _statusType, ...statusWhere } = where;
  void _statusType;
  const rows = await prisma.fileActions.findMany({
    where: {
      ...statusWhere,
      OR: [{ type: { in: AUTHOR_TYPES } }, authorMergeFilter],
      ...(targetId ? { file_id: targetId } : {}),
    },
    include: fileActionInclude,
    orderBy: [{ created_at: "desc" }, { file: { inventory: { fond: { archive: { code: "asc" } } } } }, { id: "desc" }],
  });
  const authorIds = new Set<string>();
  for (const row of rows) {
    const decoded = decodeNote(row.note);
    if (decoded && !("raw" in decoded)) {
      if (decoded.author_id) authorIds.add(decoded.author_id);
      if (row.type === "merge_to" && typeof decoded.value === "string") authorIds.add(decoded.value);
    }
  }
  const authors = authorIds.size
    ? await prisma.author.findMany({ where: { id: { in: Array.from(authorIds) } }, select: { id: true, title: true } })
    : [];
  const byId = new Map(authors.map((a) => [a.id, a]));
  return rows.map((row) => {
    const decoded = decodeNote(row.note);
    const authorId = decoded && !("raw" in decoded) ? decoded.author_id : undefined;
    const targetAuthorId =
      row.type === "merge_to" && decoded && !("raw" in decoded) && typeof decoded.value === "string"
        ? decoded.value
        : undefined;
    return {
      ...row,
      author: (authorId && byId.get(authorId)) || null,
      merge_target: (targetAuthorId && byId.get(targetAuthorId)) || null,
    };
  });
};

export const listActions = async (entity: EditorQueue, filters: ListActionsFilters): Promise<ActionRow[]> => {
  const where = baseWhere(filters);
  // newest first; same-timestamp rows (bulk-loaded batches) group by archive, with
  // id as the final tiebreaker so the order is stable between fetches
  const newestFirst = { created_at: "desc" as const };
  const stableId = { id: "desc" as const };

  switch (entity) {
    case "fond":
      return prisma.fondActions.findMany({
        where: { ...where, ...(filters.target_id ? { fond_id: filters.target_id } : {}) },
        include: fondActionInclude,
        orderBy: [newestFirst, { fond: { archive: { code: "asc" } } }, stableId],
      });
    case "inventory":
      return prisma.inventoryActions.findMany({
        where: { ...where, ...(filters.target_id ? { inventory_id: filters.target_id } : {}) },
        include: inventoryActionInclude,
        orderBy: [newestFirst, { inventory: { fond: { archive: { code: "asc" } } } }, stableId],
      });
    case "author":
      return listAuthorActions(where, filters.target_id);
    case "file":
      // author-related actions (incl. author merges) have their own queue
      return prisma.fileActions.findMany({
        where: {
          ...where,
          type: { notIn: AUTHOR_TYPES },
          NOT: authorMergeFilter,
          ...(filters.target_id ? { file_id: filters.target_id } : {}),
        },
        include: fileActionInclude,
        orderBy: [newestFirst, { file: { inventory: { fond: { archive: { code: "asc" } } } } }, stableId],
      });
  }
};
