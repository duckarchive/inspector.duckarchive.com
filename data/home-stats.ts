import stats from "@generated/home-stats.json";

/**
 * Snapshot written by scripts/generate-stats.ts at build time (see the `prebuild`/`predev`
 * npm scripts). Importing the JSON directly bakes these numbers into the build output instead
 * of querying the DB per-request or from the client.
 */
export type HomeStats = typeof stats;

export const homeStats: HomeStats = stats;
