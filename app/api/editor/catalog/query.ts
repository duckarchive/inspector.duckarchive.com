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
