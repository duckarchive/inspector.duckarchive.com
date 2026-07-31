/**
 * Shared HeroUI ComboBox config for editor selects.
 *
 * HeroUI v3 dropped v2's listbox virtualization props (`isVirtualized`,
 * `itemHeight`, `maxListboxHeight`). Long lists are handled by paging instead
 * (see `useCatalogSearch`), but the popover still needs pinning down:
 *
 * - v3 sizes the popover to its widest option, so one long fond title stretches
 *   the dropdown far past the input. Pinning it to `--trigger-width` (set inline
 *   by React Aria) keeps it aligned with the field and lets the per-option
 *   `line-clamp-2` actually clamp, since the text finally has a width to wrap in.
 * - React Aria writes `max-height` inline from the available viewport space, so a
 *   `max-h-*` class here would never win. The popover already scrolls
 *   (`overflow: auto`), which is what we need once the width is fixed.
 */
export const editorPopoverClassName = "w-(--trigger-width) max-w-(--trigger-width)";

/**
 * Clamp each line of an option (code, then title) to 2 wrapped lines.
 *
 * Clamping the option *wrapper* instead would cut the block mid-row and leave a
 * sliver of the next line showing, since the content is two stacked paragraphs.
 */
export const wrapItemClassName = "overflow-hidden [&_p]:line-clamp-2 [&_p]:break-words";

/** Variant for URL-heavy options (break anywhere). */
export const wrapUrlItemClassName = "overflow-hidden [&_span]:line-clamp-2 [&_span]:break-all";
