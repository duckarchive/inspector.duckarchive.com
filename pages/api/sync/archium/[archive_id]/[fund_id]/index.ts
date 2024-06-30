import { NextApiRequest, NextApiResponse } from "next";
import { Fund, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../../helpers";
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
  const DOM_QUERY = "div.main-content > div.items-wrapper > div.container > div.loading-part > div.row > div.right > a";
  const DOM_PARSER = (el: string) => +el.split(" справ")[0].split(", ")[1];
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
    const { data: View } = await axios.request({
      url: match.api_url,
      method: match.api_method || "GET",
      headers: parseDBParams(match.api_headers),
      params: parseDBParams(match.api_params),
    });

    const dom = parse(View);

    const count = [...dom.querySelectorAll(DOM_QUERY)]
      .map((el) => el.innerText)
      .map(DOM_PARSER)
      .filter(Boolean)
      .reduce((prev, el) => (prev += el), 0);

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count,
      },
    });

    if (match.last_count !== count) {
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

      await prisma.match.update({
        where: {
          id: match.id,
        },
        data: {
          last_count: count,
        },
      });
    }

    return count;
  } catch (error) {
    console.error("ARCHIUM: getFundCasesCount", error, { archiveId });

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
