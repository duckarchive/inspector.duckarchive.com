import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";
import { CatalogQuery, catalogPaging, catalogSearchWhere, rankCatalogPage } from "@/app/api/editor/catalog/query";

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

const toEditorFond = ({ _count, ...rest }: EditorFondRaw): EditorFond => ({
  ...rest,
  has_pending_action: _count.actions > 0,
  children_count: _count.inventories,
});

export const getEditorFonds = async (archiveCode: string, options: CatalogQuery = {}): Promise<EditorFond[]> => {
  const where = { archive: { code: archiveCode }, ...catalogSearchWhere(options) };

  if (options.query) {
    const candidates = await prisma.fond.findMany({ where, select: { id: true, code: true, title: true } });
    const page = rankCatalogPage(candidates, options.query, options);
    if (page.length === 0) return [];

    const rows = await prisma.fond.findMany({ where: { id: { in: page.map((c) => c.id) } }, select: editorFondSelect });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return page.map((c) => byId.get(c.id)).filter((row): row is EditorFondRaw => !!row).map(toEditorFond);
  }

  const rows = await prisma.fond.findMany({
    where,
    select: editorFondSelect,
    orderBy: { code: "asc" },
    ...catalogPaging(options),
  });
  return rows.map(toEditorFond);
};
