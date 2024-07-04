import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { scrapping } from "../../../../helpers";
import { getDescriptionCasesCount } from "./[description_id]";

const prisma = new PrismaClient();

export type ArchiumSyncFundResponse = {
  count: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncFundResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;

      const count = await getFundCasesCount(archiveId, fundId);

      res.json({ count });
    } catch (error) {
      console.error("ARCHIUM: Sync fund handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const getFundCasesCount = async (archiveId: string, fundId: string) => {
  const match = await prisma.match.findFirst({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      archive_id: archiveId,
      fund_id: fundId,
      description_id: null,
      case_id: null,
    },
  });

  if (!match) {
    throw new Error("No match found");
  }
  try {
    const parsed = await scrapping(match, {
      selector: "div.main-content > div.items-wrapper > div.container > div.loading-part > div.row > div.right > a",
    });
    const count = parsed
      .map((el) => +el.innerText.split(" справ")[0].split(", ")[1])
      .reduce((prev, el) => (prev += el), 0);

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count,
      },
    });

    const descriptions = await prisma.description.findMany({
      where: {
        fund_id: fundId,
      },
    });

    let descriptionCounter = 0;
    for (const description of descriptions) {
      console.log(`ARCHIUM: getFundCasesCount: descriptions progress (${++descriptionCounter}/${descriptions.length})`);
      await getDescriptionCasesCount(archiveId, fundId, description.id);
    }

    const onlineDescriptionsCount = await prisma.match.count({
      where: {
        resource: {
          type: ResourceType.ARCHIUM,
        },
        archive_id: archiveId,
        fund_id: fundId,
        description_id: {
          not: null,
        },
        case_id: null,
        children_count: {
          gt: 0,
        },
      },
    });

    await prisma.match.update({
      where: {
        id: match.id,
      },
      data: {
        last_count: count,
        children_count: onlineDescriptionsCount,
      },
    });

    return count;
  } catch (error) {
    console.error("ARCHIUM: getFundCasesCount", error, { archiveId, fundId });

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
