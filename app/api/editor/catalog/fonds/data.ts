import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

export const editorFondSelect = {
  id: true,
  code: true,
  title: true,
  info: true,
  archive_id: true,
  archive: { select: { code: true } },
  years: { select: { start_year: true, end_year: true } },
  _count: { select: { actions: { where: { resolved_at: null } }, inventories: true } },
} satisfies Prisma.FondSelect;

type EditorFondRaw = Prisma.FondGetPayload<{ select: typeof editorFondSelect }>;
export type EditorFond = Omit<EditorFondRaw, "_count"> & { has_pending_action: boolean; children_count: number };

export const getEditorFonds = async (archiveCode: string, query?: string): Promise<EditorFond[]> => {
  const rows = await prisma.fond.findMany({
    where: {
      archive: { code: archiveCode },
      ...(query
        ? { OR: [{ code: { contains: query, mode: "insensitive" } }, { title: { contains: query, mode: "insensitive" } }] }
        : {}),
    },
    select: editorFondSelect,
    orderBy: { code: "asc" },
    take: 200,
  });
  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    has_pending_action: _count.actions > 0,
    children_count: _count.inventories,
  }));
};
