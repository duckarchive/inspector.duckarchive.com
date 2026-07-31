import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";
import { CatalogQuery, catalogPaging, catalogSearchWhere } from "@/app/api/editor/catalog/query";

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

export const getEditorFonds = async (archiveCode: string, options: CatalogQuery = {}): Promise<EditorFond[]> => {
  const rows = await prisma.fond.findMany({
    where: { archive: { code: archiveCode }, ...catalogSearchWhere(options) },
    select: editorFondSelect,
    orderBy: { code: "asc" },
    ...catalogPaging(options),
  });
  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    has_pending_action: _count.actions > 0,
    children_count: _count.inventories,
  }));
};
