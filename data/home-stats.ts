import stats from "@generated/home-stats.json";

/**
 * Snapshot written by scripts/generate-stats.ts at build time (see the `prebuild`/`predev`
 * npm scripts). Importing the JSON directly bakes these numbers into the build output instead
 * of querying the DB per-request or from the client.
 */
export type HomeStats = typeof stats;

export const homeStats: HomeStats = stats;

/** Every count-type stat on the stats page, summed for the home hero's "search over X records" line. */
export const totalRecords =
  homeStats.archives +
  homeStats.fonds +
  homeStats.inventories +
  homeStats.files +
  homeStats.authors +
  homeStats.locations +
  homeStats.onlineCopies;
