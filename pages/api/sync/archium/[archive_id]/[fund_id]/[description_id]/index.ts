import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { scrapping } from "../../../../../helpers";
import { getCaseFilesCount } from "./[case_id]";
import { chunk } from "lodash";

const prisma = new PrismaClient();

export type ArchiumSyncDescriptionResponse = {
  count: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncDescriptionResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;
      const descriptionId = req.query.description_id as string;

      const count = await getDescriptionCasesCount(archiveId, fundId, descriptionId);

      res.status(200).json({ count });
    } catch (error) {
      console.error("ARCHIUM: Sync description handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const getDescriptionCasesCount = async (archiveId: string, fundId: string, descriptionId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      archive_id: archiveId,
      fund_id: fundId,
      description_id: descriptionId,
      case_id: null,
    },
  });

  if (!match) {
    throw new Error("No match found");
  }
  try {
    const cases = await prisma.case.findMany({
      where: {
        description_id: descriptionId,
      },
    });

    const casesChunks = chunk(cases, 15);

    let caseCounter = 0;
    let onlineCasesCount = 0;
    for (const caseChunk of casesChunks) {
      await Promise.all(
        caseChunk.map(async (caseItem) => {
          console.log(`ARCHIUM: getDescriptionCasesCount: cases progress (${++caseCounter}/${cases.length})`);
          const filesCount = await getCaseFilesCount(archiveId, fundId, descriptionId, caseItem.id);
          onlineCasesCount += filesCount > 0 ? 1 : 0;
        })
      );
    }

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count: onlineCasesCount,
      },
    });

    if (match.children_count !== onlineCasesCount) {
      await prisma.match.update({
        where: {
          id: match.id,
        },
        data: {
          last_count: onlineCasesCount,
          children_count: onlineCasesCount,
        },
      });
    }

    return onlineCasesCount;
  } catch (error) {
    console.error("ARCHIUM: getDescriptionCasesCount", error, { archiveId, fundId, descriptionId });

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count: 0,
        error: error?.toString().slice(0, 200) || "Unknown error",
      },
    });

    return 0;
  }
};
