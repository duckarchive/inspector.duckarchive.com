import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { scrapping } from "../../../../../helpers";

const prisma = new PrismaClient();

export type ArchiumSyncCaseResponse = {
  count: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncCaseResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;
      const descriptionId = req.query.description_id as string;
      const caseId = req.query.case_id as string;

      const count = await getCaseFilesCount(archiveId, fundId, descriptionId, caseId);

      res.status(200).json({ count });
    } catch (error) {
      console.error("ARCHIUM: Sync case handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const getCaseFilesCount = async (archiveId: string, fundId: string, descriptionId: string, caseId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      archive_id: archiveId,
      fund_id: fundId,
      description_id: descriptionId,
      case_id: caseId,
    },
  });

  if (!match) {
    throw new Error("No match found");
  }
  try {
    const parsed = await scrapping(match, { selector: "#all-images > ul > li" });
    const count = parsed.length

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count,
      },
    });

    if (match.children_count !== count) {
      await prisma.match.update({
        where: {
          id: match.id,
        },
        data: {
          last_count: count,
          children_count: count,
        },
      });
    }

    return count;
  } catch (error) {
    console.error("ARCHIUM: getCaseFilesCount", error, { archiveId, fundId, descriptionId, caseId });

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
