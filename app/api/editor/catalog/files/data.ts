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

export const getEditorFiles = async (inventoryId: string, query?: string): Promise<EditorFile[]> => {
  const rows = await prisma.file.findMany({
    where: {
      inventory_id: inventoryId,
      ...(query
        ? { OR: [{ code: { contains: query, mode: "insensitive" } }, { title: { contains: query, mode: "insensitive" } }] }
        : {}),
    },
    select: editorFileSelect,
    orderBy: { code: "asc" },
    take: 200,
  });
  return rows.map(({ _count, ...rest }) => ({ ...rest, has_pending_action: _count.actions > 0 }));
};
