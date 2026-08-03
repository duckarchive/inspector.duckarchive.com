import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";
import { CatalogQuery, catalogPaging, catalogSearchWhere, rankCatalogPage } from "@/app/api/editor/catalog/query";

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

const toEditorFile = ({ _count, ...rest }: EditorFileRaw): EditorFile => ({
  ...rest,
  has_pending_action: _count.actions > 0,
});

export const getEditorFiles = async (inventoryId: string, options: CatalogQuery = {}): Promise<EditorFile[]> => {
  const where = { inventory_id: inventoryId, ...catalogSearchWhere(options) };

  if (options.query) {
    const candidates = await prisma.file.findMany({ where, select: { id: true, code: true, title: true } });
    const page = rankCatalogPage(candidates, options.query, options);
    if (page.length === 0) return [];

    const rows = await prisma.file.findMany({ where: { id: { in: page.map((c) => c.id) } }, select: editorFileSelect });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return page.map((c) => byId.get(c.id)).filter((row): row is EditorFileRaw => !!row).map(toEditorFile);
  }

  const rows = await prisma.file.findMany({
    where,
    select: editorFileSelect,
    orderBy: { code: "asc" },
    ...catalogPaging(options),
  });
  return rows.map(toEditorFile);
};
