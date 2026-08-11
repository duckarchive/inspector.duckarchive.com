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

/**
 * Server-side search over the whole copies table (2.5M rows — the client only ever
 * sees a page). Both branches are index-backed: full urls (`http…`) hit the btree
 * url index via prefix match; anything else searches `parsed` through its trigram
 * index. A plain `url contains` would seq-scan millions of rows per keystroke.
 *
 * The prefix branch requires text_pattern_ops indexes (the plain url btree can't
 * serve LIKE under an ICU collation) — present on inspector_3; for other DBs:
 *   CREATE INDEX IF NOT EXISTS file_online_copies_url_prefix_idx ON file_online_copies (url text_pattern_ops);
 *   CREATE INDEX IF NOT EXISTS inventory_online_copies_url_prefix_idx ON inventory_online_copies (url text_pattern_ops);
 */
const searchFilter = (query?: string) => {
  if (!query) return {};
  if (query.startsWith("http")) return { url: { startsWith: query } };
  return { parsed: { contains: query, mode: "insensitive" as const } };
};

export const getEditorOnlineCopies = async (
  target: OnlineCopyTarget,
  unlinkedOnly: boolean,
  query?: string,
): Promise<EditorOnlineCopy[]> => {
  if (target === "inventory") {
    const rows = await prisma.onlineCopy.findMany({
      where: { ...(unlinkedOnly ? { inventory_id: null } : {}), ...searchFilter(query) },
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

  const rows = await prisma.onlineCopy.findMany({
    where: { ...(unlinkedOnly ? { file_id: null } : {}), ...searchFilter(query) },
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
