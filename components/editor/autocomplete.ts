/**
 * Shared HeroUI Autocomplete config for editor selects.
 *
 * HeroUI auto-enables listbox virtualization past 50 items (fixed row height),
 * which is fast but clips/overlaps multi-line content. Non-virtualized fits
 * content but lags on long lists. We keep virtualization and instead pin a row
 * height + clamp each option to 2 lines so rows always fit — fast AND no overlap.
 */
export const editorAutocompleteVirtualization = { itemHeight: 56, maxListboxHeight: 320 } as const;

/** Clamp option content to 2 wrapped lines within the fixed row height. */
export const wrapItemClassNames = {
  base: "overflow-hidden",
  title: "whitespace-normal break-words line-clamp-2",
};

/** Variant for URL-heavy options (break anywhere). */
export const wrapUrlItemClassNames = {
  base: "overflow-hidden",
  title: "whitespace-normal break-all line-clamp-2",
};
