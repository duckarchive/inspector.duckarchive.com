import vocab from "@generated/search-vocab.json";

/**
 * Archive codes and tag vocabulary snapshotted at build time by
 * scripts/generate-stats.ts. Used by the home page's on-device query parser
 * to constrain the model to real filter values; imported as JSON so it ships
 * in the bundle instead of costing a DB round-trip per request.
 */
export type SearchVocab = typeof vocab;

export const searchVocab: SearchVocab = vocab;
