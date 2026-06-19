import { Key, ReactNode } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { editorAutocompleteVirtualization, wrapItemClassNames, wrapUrlItemClassNames } from "@/components/editor/autocomplete";
import { sortByCode } from "@/lib/table";

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
  isClearable?: boolean;
  isDisabled?: boolean;
  /** Virtualize long lists with a 2-line clamp (fonds, inventories, files, copies, authors). */
  virtualized?: boolean;
  /** Break long URLs across lines instead of words (online copies). */
  wrapUrls?: boolean;
  /** Controlled input text for server-side search (authors). When set, `items` is used verbatim (no client filtering). */
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

/**
 * Universal autocomplete select for archive entities (archive, fond, inventory,
 * file) and editor pickers (online copies, authors). Callers supply the items
 * plus how to key, search, and render them.
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
  isClearable = false,
  isDisabled,
  virtualized = false,
  wrapUrls = false,
  inputValue,
  onInputChange,
}: SelectProps<T>) {
  // Server-side search drives `items` directly; otherwise let HeroUI filter `defaultItems` by typed text.
  const itemsProp = onInputChange ? { items } : { defaultItems: items };
  const itemClassNames = wrapUrls ? wrapUrlItemClassNames : virtualized ? wrapItemClassNames : undefined;

  return (
    <Autocomplete
      id={id}
      size={size}
      label={label}
      className={className}
      isClearable={isClearable}
      isDisabled={isDisabled}
      selectedKey={value ?? undefined}
      onSelectionChange={onChange}
      inputProps={{ form }}
      inputValue={inputValue}
      onInputChange={onInputChange}
      {...(virtualized || wrapUrls ? editorAutocompleteVirtualization : {})}
      {...itemsProp}
    >
      {(item: T) => (
        <AutocompleteItem key={getKey(item)} textValue={getTextValue(item)} classNames={itemClassNames}>
          {renderItem(item)}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}

export default Select;
