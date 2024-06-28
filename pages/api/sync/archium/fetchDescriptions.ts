import { PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parseDBParams } from "../../helpers";
import { parse } from "node-html-parser";
import { NextApiRequest, NextApiResponse } from "next";

const DOM_QUERY =
  "div.container > div.row.with-border-bottom.thin-row > div.left > a";

const prisma = new PrismaClient();

export const fetchDescriptions = async (
  archiveId: string,
  fundId: string
): Promise<FetchArchiumResponse> => {
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

  const { api_headers, api_method, api_params, api_url } = fetch;

  const {
    data: View,
    status
  } = await axios.request({
    url: api_url,
    method: api_method || "GET",
    headers: parseDBParams(api_headers),
    params: parseDBParams(api_params),
  });

  const dom = parse(View);
  const BASE_URL = fetch.api_url.split("/api")[0];
  const descriptions = [...dom.querySelectorAll(DOM_QUERY)]
    .filter(Boolean)
    .map((anchorEl) => {
      const title = anchorEl.innerText.trim();
      const code = title.replace(/опис/gi, "").replace(/ /g, "");
      const matchApiUrl = BASE_URL + anchorEl.getAttribute("href")?.trim();
      return {
        code: code.trim(),
        title: title.slice(0, 200),
        matchApiUrl: matchApiUrl.trim(),
        fetchApiUrl: matchApiUrl.trim(),
      };
    });

  const prevDescriptions = await prisma.description.findMany({
    where: {
      fund_id: fundId,
    },
  });

  const newDescriptions = descriptions.filter(
    (f) => !prevDescriptions.some((pf) => pf.code === f.code)
  );

  await Promise.all(
    newDescriptions.map(async (f) => {
      if (fetch.archive_id) {
        const newDescription = await prisma.description.create({
          data: {
            fund_id: fundId,
            code: f.code,
            title: f.title,
          },
        });

        await prisma.match.create({
          data: {
            resource_id: fetch.resource_id,
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
            resource_id: fetch.resource_id,
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

  const removedDescriptions = prevDescriptions.filter(
    (pd) => !descriptions.some((d) => d.code === pd.code)
  );

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
    created_at: new Date(),
    match_id: fetch.id,
    total: descriptions.length,
    added: newDescriptions.length,
    removed: removedDescriptions.length,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { archive_id, fund_id } = req.query as { archive_id: string; fund_id: string };
  try {
    const response = await fetchDescriptions(
      archive_id.toString(),
      fund_id.toString()
    );
    res.status(200).json(response);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}