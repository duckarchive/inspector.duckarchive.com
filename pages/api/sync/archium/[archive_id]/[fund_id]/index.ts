import { NextApiRequest, NextApiResponse } from "next";
import { Fund, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../../helpers";

const prisma = new PrismaClient();

export type ArchiumSyncFundResponse = Fund;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncFundResponse>) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;
    const fundId = req.query.fund_id as string;

    const count = await getFundCasesCount(archiveId, fundId);

    const updatedFund = await prisma.fund.update({
      where: {
        id: fundId,
      },
      data: {
        count,
      },
    });

    res.json(updatedFund);
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

  const {
    data: { View },
  } = await axios.request({
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

  await prisma.result.create({
    data: {
      match_id: match.id,
      count: count,
      error: null,
    },
  });

  return count;
};
