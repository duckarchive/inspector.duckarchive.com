import { NextApiRequest, NextApiResponse } from "next";
import { Description, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parseDBParams } from "../../../../../helpers";
import parse from "node-html-parser";

const prisma = new PrismaClient();

export type ArchiumSyncDescriptionResponse = Description;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncDescriptionResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;
      const descriptionId = req.query.description_id as string;
  
      const count = await getDescriptionCasesCount(archiveId, fundId, descriptionId);
  
      const updatedDescription = await prisma.description.update({
        where: {
          id: descriptionId,
        },
        data: {
          count,
        },
      });
  
      res.status(200).json(updatedDescription);
    } catch (error) {
      console.error("ARCHIUM: Sync description handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const getDescriptionCasesCount = async (archiveId: string, fundId: string, descriptionId: string) => {
  const DOM_QUERY = "div.main-content > div.items-wrapper > div.container > div.loading-part > div.row > div.right > a";
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
    const {
      data: View,
    } = await axios.request({
      url: match.api_url,
      method: match.api_method || "GET",
      headers: parseDBParams(match.api_headers),
      params: parseDBParams(match.api_params),
    });

    const dom = parse(View);

    const count = [...dom.querySelectorAll(DOM_QUERY)].filter(Boolean).length;

    await prisma.matchResult.create({
      data: {
        match_id: match.id,
        count,
      },
    });

    return count;
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
