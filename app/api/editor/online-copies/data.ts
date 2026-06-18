import prisma from "@/lib/db";
import { Availability } from "@generated/prisma/client/client";

export type OnlineCopyTarget = "inventory" | "file";

export interface EditorOnlineCopy {
  id: string;
  url: string;
  parsed: string;
  availability: Availability | null;
  resource_id: string;
  /** Currently linked inventory/file id, or null if unlinked. */
  linked_id: string | null;
  has_pending_action: boolean;
}

const pendingActionsCount = { select: { actions: { where: { resolved_at: null } } } } as const;

export const getEditorOnlineCopies = async (
  target: OnlineCopyTarget,
  unlinkedOnly: boolean,
): Promise<EditorOnlineCopy[]> => {
  if (target === "inventory") {
    const rows = await prisma.inventoryOnlineCopy.findMany({
      where: unlinkedOnly ? { inventory_id: null } : {},
      select: { id: true, url: true, parsed: true, availability: true, resource_id: true, inventory_id: true, _count: pendingActionsCount },
      orderBy: { updated_at: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      parsed: r.parsed,
      availability: r.availability,
      resource_id: r.resource_id,
      linked_id: r.inventory_id,
      has_pending_action: r._count.actions > 0,
    }));
  }

  const rows = await prisma.fileOnlineCopy.findMany({
    where: unlinkedOnly ? { file_id: null } : {},
    select: { id: true, url: true, parsed: true, availability: true, resource_id: true, file_id: true, _count: pendingActionsCount },
    orderBy: { updated_at: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    parsed: r.parsed,
    availability: r.availability,
    resource_id: r.resource_id,
    linked_id: r.file_id,
    has_pending_action: r._count.actions > 0,
  }));
};
