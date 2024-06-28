import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../../helpers";

const prisma = new PrismaClient();

export type ArchiumFetchFundResponse = {
  total: number;
  added: number;
  removed: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFetchFundResponse>) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;
    const fundId = req.query.fund_id as string;

    const descriptions = await fetchFundDescriptions(archiveId, fundId);
    const result = await saveFundDescriptions(archiveId, fundId, descriptions);
    
    res.status(200).json(result);
  } else {
    res.status(405);
  }
}

export const fetchFundDescriptions = async (archiveId: string, fundId: string) => {
  try {
    const DOM_QUERY = "div.container > div.row.with-border-bottom.thin-row > div.left > a";
    const fetch = await prisma.fetch.findFirst({
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

    if (!fetch) {
      throw new Error("Fetch not found");
    }

    const { data: View } = await axios.request({
      url: fetch.api_url,
      method: fetch.api_method || "GET",
      headers: parseDBParams(fetch.api_headers),
      params: parseDBParams(fetch.api_params),
    });

    const dom = parse(View);
    const BASE_URL = fetch.api_url.split("/api")[0];
    const descriptions = [...dom.querySelectorAll(DOM_QUERY)].filter(Boolean).map((anchorEl) => {
      const title = anchorEl.innerText.trim();
      const code = title.replace(/опис/gi, "").replace(/ /g, "");
      const matchApiUrl = BASE_URL + anchorEl.getAttribute("href")?.trim();
      return {
        resourceId: fetch.resource_id,
        code: code.trim(),
        title: title.slice(0, 200),
        matchApiUrl: matchApiUrl.trim(),
        fetchApiUrl: matchApiUrl.trim(),
      };
    });

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: descriptions.length,
      },
    });

    return descriptions;
  } catch (error) {
    console.error("fetch fund descriptions error", error);
    return [];
  }
};

export const saveFundDescriptions = async (archiveId: string, fundId: string, descriptions: any[]) => {
  const prevDescriptions = await prisma.description.findMany({
    where: {
      fund_id: fundId,
    },
  });

  const newDescriptions = descriptions.filter((f) => !prevDescriptions.some((pf) => pf.code === f.code));

  await Promise.all(
    newDescriptions.map(async (f) => {
      if (archiveId) {
        const newDescription = await prisma.description.create({
          data: {
            fund_id: fundId,
            code: f.code,
            title: f.title,
          },
        });

        await prisma.match.create({
          data: {
            resource_id: f.resourceId,
            archive_id: archiveId,
            fund_id: newDescription.id,
            description_id: newDescription.id,
            api_url: f.matchApiUrl,
            api_headers: null,
            api_params: "Limit:9999,Page:1",
          },
        });

        await prisma.fetch.create({
          data: {
            resource_id: f.resourceId,
            archive_id: archiveId,
            fund_id: newDescription.id,
            description_id: newDescription.id,
            api_url: f.fetchApiUrl,
            api_headers: null,
            api_params: "Limit:9999,Page:1",
          },
        });
      }
    })
  );

  const removedDescriptions = prevDescriptions.filter((pd) => !descriptions.some((d) => d.code === pd.code));

  await Promise.all(
    removedDescriptions.map(async (d) => {
      await prisma.description.delete({
        where: {
          id: d.id,
        },
      });

      await prisma.match.deleteMany({
        where: {
          description_id: d.code,
        },
      });

      await prisma.fetch.deleteMany({
        where: {
          description_id: d.code,
        },
      });
    })
  );

  return {
    total: descriptions.length,
    added: newDescriptions.length,
    removed: removedDescriptions.length,
  };
};