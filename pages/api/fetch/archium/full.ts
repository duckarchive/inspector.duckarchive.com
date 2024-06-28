import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { chunk } from "lodash";
import { fetchArchiveFunds, saveArchiveFunds } from "./[archive_id]";
import { fetchFundDescriptions, saveFundDescriptions } from "./[archive_id]/[fund_id]";

const prisma = new PrismaClient();

export type ArchiumFullFetchResponse = {
  funds: {
    total: number;
    added: number;
    removed: number;
  };
  descriptions: {
    total: number;
    added: number;
    removed: number;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFullFetchResponse>) {
  if (req.method === "GET") {
    const fetches = await prisma.fetch.findMany({
      where: {
        resource: {
          type: ResourceType.ARCHIUM,
        },
      },
    });

    const result = {
      funds: {
        total: 0,
        added: 0,
        removed: 0,
      },
      descriptions: {
        total: 0,
        added: 0,
        removed: 0,
      },
    };

    let counter = 0;

    const chunks = chunk(fetches, 10);

    for (const chunk of chunks) {
      console.log(`archium full fetch chunk ${counter++} of ${chunks.length}`);
      await Promise.all(
        chunk.map(async ({ archive_id, fund_id }) => {
          if (archive_id && fund_id) {
            const descriptions = await fetchFundDescriptions(archive_id, fund_id);
            const descriptionsResult = await saveFundDescriptions(archive_id, fund_id, descriptions);

            result.descriptions.total += descriptionsResult.total;
            result.descriptions.added += descriptionsResult.added;
            result.descriptions.removed += descriptionsResult.removed;
          } else if (archive_id) {
            const funds = await fetchArchiveFunds(archive_id);
            const fundsResult = await saveArchiveFunds(archive_id, funds);

            result.funds.total += fundsResult.total;
            result.funds.added += fundsResult.added;
            result.funds.removed += fundsResult.removed;
          }
        })
      );
    }

    res.status(200).json(result);
  } else {
    res.status(405);
  }
}
