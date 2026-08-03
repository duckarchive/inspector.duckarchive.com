import { NextRequest } from "next/server";

/**
 * Shared search/paging options for the catalog endpoints.
 *
 * The catalog grid pages fetch a whole archive/fond/inventory at once and page
 * client-side, so `limit` is opt-in — omitting it keeps the full result set.
 * The editor pickers pass `q` + `limit`/`offset` so a fond with thousands of
 * files never has to be shipped to (or rendered by) the combobox.
 */
export interface CatalogQuery {
  query?: string;
  limit?: number;
  offset?: number;
  /**
   * Resolve a single row by id, ignoring search and paging. Pickers need this to
   * label a selection (or a `?fond=…` deep link) that falls outside the page
   * they happen to have loaded.
   */
  id?: string;
}

/** Upper bound on a single page, so a hand-written `limit` can't pull everything. */
const MAX_LIMIT = 200;

export const parseCatalogQuery = (req: NextRequest): CatalogQuery => {
  const params = req.nextUrl.searchParams;
  const query = params.get("q")?.trim();
  const limit = Number(params.get("limit"));
  const offset = Number(params.get("offset"));

  return {
    query: query || undefined,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : undefined,
    offset: Number.isInteger(offset) && offset > 0 ? offset : undefined,
    id: params.get("id") || undefined,
  };
};

/** Lookup by id when asked, otherwise a case-insensitive substring match over `code` and `title`. */
export const catalogSearchWhere = ({ query, id }: CatalogQuery) => {
  if (id) return { id };
  if (!query) return {};

  return {
    OR: [
      { code: { contains: query, mode: "insensitive" as const } },
      { title: { contains: query, mode: "insensitive" as const } },
    ],
  };
};

/** `take`/`skip` only when the caller asked to page. */
export const catalogPaging = ({ limit, offset }: CatalogQuery) => ({
  ...(limit ? { take: limit } : {}),
  ...(offset ? { skip: offset } : {}),
});

/**
 * Upper bound on how many lightweight `{id, code, title}` rows `rankCatalogPage`
 * pulls before ranking. Keeps a short, common query (e.g. "1") from forcing a
 * full-table-sized fetch on a huge inventory; beyond this, matches simply fall
 * back to the plain `code` order the un-ranked path already uses.
 */
const MAX_RANK_CANDIDATES = 1000;

/**
 * Where a plain `code asc` order puts "1" before "10" but "100" comes right
 * after "10" (both are lexicographic neighbors of "1"), a search for "1"
 * should surface the exact code first, then codes starting with "1", before
 * codes that merely contain it elsewhere (or only match by title).
 */
const matchRank = (item: { code: string; title?: string | null }, query: string): number => {
  const q = query.toLowerCase();
  const code = item.code.toLowerCase();

  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (code.includes(q)) return 2;
  if (item.title?.toLowerCase().startsWith(q)) return 3;
  return 4;
};

const sortByRelevance = <T extends { code: string; title?: string | null }>(rows: T[], query: string): T[] =>
  [...rows].sort(
    (a, b) => matchRank(a, query) - matchRank(b, query) || a.code.localeCompare(b.code, undefined, { numeric: true }),
  );

/**
 * Ranks and pages search matches by closeness to `query` instead of plain
 * `code` order. Since Postgres can't rank a `contains` match without a raw
 * query, this fetches every lightweight candidate row up front (bounded by
 * `MAX_RANK_CANDIDATES`), ranks them in memory, then hands back just the ids
 * for the requested page — callers re-fetch those ids with their full select.
 */
export const rankCatalogPage = <T extends { id: string; code: string; title?: string | null }>(
  candidates: T[],
  query: string,
  { limit, offset = 0 }: CatalogQuery,
): T[] => {
  const ranked = sortByRelevance(candidates.slice(0, MAX_RANK_CANDIDATES), query);
  return limit ? ranked.slice(offset, offset + limit) : ranked.slice(offset);
};
