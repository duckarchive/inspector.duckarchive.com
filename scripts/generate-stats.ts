import fs from "fs";
import path from "path";
import prisma from "@/lib/db";

/**
 * Runs at build time (wired via the `prebuild`/`predev` npm lifecycle hooks) and writes a static
 * JSON snapshot to generated/home-stats.json. The home page imports that file directly, so the
 * numbers are baked into the build output rather than queried per-request or from the client.
 */
const OUTPUT_PATH = path.join(process.cwd(), "generated", "home-stats.json");
/**
 * Tag vocabulary for the search page's tag filter (components/search.tsx).
 * Snapshotted here so the search page never hits the DB at request time for it.
 */
const VOCAB_OUTPUT_PATH = path.join(process.cwd(), "generated", "search-vocab.json");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_VOCAB = {
  tags: [] as string[],
};

const collectVocab = async () => {
  const tagRows = await prisma.$queryRaw<Array<{ tag: string }>>`
    SELECT DISTINCT tag FROM (
      SELECT UNNEST("tags") AS tag FROM "files" WHERE cardinality("tags") > 0
      UNION
      SELECT UNNEST("tags") AS tag FROM "authors" WHERE cardinality("tags") > 0
    ) t
    ORDER BY tag
  `;

  return { tags: tagRows.map((row) => row.tag) };
};

const FALLBACK_STATS = {
  generatedAt: null as string | null,
  archives: 0,
  fonds: 0,
  inventories: 0,
  files: 0,
  authors: 0,
  locations: 0,
  onlineCopies: 0,
  onlineCopiesCheckedLast7Days: 0,
  communityEditsAppliedLast7Days: 0,
};

const collectStats = async () => {
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const appliedInLast7Days = { resolved_at: { gte: sevenDaysAgo }, NOT: { is_rejected: true } };

  const [
    archives,
    fonds,
    inventories,
    files,
    authors,
    locations,
    onlineCopies,
    onlineCopiesCheckedLast7Days,
    fondEditsApplied,
    inventoryEditsApplied,
    fileEditsApplied,
  ] = await Promise.all([
    prisma.archive.count(),
    prisma.fond.count(),
    prisma.inventory.count(),
    prisma.file.count(),
    prisma.author.count(),
    prisma.fileLocation.count(),
    prisma.onlineCopy.count(),
    prisma.onlineCopy.count({ where: { checked_availability_at: { gte: sevenDaysAgo } } }),
    prisma.fondActions.count({ where: appliedInLast7Days }),
    prisma.inventoryActions.count({ where: appliedInLast7Days }),
    prisma.fileActions.count({ where: appliedInLast7Days }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    archives,
    fonds,
    inventories,
    files,
    authors,
    locations,
    onlineCopies,
    onlineCopiesCheckedLast7Days,
    communityEditsAppliedLast7Days: fondEditsApplied + inventoryEditsApplied + fileEditsApplied,
  };
};

const main = async () => {
  let stats = FALLBACK_STATS;
  let vocab = FALLBACK_VOCAB;

  try {
    [stats, vocab] = await Promise.all([collectStats(), collectVocab()]);
    console.log("Generated home stats:", stats);
    console.log(`Generated search vocab: ${vocab.tags.length} tags`);
  } catch (error) {
    // A build must still succeed if the DB is briefly unreachable — ship zeroed stats
    // and an empty vocabulary rather than failing `next build`/`next dev` outright.
    console.warn("Failed to collect home stats, writing fallbacks:", error);
  } finally {
    await prisma.$disconnect();
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(stats, null, 2)}\n`);
  fs.writeFileSync(VOCAB_OUTPUT_PATH, `${JSON.stringify(vocab, null, 2)}\n`);
};

main();
