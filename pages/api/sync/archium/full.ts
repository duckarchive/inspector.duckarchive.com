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
      },
    });

    const result = {
      archiveCasesCount: 0,
      fundCasesCount: 0,
      descriptionCasesCount: 0,
    };

    let counter = 0;

    const chunks = chunk(matches, 10);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async ({ archive_id, fund_id, description_id }) => {
          console.log(`ARCHIUM: full sync progress (${counter++}/${matches.length})`);
          if (archive_id && fund_id && description_id) {
            const count = await getDescriptionCasesCount(archive_id, fund_id, description_id);

            result.descriptionCasesCount += count;

            await prisma.description.update({
              where: {
                id: description_id,
              },
              data: {
                count,
              },
            });
          } else if (archive_id && fund_id) {
            const count = await getFundCasesCount(archive_id, fund_id);

            result.fundCasesCount += count;

            await prisma.fund.update({
              where: {
                id: fund_id,
              },
              data: {
                count,
              },
            });
          } else if (archive_id) {
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
        })
      );
    }

    res.status(200).json(result);
  } else {
    res.status(405);
  }
}
