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

const pendingActionsCount = {
  select: {
    inventory_actions: { where: { resolved_at: null } },
    file_actions: { where: { resolved_at: null } },
  },
} as const;

/**
 * Server-side search over the whole copies table (2.5M rows — the client only ever
 * sees a page). Both branches are index-backed: full urls (`http…`) hit the btree
 * url index via prefix match; anything else searches `parsed` through its trigram
 * index. A plain `url contains` would seq-scan millions of rows per keystroke.
 *
 * The prefix branch requires the text_pattern_ops index
 * `online_copies_url_prefix_idx` (the plain url btree can't serve LIKE under an
 * ICU collation) — owned by the @duckarchive/prisma migrations.
 */
const searchFilter = (query?: string) => {
  if (!query) return {};
  if (query.startsWith("http")) return { url: { startsWith: query } };
  return { parsed: { contains: query, mode: "insensitive" as const } };
};

export const getEditorOnlineCopies = async (
  unlinkedOnly: boolean,
  query?: string,
): Promise<EditorOnlineCopy[]> => {
  const rows = await prisma.onlineCopy.findMany({
    where: {
      ...(unlinkedOnly ? { inventory_id: null, file_id: null } : {}),
      ...searchFilter(query),
    },
    select: {
      id: true,
      url: true,
      parsed: true,
      availability: true,
      resource_id: true,
      inventory_id: true,
      file_id: true,
      _count: pendingActionsCount,
    },
    orderBy: { updated_at: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    parsed: r.parsed,
    availability: r.availability,
    resource_id: r.resource_id,
    linked_id: r.inventory_id ?? r.file_id,
    has_pending_action: r._count.inventory_actions + r._count.file_actions > 0,
  }));
};
