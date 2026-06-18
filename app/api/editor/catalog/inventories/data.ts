import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

export const editorInventorySelect = {
  id: true,
  code: true,
  title: true,
  info: true,
  fond_id: true,
  fond: { select: { code: true } },
  years: { select: { start_year: true, end_year: true } },
  online_copies: { select: { id: true, url: true, availability: true, resource_id: true } },
  _count: { select: { actions: { where: { resolved_at: null } } } },
} satisfies Prisma.InventorySelect;

type EditorInventoryRaw = Prisma.InventoryGetPayload<{ select: typeof editorInventorySelect }>;
export type EditorInventory = Omit<EditorInventoryRaw, "_count"> & { has_pending_action: boolean };

export const getEditorInventories = async (fondId: string): Promise<EditorInventory[]> => {
  const rows = await prisma.inventory.findMany({
    where: { fond_id: fondId },
    select: editorInventorySelect,
    orderBy: { code: "asc" },
  });
  return rows.map(({ _count, ...rest }) => ({ ...rest, has_pending_action: _count.actions > 0 }));
};
