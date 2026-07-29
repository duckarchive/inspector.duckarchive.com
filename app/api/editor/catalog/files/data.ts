import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

export const editorFileSelect = {
  id: true,
  code: true,
  full_code: true,
  title: true,
  info: true,
  tags: true,
  inventory_id: true,
  years: { select: { start_year: true, end_year: true } },
  locations: { select: { id: true, lat: true, lng: true, radius_m: true } },
  authors: { select: { author: { select: { id: true, title: true } } } },
  online_copies: { select: { id: true, url: true, availability: true, resource_id: true } },
  _count: { select: { actions: { where: { resolved_at: null } } } },
} satisfies Prisma.FileSelect;

type EditorFileRaw = Prisma.FileGetPayload<{ select: typeof editorFileSelect }>;
export type EditorFile = Omit<EditorFileRaw, "_count"> & { has_pending_action: boolean };

export const getEditorFiles = async (inventoryId: string): Promise<EditorFile[]> => {
  const rows = await prisma.file.findMany({
    where: { inventory_id: inventoryId },
    select: editorFileSelect,
    orderBy: { code: "asc" },
  });
  return rows.map(({ _count, ...rest }) => ({ ...rest, has_pending_action: _count.actions > 0 }));
};
