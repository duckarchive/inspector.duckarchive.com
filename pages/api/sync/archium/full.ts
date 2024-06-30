import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { getArchiveCasesCount } from "./[archive_id]";

const prisma = new PrismaClient();

export type ArchiumFullSyncResponse = {
  count: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFullSyncResponse>) {
  if (req.method === "GET") {
    const matches = await prisma.match.findMany({
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

    
    let totalCount = 0;
    let counter = 0;

    for (const { archive_id } of matches) {
      console.log(`ARCHIUM: full sync progress (${++counter}/${matches.length})`);
      if (archive_id) {
        const count = await getArchiveCasesCount(archive_id);

        totalCount += count;
      }
    }

    res.status(200).json({ count: totalCount });
  } else {
    res.status(405);
  }
}
