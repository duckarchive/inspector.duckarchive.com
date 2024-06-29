import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { fetchArchiveFunds } from "./[archive_id]";

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
        archive_id: {
          not: null,
        },
        fund_id: null,
        description_id: null,
        case_id: null,
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

    for (const { archive_id } of fetches) {
      console.log(`ARCHIUM: full fetch progress (${++counter}/${fetches.length})`);
      if (archive_id) {
        const fundsResult = await fetchArchiveFunds(archive_id);

        result.funds.total += fundsResult.total;
        result.funds.added += fundsResult.added;
        result.funds.removed += fundsResult.removed;
      }
    }

    res.status(200).json(result);
  } else {
    res.status(405);
  }
}
