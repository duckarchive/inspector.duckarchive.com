import { NextApiRequest, NextApiResponse } from "next";
import { Archive, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../helpers";
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
  const DOM_QUERY = "div.single-data > p > a > span";
  const DOM_PARSER = (el: string) => +el.split(" справ")[0].split(", ")[1];
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

    const prevMatchResult = await prisma.matchResult.findFirst({
      where: {
        match_id: match.id,
        error: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count,
      },
    });

    if (prevMatchResult?.count !== count) {
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
    }

    return count;
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
