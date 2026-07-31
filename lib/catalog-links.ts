/**
 * Public catalog URLs are /archives/{archive}/{fond}/{inventory}/{file}, each
 * segment a `code` (not an id) — see app/[locale]/archives/**. Codes are
 * positional: a gap means nothing deeper was selected, so stop there rather
 * than skip it (an inventory link with no fond code would 404).
 */
const catalogItemSegments = (codes: Array<string | null | undefined>): string[] => {
  const segments: string[] = [];
  for (const code of codes) {
    if (!code) break;
    segments.push(code);
  }
  return segments;
};

/** URL for the deepest fully-selected level, or null once none are selected. */
export const catalogItemHref = (codes: Array<string | null | undefined>): string | null => {
  const segments = catalogItemSegments(codes);
  return segments.length ? `/archives/${segments.map(encodeURIComponent).join("/")}` : null;
};

/** Matches the app's `full_code` convention (archive-fond-inventory-file), trimmed to what's selected. */
export const catalogItemLabel = (codes: Array<string | null | undefined>): string =>
  catalogItemSegments(codes).join("-");
