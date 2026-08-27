import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

/**
 * Authors are public catalog data — the file endpoint already returns them
 * inline. This select deliberately omits the moderation metadata the editor
 * dashboard adds (`has_pending_action`).
 *
 * `file_authors` is capped at one row on purpose: it is not the link list, it
 * is an anchor file for author edit proposals, which are stored as file_actions
 * and need a file_id for the "one pending action per (type, target)" index.
 */
export const publicAuthorSelect = {
  id: true,
  title: true,
  info: true,
  lat: true,
  lng: true,
  tags: true,
  _count: { select: { file_authors: true } },
  file_authors: { take: 1, select: { file_id: true } },
} satisfies Prisma.AuthorSelect;

export type PublicAuthor = Prisma.AuthorGetPayload<{ select: typeof publicAuthorSelect }>;

export const AUTHORS_SEARCH_LIMIT = 200;

export const getAuthors = async (query?: string): Promise<PublicAuthor[]> =>
  prisma.author.findMany({
    where: query ? { title: { contains: query, mode: "insensitive" } } : {},
    select: publicAuthorSelect,
    orderBy: { title: "asc" },
    take: AUTHORS_SEARCH_LIMIT,
  });
