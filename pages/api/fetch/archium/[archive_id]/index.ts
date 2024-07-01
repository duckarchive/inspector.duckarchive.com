import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { parseCode, parseTitle, scrapping } from "../../../helpers";
import { chunk } from "lodash";
import { fetchFundDescriptions } from "./[fund_id]";

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
    const parsed = await scrapping(fetch, {
      selector: "table.fond-groups > tbody > tr",
      responseKey: "View",
    });
    const BASE_URL = new URL(fetch.api_url).origin;
    const funds = parsed
      .map((el) => el.querySelectorAll("td"))
      .map(([code, title]) => ({
        resourceId: fetch.resource_id,
        code: parseCode(code.innerText),
        title: parseTitle(title.innerText),
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

    for (const newFundsChunk of newFundsChunks) {
      console.log(`ARCHIUM: fetchArchiveFunds: newFunds progress (${++newFundsCounter}/${newFundsChunks.length})`);
      try {
        const newFundsCreated = await prisma.fund.createManyAndReturn({
          data: newFundsChunk.map((f) => ({
            code: f.code,
            title: f.title,
            archive_id: archiveId,
          })),
          skipDuplicates: true,
        });

        await prisma.match.createMany({
          data: newFundsCreated.map((newFundCreated, i) => ({
            resource_id: newFundsChunk[i].resourceId,
            archive_id: archiveId,
            fund_id: newFundCreated.id,
            api_url: newFundsChunk[i].matchApiUrl,
            api_params: "Limit:9999,Page:1",
          })),
        });

        await prisma.fetch.createMany({
          data: newFundsCreated.map((newFundCreated, i) => ({
            resource_id: newFundsChunk[i].resourceId,
            archive_id: archiveId,
            fund_id: newFundCreated.id,
            api_url: newFundsChunk[i].fetchApiUrl,
            api_params: "Limit:9999,Page:1",
          })),
        });

        const newFundsCreatedChunks = chunk(newFundsCreated, 10);

        for (const newFundCreatedChunk of newFundsCreatedChunks) {
          await Promise.all(
            newFundCreatedChunk.map(async (newFundCreated) => fetchFundDescriptions(archiveId, newFundCreated.id))
          );
        }
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
            await prisma.description.deleteMany({
              where: {
                fund_id: f.id,
              },
            });

            await prisma.match.deleteMany({
              where: {
                fund_id: f.id,
              },
            });

            await prisma.fetch.deleteMany({
              where: {
                fund_id: f.id,
              },
            });

            await prisma.fund.delete({
              where: {
                id: f.id,
              },
            });
          } catch (error) {
            console.error("ARCHIUM: fetchArchiveFunds: removedFunds", error, { f });
          }
        })
      );
    }

    if (fetch.last_count !== funds.length) {
      await prisma.fetch.update({
        where: {
          id: fetch.id,
        },
        data: {
          last_count: funds.length,
        },
      });
    }

    return {
      total: funds.length,
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
