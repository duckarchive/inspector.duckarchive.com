import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { chunk } from "lodash";
import { scrapping } from "../../helpers";
import { recalculateTree } from "./tree";

const prisma = new PrismaClient();

export type ArchiumFullSyncResponse = {
  count: number;
};

// export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFullSyncResponse>) {
//   if (req.method === "GET") {
//     const matches = await prisma.match.findMany({
//       where: {
//         resource: {
//           type: ResourceType.ARCHIUM,
//         },
//         archive_id: {
//           not: null,
//         },
//         fund_id: null,
//         description_id: null,
//         case_id: null,
//       },
//     });

//     let totalCount = 0;
//     let counter = 0;

//     for (const { archive_id } of matches) {
//       console.log(`ARCHIUM: full sync progress (${++counter}/${matches.length})`);
//       if (archive_id) {
//         const count = await getArchiveCasesCount(archive_id);

//         totalCount += count;
//       }
//     }

//     res.status(200).json({ count: totalCount });
//   } else {
//     res.status(405);
//   }
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFullSyncResponse>) {
  if (req.method === "GET") {
    const totalCount = await syncAllMatches();

    res.status(200).json({ count: totalCount || 0 });
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
      updated_at: "asc",
    },
    take: 5000,
  });

  console.log("ARCHIUM: syncAllMatches: cases to sync", caseMatches.length);

  const caseMatchesChunks = chunk(caseMatches, 25);

  let scrappingCounter = 0;
  let chunkCounter = 0;
  for (const caseMatchesChunk of caseMatchesChunks) {
    // get fresh counts from resource
    const caseMatchesChunkSync = await Promise.all(
      caseMatchesChunk.map(async (match) => {
        console.log(`ARCHIUM: syncAllMatches: scrapping (${++scrappingCounter}/${caseMatches.length})`);
        try {
          const parsed = await scrapping(match, { selector: "#all-images > ul > li" });
          const count = parsed.length;

          const data = [
            {
              match_id: match.id,
              count,
            },
          ];

          // TODO: think about how to use updated_at field, as a "sync date" or as "change date"
          // if (match.last_count !== count) {
            data.push({
              match_id: match.id,
              count: count,
            });
          // }

          return data;
        } catch (error) {
          console.error("ARCHIUM: syncAllMatches: failed getting count for match", error, { match });
          return [
            {
              match_id: match.id,
              count: 0,
              error: error?.toString().slice(0, 200) || "Unknown error",
            },
          ];
        }
      })
    );

    console.log(`ARCHIUM: syncAllMatches: save sync results (${++chunkCounter}/${caseMatchesChunks.length})`);
    // save sync results
    await prisma.matchResult.createMany({
      data: caseMatchesChunkSync.map(([result]) => result),
    });

    console.log(`ARCHIUM: syncAllMatches: update match counts (${chunkCounter}/${caseMatchesChunks.length})`);
    // update case matches with new counts
    await Promise.all(
      caseMatchesChunkSync.map(async ([_, match]) => {
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

  console.log(`ARCHIUM: syncAllMatches: recalculating tree (${chunkCounter}/${caseMatchesChunks.length})`);
  // update tree with new counts
  await recalculateTree();

  return caseMatches.length;
};
