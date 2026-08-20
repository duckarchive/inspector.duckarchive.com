/**
 * Resolve any FamilySearch URL to its DGS (digital film / image group) number.
 *
 * Supported URL forms:
 *   1. Image viewer (ark):  …/ark:/61903/3:1:<ID>?view=explore&groupId=TH-…
 *      → DAS lookup of the ark image id (namespace=dgs)
 *   2. Same ark URL without grid/extra params — same path as (1)
 *   3. Search results:      …/records/images/search-results?imageGroupNumbers=<DGS>
 *      → parsed directly from the query string, no network call
 *   Fallback: a `groupId=TH-…` param (film-level APID) when no ark id is present.
 *
 * There is no offline algorithm for ark/APID → DGS — the mapping lives in
 * FamilySearch's DAS service. The `www.familysearch.org/das/v2` gateway is
 * unauthenticated and CORS-open (verified 2026-08-20); do NOT use the
 * `sg30p0.familysearch.org` host (Akamai-guarded, CORS-blocked).
 *
 * CLI:
 *   tsx scripts/to-dgs.ts <url> [<url> …]   # prints "<dgs>\t<url>" per line
 *   tsx scripts/to-dgs.ts                   # runs the built-in self-test
 */

const DAS_BASE = "https://www.familysearch.org/das/v2";

// Akamai 403s requests without a browser-like User-Agent; the UA alone is
// enough — no cookies/auth needed (verified 2026-08-20).
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

/** DAS name lookup: id is an ark image id ("3:1:…") or "apid:TH-…". */
const dasNameToDGS = async (id: string): Promise<string> => {
  const res = await fetch(`${DAS_BASE}/${id}/name?namespace=dgs`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`DAS name lookup failed with ${res.status} for "${id}"`);
  }
  const text = (await res.text()).trim();
  // "dgs:119478539" (film apid) or "dgs:119478539.119478539_00001" (image)
  const match = text.match(/^dgs:(\d+)/);

  if (!match) {
    throw new Error(`Unexpected DAS response "${text}" for "${id}"`);
  }

  return match[1];
};

export const toDGS = async (input: string): Promise<string> => {
  const url = new URL(input);

  // 3) search-results?imageGroupNumbers=<DGS> — pure parsing, no network
  const imageGroupNumbers = url.searchParams.get("imageGroupNumbers");

  if (imageGroupNumbers) {
    const value = imageGroupNumbers.split(",")[0].trim();
    // Either a bare DGS ("119478539") or the composite waypoint form
    // "<dgs>_<seq>_<id>" ("004001297_001_M954-9RB", ~2.7% of our online_copies)
    // whose numeric prefix IS the DGS — keep its zero padding, DAS rejects
    // the unpadded variant.
    const dgs = value.match(/^(\d+)(?:_|$)/)?.[1];

    if (!dgs) {
      throw new Error(`Malformed imageGroupNumbers value "${imageGroupNumbers}"`);
    }

    return dgs;
  }

  // 1/2) ark image id → DAS lookup
  const arkMatch = decodeURIComponent(url.pathname).match(
    /ark:\/61903\/(3:1:[A-Z0-9-]+)/i,
  );

  if (arkMatch) {
    return dasNameToDGS(arkMatch[1]);
  }

  // fallback: film-level APID from the groupId param
  const groupId = url.searchParams.get("groupId");

  if (groupId && /^TH-[\d-]+$/.test(groupId)) {
    return dasNameToDGS(`apid:${groupId}`);
  }

  throw new Error(`Cannot resolve a DGS from URL: ${input}`);
};

const SELF_TEST: Array<[url: string, expected: string]> = [
  [
    "https://www.familysearch.org/ark:/61903/3:1:3QHK-778R-Z9XZ-9?view=explore&groupId=TH-7738-145172-55122-72&grid=on&lang=uk",
    "119478539",
  ],
  [
    "https://www.familysearch.org/ark:/61903/3:1:3QHK-778R-Z9XZ-9?view=explore&groupId=TH-7738-145172-55122-72&lang=uk",
    "119478539",
  ],
  [
    "https://www.familysearch.org/uk/records/images/search-results?imageGroupNumbers=119478539",
    "119478539",
  ],
  // composite waypoint form seen in online_copies (~53.5k rows)
  [
    "https://www.familysearch.org/en/records/images/search-results?imageGroupNumbers=004001297_001_M954-9RB",
    "004001297",
  ],
  // a different ark on the same film still resolves to the same DGS
  [
    "https://www.familysearch.org/ark:/61903/3:1:3QHK-N78R-LV6N?view=explore&groupId=TH-7738-145172-55122-72&lang=uk",
    "119478539",
  ],
  // groupId-only fallback (film-level APID, no ark in the path)
  [
    "https://www.familysearch.org/search/film/007548295?view=explore&groupId=TH-7738-145172-55122-72",
    "119478539",
  ],
];

const main = async () => {
  const urls = process.argv.slice(2);

  if (urls.length > 0) {
    for (const url of urls) {
      console.log(`${await toDGS(url)}\t${url}`);
    }

    return;
  }

  let failed = 0;

  for (const [url, expected] of SELF_TEST) {
    const started = Date.now();
    const actual = await toDGS(url).catch((e) => `ERROR: ${e.message}`);
    const ok = actual === expected;

    if (!ok) failed += 1;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${actual} (expected ${expected}, ${Date.now() - started}ms)  ${url}`,
    );
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
};

// run only when executed directly (not imported)
if (process.argv[1]?.endsWith("to-dgs.ts")) {
  main();
}
