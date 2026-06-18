import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";
import { decodeNote } from "@/lib/editor-actions";

export const editorAuthorSelect = {
  id: true,
  title: true,
  info: true,
  lat: true,
  lng: true,
  tags: true,
  _count: { select: { file_authors: true } },
} satisfies Prisma.AuthorSelect;

type EditorAuthorRaw = Prisma.AuthorGetPayload<{ select: typeof editorAuthorSelect }>;
export type EditorAuthor = EditorAuthorRaw & { has_pending_action: boolean };

/**
 * Author ids referenced by any unresolved file_action. Author edits live in
 * file_actions with the author id encoded in the note, so there is no relation
 * to count — we decode pending notes instead.
 */
const getPendingAuthorIds = async (): Promise<Set<string>> => {
  const pending = await prisma.fileActions.findMany({
    where: { resolved_at: null, note: { not: null } },
    select: { note: true },
  });
  const ids = new Set<string>();
  for (const { note } of pending) {
    const decoded = decodeNote(note);
    if (decoded && "author_id" in decoded && decoded.author_id) {
      ids.add(decoded.author_id);
    }
  }
  return ids;
};

export const getEditorAuthors = async (query?: string): Promise<EditorAuthor[]> => {
  const [authors, pendingAuthorIds] = await Promise.all([
    prisma.author.findMany({
      where: query ? { title: { contains: query, mode: "insensitive" } } : {},
      select: editorAuthorSelect,
      orderBy: { title: "asc" },
      take: 200,
    }),
    getPendingAuthorIds(),
  ]);
  return authors.map((a) => ({ ...a, has_pending_action: pendingAuthorIds.has(a.id) }));
};

/** File ids linked to an author — used to anchor merge actions per file. */
export const getAuthorFileIds = async (authorId: string): Promise<string[]> => {
  const links = await prisma.fileAuthor.findMany({
    where: { author_id: authorId },
    select: { file_id: true },
  });
  return links.map((l) => l.file_id);
};
