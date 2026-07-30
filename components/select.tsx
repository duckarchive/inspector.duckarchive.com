import { Key, ReactNode } from "react";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";
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
  /** Clamp long options to 2 lines and cap the popover height (fonds, inventories, files, copies, authors). */
  virtualized?: boolean;
  /** Break long URLs across lines instead of words (online copies). */
  wrapUrls?: boolean;
  /** Controlled input text for server-side search (authors). When set, `items` is used verbatim (no client filtering). */
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

const SIZE_CLASS = { sm: "text-sm", md: "text-base", lg: "text-lg" } as const;

/**
 * Universal combobox select for archive entities (archive, fond, inventory,
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
  isDisabled,
  virtualized = false,
  wrapUrls = false,
  inputValue,
  onInputChange,
}: SelectProps<T>) {
  // Server-side search drives `items` directly; otherwise let HeroUI filter `defaultItems` by typed text.
  const itemsProp = onInputChange ? { items } : { defaultItems: items };
  const itemClassName = wrapUrls ? wrapUrlItemClassName : virtualized ? wrapItemClassName : undefined;

  return (
    <ComboBox<T>
      id={id}
      className={className}
      isDisabled={isDisabled}
      selectedKey={value ?? undefined}
      onSelectionChange={onChange}
      inputValue={inputValue}
      onInputChange={onInputChange}
      {...itemsProp}
    >
      <Label>{label}</Label>
      <ComboBox.InputGroup>
        <Input form={form} className={SIZE_CLASS[size]} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover className={virtualized || wrapUrls ? editorPopoverClassName : undefined}>
        <ListBox<T>>
          {(item: T) => (
            <ListBox.Item id={getKey(item)} textValue={getTextValue(item)} className={itemClassName}>
              {renderItem(item)}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

export default Select;
