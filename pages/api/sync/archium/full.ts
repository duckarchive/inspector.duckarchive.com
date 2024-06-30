import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { getDescriptionCasesCount } from "./[archive_id]/[fund_id]/[description_id]";
import { getFundCasesCount } from "./[archive_id]/[fund_id]";
import { getArchiveCasesCount } from "./[archive_id]";
import { chunk } from "lodash";

const prisma = new PrismaClient();

export type ArchiumFullSyncResponse = {
  archiveCasesCount: number;
  fundCasesCount: number;
  descriptionCasesCount: number;
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

    const result = {
      archiveCasesCount: 0,
      fundCasesCount: 0,
      descriptionCasesCount: 0,
    };

    let counter = 0;

    for (const { archive_id } of matches) {
      console.log(`ARCHIUM: full sync progress (${++counter}/${matches.length})`);
      if (archive_id) {
        const count = await getArchiveCasesCount(archive_id);

        result.archiveCasesCount += count;

        await prisma.archive.update({
          where: {
            id: archive_id,
          },
          data: {
            count,
          },
        });
      }
    }

    res.status(200).json(result);
  } else {
    res.status(405);
  }
}
