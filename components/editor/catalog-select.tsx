"use client";

import { Key } from "react";

import Select from "@/components/select";
import { CatalogPicker } from "@/hooks/useCatalogPicker";

/** Any archive entity the pickers show: fond, inventory, or file. */
export interface CatalogEntity {
  id: string;
  code: string;
  title?: string | null;
}

interface CatalogSelectProps<T extends CatalogEntity> {
  /** From `useCatalogPicker` — supplies the paged items and the search handler. */
  picker: CatalogPicker<T>;
  label: string;
  /** Selected id, or "" for none. */
  value: string;
  onChange: (id: string) => void;
  isDisabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Matches how archivists read a reference: code first, then title. */
export const catalogTextValue = (item: CatalogEntity) => `${item.code} ${item.title ?? ""}`.trim();

/**
 * The searchable fond/inventory/file combobox.
 *
 * Every catalog picker renders the same code-over-title option and pages the
 * same way, so they share this instead of repeating the render props. Pair it
 * with `useCatalogPicker`, which the caller holds so it can also read
 * `picker.selected` (the add modals and deep links need the whole row).
 */
function CatalogSelect<T extends CatalogEntity>({
  picker,
  label,
  value,
  onChange,
  isDisabled,
  size = "sm",
  className,
}: CatalogSelectProps<T>) {
  return (
    <Select<T>
      label={label}
      virtualized
      size={size}
      className={className}
      isDisabled={isDisabled}
      value={value}
      onChange={(key: Key | null) => onChange(String(key ?? ""))}
      getKey={(item) => item.id}
      getTextValue={catalogTextValue}
      renderItem={(item) => (
        <div>
          <p>{item.code}</p>
          <p className="opacity-70 text-sm text-wrap">{item.title}</p>
        </div>
      )}
      {...picker.selectProps}
    />
  );
}

export default CatalogSelect;
