import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { chunk } from "lodash";
import { parseDBParams, scrapping, stringifyDBParams } from "../../helpers";
import { initLog } from "../../logger";
import { recalculateTree } from "./tree";

const prisma = new PrismaClient();
const logger = initLog("SYNC|WIKI");

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
        type: ResourceType.WIKIPEDIA,
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

  const caseMatchesChunks = chunk(caseMatches, 100);

  let scrappingCounter = 0;
  let chunkCounter = 0;
  for (const caseMatchesChunk of caseMatchesChunks) {
    // get fresh counts from resource
    const caseMatchesChunkSync = await Promise.all(
      caseMatchesChunk.map(async (match) => {
        const { q } = parseDBParams(match.api_params);
        logger.info(`Step 2: Scrapping (${++scrappingCounter}/${caseMatches.length})`);
        try {
          const parsed = await scrapping(
            {
              ...match,
              api_params: stringifyDBParams({
                action: "parse",
                page: q,
                props: "text",
                format: "json",
              }),
            },
            { selector: "#headertemplate > table.header_notes > tbody > tr > td > a", responseKey: "parse.text.*" },
            true
          );

          const pdfFound = parsed?.some((el) => {
            const href = el.getAttribute("href");
            return href && href.endsWith(".pdf");
          });

          const count = pdfFound ? 1 : 0;

          // const data = [
          //   {
          //     match_id: match.id,
          //     count,
          //   },
          // ];

          // // TODO: think about how to use updated_at field, as a "sync date" or as "change date"
          // // if (match.last_count !== count) {
          // data.push({
          //   match_id: match.id,
          //   count,
          // });
          // }

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
              last_count: match.count,
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
