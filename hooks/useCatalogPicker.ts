import { useEffect, useState } from "react";

import { useGet } from "@/hooks/useApi";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/** Append query params to an endpoint that may already carry some. */
export const appendParams = (url: string, params: Record<string, string>) =>
  `${url}${url.includes("?") ? "&" : "?"}${new URLSearchParams(params)}`;

export interface CatalogPicker<T> {
  /** Spread onto `<Select>` to drive it in server-search mode. */
  selectProps: {
    items: T[];
    onInputChange: (value: string) => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
  };
  /** The selected row, resolved even when it falls outside the loaded page. */
  selected: T | null;
}

/**
 * Drives one searchable catalog combobox: debounced server-side search, paged
 * results, and the row behind the current selection.
 *
 * `endpoint` carries the parent filter (`…/fonds?archive=ДАДнО`) and is `null`
 * until a parent is picked. `selectedId` stays owned by the caller, which needs
 * it for URL sync and cascade resets.
 *
 * `excludeId` drops one row from the results — merge-target pickers use it so
 * the record being edited can't be offered as its own merge target.
 *
 * Note the input text is left uncontrolled on purpose — React Aria then handles
 * displaying the selected option, closing on select, and reverting on blur. We
 * only listen to it to drive the query; controlling it means every programmatic
 * change after a selection reads as typing and pops the menu back open.
 */
export const useCatalogPicker = <T extends { id: string }>(
  endpoint: string | null,
  selectedId: string,
  excludeId?: string,
): CatalogPicker<T> => {
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim());
  const search = useCatalogSearch<T>(endpoint, query);
  const items = excludeId ? search.items.filter((item) => item.id !== excludeId) : search.items;

  // A selection outside the loaded page (or arriving as a `?fond=…` deep link)
  // still needs a row, both to label the input and to hand to the add modals.
  const loaded = items.find((item) => item.id === selectedId) ?? null;
  const { data: resolved } = useGet<T[]>(
    endpoint && selectedId && !loaded ? appendParams(endpoint, { id: selectedId }) : null,
  );
  const selected = loaded ?? resolved?.[0] ?? null;

  // Start over when the parent swaps the list out underneath us.
  useEffect(() => setText(""), [endpoint]);

  return {
    selectProps: {
      // Keep the selection in the collection so React Aria can render its label
      // even when the current page does not include it.
      items: loaded || !selected ? items : [selected, ...items],
      onInputChange: setText,
      hasMore: search.hasMore,
      isLoadingMore: search.isLoadingMore,
      onLoadMore: search.loadMore,
    },
    selected,
  };
};
