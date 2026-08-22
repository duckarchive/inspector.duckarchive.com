import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

/**
 * Authors are public catalog data — the file endpoint already returns them
 * inline. This select deliberately omits the moderation metadata the editor
 * dashboard adds (`has_pending_action`, link counts).
 */
export const publicAuthorSelect = {
  id: true,
  title: true,
  info: true,
  lat: true,
  lng: true,
  tags: true,
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
