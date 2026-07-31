import { Key, ReactNode } from "react";
import { Collection, ComboBox, Input, Label, ListBox, ListBoxLoadMoreItem, Spinner } from "@heroui/react";
import { editorPopoverClassName, wrapItemClassName, wrapUrlItemClassName } from "@/components/editor/autocomplete";

export interface SelectProps<T extends object> {
  /** Options to render. */
  items: T[];
  /** Floating label. */
  label: string;
  /** Stable key extracted from each item (selection value). */
  getKey: (item: T) => string;
  /** Text used for built-in filtering and the input display. */
  getTextValue: (item: T) => string;
  /** Option content. */
  renderItem: (item: T) => ReactNode;
  /** Currently selected key. Omit for "fire-and-forget" selects that accumulate elsewhere (authors, copies). */
  value?: string | null;
  onChange: (key: Key | null) => void;
  id?: string;
  form?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  isDisabled?: boolean;
  /** Clamp long options to 2 lines and pin the popover to the input width (fonds, inventories, files, copies, authors). */
  virtualized?: boolean;
  /** Break long URLs across lines instead of words (online copies). */
  wrapUrls?: boolean;
  /** Controlled input text for server-side search (authors). When set, `items` is used verbatim (no client filtering). */
  inputValue?: string;
  onInputChange?: (value: string) => void;
  /** Another page is available — renders the load-more sentinel that fetches it on scroll. */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const SIZE_CLASS = { sm: "text-sm", md: "text-base", lg: "text-lg" } as const;

/**
 * Universal combobox select for archive entities (archive, fond, inventory,
 * file) and editor pickers (online copies, authors). Callers supply the items
 * plus how to key, search, and render them.
 *
 * Two modes: pass `onInputChange` for server-side search (items are shown
 * verbatim, optionally paged via `onLoadMore`), or omit it to let HeroUI filter
 * a complete list client-side.
 */
function Select<T extends object>({
  items,
  label,
  getKey,
  getTextValue,
  renderItem,
  value,
  onChange,
  id,
  form,
  className,
  size = "sm",
  isDisabled,
  virtualized = false,
  wrapUrls = false,
  inputValue,
  onInputChange,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: SelectProps<T>) {
  const isServerSearch = Boolean(onInputChange);
  const itemClassName = wrapUrls ? wrapUrlItemClassName : virtualized ? wrapItemClassName : undefined;

  /**
   * Picking an option makes React Aria write that option's whole label into the
   * input, which arrives here as if it were typed. Forwarding it would spend a
   * request on a sentence-long `q` and leave the list filtered to the row the
   * user just chose, so an exact match against a listed option is not a search.
   */
  const handleInputChange = (value: string) => {
    if (items.some((item) => getTextValue(item) === value)) return;
    onInputChange?.(value);
  };

  const renderOption = (item: T) => (
    <ListBox.Item id={getKey(item)} textValue={getTextValue(item)} className={itemClassName}>
      {renderItem(item)}
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );

  return (
    <ComboBox<T>
      id={id}
      className={className}
      isDisabled={isDisabled}
      selectedKey={value ?? undefined}
      onSelectionChange={onChange}
      inputValue={inputValue}
      onInputChange={onInputChange && handleInputChange}
      // Server-side search drives the list directly; otherwise HeroUI filters the full list by typed text.
      // React Aria still filters the rendered options by the input, so between a keystroke and its
      // (debounced) results the collection can be empty — `allowsEmptyCollection` stops the popover
      // snapping shut mid-search.
      {...(isServerSearch ? { allowsEmptyCollection: true } : { defaultItems: items })}
    >
      <Label>{label}</Label>
      <ComboBox.InputGroup>
        <Input form={form} className={SIZE_CLASS[size]} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover className={virtualized || wrapUrls ? editorPopoverClassName : undefined}>
        <ListBox<T>>
          {isServerSearch ? (
            <>
              <Collection items={items}>{renderOption}</Collection>
              {onLoadMore && hasMore && items.length > 0 && (
                <ListBoxLoadMoreItem isLoading={isLoadingMore} onLoadMore={onLoadMore}>
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Spinner size="sm" />
                  </div>
                </ListBoxLoadMoreItem>
              )}
            </>
          ) : (
            renderOption
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

export default Select;
