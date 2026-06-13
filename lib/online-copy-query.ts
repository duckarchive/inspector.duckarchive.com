import { Archives } from "@/data/archives";

// Combine an optionally selected archive code with the user's free-text query
// into a single online-copy search string. Done entirely on the client: the
// archive code is joined to the query with a "_" (the single-char wildcard, so
// it matches the one separator char between the archive code and the rest of
// the stored `parsed` value).
export const buildOnlineCopyQuery = (archive: string | undefined, query: string): string =>
  archive ? `${archive}_${query}` : query;

// Inverse of buildOnlineCopyQuery: pull a known archive code back out of an
// incoming query string so the archive selector can be pre-filled. Matches the
// longest archive code that the query starts with (optionally followed by the
// "_" separator) and returns the remaining query text.
export const parseOnlineCopyQuery = (
  query: string,
  archives: Archives,
): { archive?: string; query: string } => {
  const match = archives
    .filter((a) => query === a.code || query.startsWith(`${a.code}_`))
    .sort((a, b) => b.code.length - a.code.length)[0];

  if (!match) {
    return { query };
  }

  return { archive: match.code, query: query.slice(match.code.length + 1) };
};
