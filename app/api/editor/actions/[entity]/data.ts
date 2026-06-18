import prisma from "@/lib/db";
import { ActionStatus, EditorEntity, SubmitActionBody } from "@/lib/editor-actions";
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
  inventory: { select: { id: true, code: true, fond: { select: { code: true } } } },
  online_copy: { select: { id: true, url: true } },
} satisfies Prisma.InventoryActionsInclude;

export const fileActionInclude = {
  file: { select: { id: true, code: true, full_code: true } },
  online_copy: { select: { id: true, url: true } },
} satisfies Prisma.FileActionsInclude;

export type FondActionRow = Prisma.FondActionsGetPayload<{ include: typeof fondActionInclude }>;
export type InventoryActionRow = Prisma.InventoryActionsGetPayload<{ include: typeof inventoryActionInclude }>;
export type FileActionRow = Prisma.FileActionsGetPayload<{ include: typeof fileActionInclude }>;
export type ActionRow = FondActionRow | InventoryActionRow | FileActionRow;

export const listActions = async (entity: EditorEntity, filters: ListActionsFilters): Promise<ActionRow[]> => {
  const where = baseWhere(filters);
  const orderBy = { created_at: "desc" as const };

  switch (entity) {
    case "fond":
      return prisma.fondActions.findMany({
        where: { ...where, ...(filters.target_id ? { fond_id: filters.target_id } : {}) },
        include: fondActionInclude,
        orderBy,
      });
    case "inventory":
      return prisma.inventoryActions.findMany({
        where: { ...where, ...(filters.target_id ? { inventory_id: filters.target_id } : {}) },
        include: inventoryActionInclude,
        orderBy,
      });
    case "file":
      return prisma.fileActions.findMany({
        where: { ...where, ...(filters.target_id ? { file_id: filters.target_id } : {}) },
        include: fileActionInclude,
        orderBy,
      });
  }
};
