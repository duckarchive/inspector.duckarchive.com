import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseDBParams } from "../../../helpers";
import { chunk } from "lodash";

const prisma = new PrismaClient();

export type ArchiumFetchArchiveResponse = {
  total: number;
  added: number;
  removed: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFetchArchiveResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;

      const result = await fetchArchiveFunds(archiveId);

      res.json(result);
    } catch (error) {
      console.error("ARCHIUM: Fetch archive handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const fetchArchiveFunds = async (archiveId: string) => {
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

  try {
    const {
      data: { View },
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

    const prevFunds = await prisma.fund.findMany({
      where: {
        archive_id: archiveId,
      },
    });

    const newFunds = funds.filter((f) => !prevFunds.some((pf) => pf.code === f.code));

    let newFundsCounter = 0;
    const newFundsChunks = chunk(newFunds, 100);

    for (const chunk of newFundsChunks) {
      console.log(`ARCHIUM: fetchArchiveFunds: newFunds progress (${++newFundsCounter}/${newFundsChunks.length})`);
      try {
        const newFunds = await prisma.fund.createManyAndReturn({
          data: chunk.map((f) => ({
            code: f.code,
            title: f.title,
            archive_id: archiveId,
          })),
          skipDuplicates: true,
        });

        await prisma.match.createMany({
          data: newFunds.map((newFund, i) => ({
            resource_id: chunk[i].resourceId,
            archive_id: archiveId,
            fund_id: newFund.id,
            api_url: chunk[i].matchApiUrl,
            api_params: "Limit:9999,Page:1",
          })),
        });

        await prisma.fetch.createMany({
          data: newFunds.map((newFund, i) => ({
            resource_id: chunk[i].resourceId,
            archive_id: archiveId,
            fund_id: newFund.id,
            api_url: chunk[i].fetchApiUrl,
            api_params: "Limit:9999,Page:1",
          })),
        });
      } catch (error) {
        console.error("ARCHIUM: fetchArchiveFunds: newFunds", error, { chunk });
      }
    }

    const removedFunds = prevFunds.filter((pf) => !funds.some((f) => f.code === pf.code));

    let removedFundsCounter = 0;
    const removedFundsChunks = chunk(removedFunds, 10);

    for (const chunk of removedFundsChunks) {
      await Promise.all(
        chunk.map(async (f) => {
          console.log(
            `ARCHIUM: fetchArchiveFunds: removedFunds progress (${++removedFundsCounter}/${removedFunds.length})`
          );
          try {
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
          } catch (error) {
            console.error("ARCHIUM: fetchArchiveFunds: removedFunds", error, { f });
          }
        })
      );
    }

    return {
      total: prevFunds.length,
      added: newFunds.length,
      removed: removedFunds.length,
    };
  } catch (error) {
    console.error("ARCHIUM: fetchArchiveFunds", error, { archiveId });

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: 0,
        error: error?.toString().slice(0, 200) || "Unknown error",
      },
    });

    return {
      total: 0,
      added: 0,
      removed: 0,
    };
  }
};
