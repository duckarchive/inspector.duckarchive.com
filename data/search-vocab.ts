import vocab from "@generated/search-vocab.json";

/**
 * Tag vocabulary snapshotted at build time by scripts/generate-stats.ts, for the
 * search page's tag filter. Imported as JSON so it ships in the bundle instead
 * of costing a DB round-trip per request.
 */
export type SearchVocab = typeof vocab;

export const searchVocab: SearchVocab = vocab;
