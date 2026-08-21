import useSWRInfinite from "swr/infinite";

import { fetcher } from "@/lib/api";

/** Rows per request, including the initial load. Further pages arrive on scroll. */
export const CATALOG_PAGE_SIZE = 20;

export interface CatalogSearch<T> {
  items: T[];
  /** First page of a new query is in flight. */
  isLoading: boolean;
  /** A follow-up page is in flight (drives the load-more spinner). */
  isLoadingMore: boolean;
  /** The last page came back full, so there is probably another one. */
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Offset-paged, server-filtered fetch for the editor pickers.
 *
 * `endpoint` already carries the parent filter (e.g. `…/fonds?archive=ДАВіО`);
 * pass `null` to stay idle until a parent is chosen. Only one page is fetched
 * up front and the rest arrive as the user scrolls, so a fond with thousands of
 * files never lands in the combobox at once.
 */
export const useCatalogSearch = <T>(endpoint: string | null, query = ""): CatalogSearch<T> => {
  const getKey = (pageIndex: number, previousPage: T[] | null) => {
    if (!endpoint) return null;
    // A short page means we already reached the end — stop asking.
    if (previousPage && previousPage.length < CATALOG_PAGE_SIZE) return null;

    const params = new URLSearchParams({ limit: String(CATALOG_PAGE_SIZE) });
    if (query) params.set("q", query);
    if (pageIndex) params.set("offset", String(pageIndex * CATALOG_PAGE_SIZE));

    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${params}`;
  };

  const { data, size, setSize, isLoading } = useSWRInfinite<T[]>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateFirstPage: false,
    keepPreviousData: true,
  });

  const pages = data ?? [];
  const lastPage = pages[pages.length - 1];
  const hasMore = !!lastPage && lastPage.length === CATALOG_PAGE_SIZE;

  return {
    items: pages.flat(),
    isLoading,
    // SWR leaves a hole at the end of `data` while the next page is loading.
    isLoadingMore: size > 0 && !!data && typeof data[size - 1] === "undefined",
    hasMore,
    // The load-more sentinel fires on every render while it is on screen, so
    // ignore it unless there is a next page and the previous one has landed —
    // otherwise one visible sentinel walks the whole table in a burst.
    loadMore: () => {
      if (!hasMore) return;
      setSize((current) => (current > pages.length ? current : current + 1));
    },
  };
};
