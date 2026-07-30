/**
 * Shared HeroUI ComboBox config for editor selects.
 *
 * HeroUI v3 dropped v2's listbox virtualization props (`isVirtualized`,
 * `itemHeight`, `maxListboxHeight`), so long lists now render in full. We cap
 * the popover height and clamp each option to 2 lines so rows still line up
 * and the dropdown stays a sane size.
 */
export const editorPopoverClassName = "max-h-80";

/** Clamp option content to 2 wrapped lines. */
export const wrapItemClassName = "overflow-hidden whitespace-normal break-words line-clamp-2";

/** Variant for URL-heavy options (break anywhere). */
export const wrapUrlItemClassName = "overflow-hidden whitespace-normal break-all line-clamp-2";
