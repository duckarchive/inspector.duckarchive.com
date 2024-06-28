import { NextApiRequest, NextApiResponse } from "next";
import { Archive, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../helpers";

const prisma = new PrismaClient();

export type ArchiumSyncArchiveResponse = Archive;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumSyncArchiveResponse>) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;

    const count = await getArchiveCasesCount(archiveId);

    const updatedArchive = await prisma.archive.update({
      where: {
        id: archiveId,
      },
      data: {
        count,
      },
    });

    res.json(updatedArchive);
  } else {
    res.status(405);
  }
}

export const getArchiveCasesCount = async (archiveId: string) => {
  try {
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

    const { api_headers, api_method, api_params, api_url } = match;

    const {
      data: { View },
    } = await axios.request({
      url: api_url,
      method: api_method || "GET",
      headers: parseDBParams(api_headers),
      params: parseDBParams(api_params),
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
        count,
        error: null,
      },
    });

    return count;
  } catch (error) {
    console.error("sync archive error", error);
    return 0;
  }
};
