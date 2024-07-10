import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { chunk } from "lodash";
import { scrapping } from "../../helpers";
import { recalculateTree } from "./tree";
import { initLog } from "../../logger";

const prisma = new PrismaClient();
const logger = initLog("SYNC|ARCHIUM");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const totalCount = await syncAllMatches();

      res.status(200).json({ count: totalCount || 0 });
    } catch (error: Error | any) {
      logger.error("Failed request", error);
      res.status(500).json({ error: error?.message });
    }
  } else {
    res.status(405);
  }
}

const syncAllMatches = async () => {
  const caseMatches = await prisma.match.findMany({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      case_id: {
        not: null,
      },
      children_count: null,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 5000,
  });

  logger.info(`Step 1: Cases to sync: ${caseMatches.length}`);

  const caseMatchesChunks = chunk(caseMatches, 25);

  let scrappingCounter = 0;
  let chunkCounter = 0;
  for (const caseMatchesChunk of caseMatchesChunks) {
    // get fresh counts from resource
    const caseMatchesChunkSync = await Promise.all(
      caseMatchesChunk.map(async (match) => {
        logger.info(`Step 2: Scrapping (${++scrappingCounter}/${caseMatches.length})`);
        try {
          const parsed = await scrapping(match, { selector: "#all-images > ul > li" }, true);
          const count = parsed.length;

          return {
            match_id: match.id,
            count,
          };
        } catch (error) {
          logger.info(`Step 2: Failed scrapping for match: ${match}`, error);
          return {
            match_id: match.id,
            count: 0,
            error: error?.toString().slice(0, 200) || "Unknown error",
          };
        }
      })
    );

    logger.info(`Step 3: Save sync results (${++chunkCounter}/${caseMatchesChunks.length})`);
    // save sync results
    await prisma.matchResult.createMany({
      data: caseMatchesChunkSync.map((result) => result),
    });

    logger.info(`Step 4: Update match counts (${chunkCounter}/${caseMatchesChunks.length})`);
    // update case matches with new counts
    await Promise.all(
      caseMatchesChunkSync.map(async (match) => {
        if (match) {
          await prisma.match.update({
            where: {
              id: match.match_id,
            },
            data: {
              children_count: match.count,
            },
          });
        }
      })
    );
  }

  logger.info(`Step 4: recalculating tree (${chunkCounter}/${caseMatchesChunks.length})`);
  // update tree with new counts
  await recalculateTree();

  return caseMatches.length;
};
