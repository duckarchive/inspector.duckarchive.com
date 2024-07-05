import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { scrapping } from "../../../helpers";
import { getFundCasesCount } from "./[fund_id]";

const prisma = new PrismaClient();

export type ArchiumSyncArchiveResponse = {
  count: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncArchiveResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const count = await getArchiveCasesCount(archiveId);

      res.json({ count });
    } catch (error) {
      console.error("ARCHIUM: Sync archive handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const getArchiveCasesCount = async (archiveId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      archive_id: archiveId,
      fund_id: null,
      description_id: null,
      case_id: null,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }
  try {
    const funds = await prisma.fund.findMany({
      where: {
        archive_id: archiveId,
      },
    });

    let fundsCounter = 0;
    for (const fund of funds) {
      console.log(`ARCHIUM: getArchiveCasesCount: funds progress (${++fundsCounter}/${funds.length})`);
      await getFundCasesCount(archiveId, fund.id);
    }

    const onlineFundsCount = await prisma.match.count({
      where: {
        resource: {
          type: ResourceType.ARCHIUM,
        },
        archive_id: archiveId,
        fund_id: {
          not: null,
        },
        description_id: null,
        case_id: null,
        children_count: {
          gt: 0,
        },
      },
    });

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count: onlineFundsCount,
      },
    });

    if (match.children_count !== onlineFundsCount) {
      await prisma.match.update({
        where: {
          id: match.id,
        },
        data: {
          last_count: onlineFundsCount,
          children_count: onlineFundsCount,
        },
      });
    }

    return onlineFundsCount;
  } catch (error) {
    console.error("ARCHIUM: getArchiveCasesCount", error, { archiveId });

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
