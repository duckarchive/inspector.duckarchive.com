import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";
import { CatalogQuery, catalogPaging, catalogSearchWhere, rankCatalogPage } from "@/app/api/editor/catalog/query";

export const editorInventorySelect = {
  id: true,
  code: true,
  title: true,
  info: true,
  fond_id: true,
  fond: { select: { code: true } },
  years: { select: { start_year: true, end_year: true } },
  online_copies: { select: { id: true, url: true, availability: true, resource_id: true } },
  _count: { select: { actions: { where: { resolved_at: null } }, files: true } },
} satisfies Prisma.InventorySelect;

type EditorInventoryRaw = Prisma.InventoryGetPayload<{ select: typeof editorInventorySelect }>;
export type EditorInventory = Omit<EditorInventoryRaw, "_count"> & {
  has_pending_action: boolean;
  children_count: number;
};

const toEditorInventory = ({ _count, ...rest }: EditorInventoryRaw): EditorInventory => ({
  ...rest,
  has_pending_action: _count.actions > 0,
  children_count: _count.files,
});

export const getEditorInventories = async (
  fondId: string,
  options: CatalogQuery = {},
): Promise<EditorInventory[]> => {
  const where = { fond_id: fondId, ...catalogSearchWhere(options) };

  if (options.query) {
    const candidates = await prisma.inventory.findMany({ where, select: { id: true, code: true, title: true } });
    const page = rankCatalogPage(candidates, options.query, options);
    if (page.length === 0) return [];

    const rows = await prisma.inventory.findMany({
      where: { id: { in: page.map((c) => c.id) } },
      select: editorInventorySelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return page.map((c) => byId.get(c.id)).filter((row): row is EditorInventoryRaw => !!row).map(toEditorInventory);
  }

  const rows = await prisma.inventory.findMany({
    where,
    select: editorInventorySelect,
    orderBy: { code: "asc" },
    ...catalogPaging(options),
  });
  return rows.map(toEditorInventory);
};
