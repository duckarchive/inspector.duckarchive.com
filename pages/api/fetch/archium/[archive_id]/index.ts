import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../helpers";

const prisma = new PrismaClient();

export type ArchiumFetchArchiveResponse = {
  total: number;
  added: number;
  removed: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFetchArchiveResponse>) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;

    const funds = await fetchArchiveFunds(archiveId);

    const result = await saveArchiveFunds(archiveId, funds);

    res.json(result);
  } else {
    res.status(405);
  }
}

export const fetchArchiveFunds = async (archiveId: string) => {
  try {
    const DOM_QUERY = "table.fond-groups > tbody > tr";
    const fetch = await prisma.fetch.findFirst({
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

    if (!fetch) {
      throw new Error("Fetch not found");
    }

    const {
      data: View,
    } = await axios.request({
      url: fetch.api_url,
      method: fetch.api_method || "GET",
      headers: parseDBParams(fetch.api_headers),
      params: parseDBParams(fetch.api_params),
    });

    const dom = parse(View);

    const BASE_URL = fetch.api_url.split("/api")[0];
    const funds = [...dom.querySelectorAll(DOM_QUERY)]
      .filter(Boolean)
      .map((el) => el.querySelectorAll("td"))
      .map(([code, title]) => ({
        resourceId: fetch.resource_id,
        code: code.innerText.trim(),
        title: title.innerText.trim().slice(0, 200),
        matchApiUrl: BASE_URL + title.querySelector("a")?.getAttribute("href")?.trim(),
        fetchApiUrl: BASE_URL + title.querySelector("a")?.getAttribute("href")?.trim(),
      }));

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: funds.length,
      },
    });

    return funds;
  } catch (error) {
    console.error("fetch archive funds error", error);
    return [];
  }
};

export const saveArchiveFunds = async (archiveId: string, funds: any[]) => {
  const prevFunds = await prisma.fund.findMany({
    where: {
      archive_id: archiveId,
    },
  });

  const newFunds = funds.filter((f) => !prevFunds.some((pf) => pf.code === f.code));

  await Promise.all(
    newFunds.map(async (f) => {
      const newFund = await prisma.fund.create({
        data: {
          archive_id: archiveId,
          code: f.code,
          title: f.title,
        },
      });

      await prisma.match.create({
        data: {
          resource_id: f.resourceId,
          archive_id: newFund.archive_id,
          fund_id: newFund.id,
          api_url: f.matchApiUrl,
          api_headers: null,
          api_params: "Limit:9999,Page:1",
        },
      });

      await prisma.fetch.create({
        data: {
          resource_id: f.resourceId,
          archive_id: newFund.archive_id,
          fund_id: newFund.id,
          api_url: f.fetchApiUrl,
          api_headers: null,
          api_params: "Limit:9999,Page:1",
        },
      });
    })
  );

  const removedFunds = prevFunds.filter((pf) => !funds.some((f) => f.code === pf.code));

  await Promise.all(
    removedFunds.map(async (f) => {
      await prisma.fund.delete({
        where: {
          id: f.id,
        },
      });

      await prisma.match.deleteMany({
        where: {
          fund_id: f.code,
        },
      });

      await prisma.fetch.deleteMany({
        where: {
          fund_id: f.code,
        },
      });
    })
  );

  return {
    total: prevFunds.length,
    added: newFunds.length,
    removed: removedFunds.length,
  };
};
