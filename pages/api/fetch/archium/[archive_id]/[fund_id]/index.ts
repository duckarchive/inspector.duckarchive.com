import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { parseCode, parseTitle, scrapping, stringifyDBParams } from "../../../../helpers";
import { chunk } from "lodash";
import { fetchDescriptionCases } from "./[description_id]";

const prisma = new PrismaClient();

export type ArchiumFetchFundResponse = {
  total: number;
  added: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFetchFundResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;

      const result = await fetchFundDescriptions(archiveId, fundId);

      res.json(result);
    } catch (error) {
      console.error("ARCHIUM: Fetch fund handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const fetchFundDescriptions = async (archiveId: string, fundId: string) => {
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

  try {
    const parsed = await scrapping(fetch, {
      selector: "div.container > div.row.with-border-bottom.thin-row > div.left > a",
    });
    const BASE_URL = new URL(fetch.api_url).origin;
    const descriptions = parsed.map((anchorEl) => {
      const title = parseTitle(anchorEl.innerText);
      const code = parseCode(title.replace(/опис/gi, ""));
      const href = `${BASE_URL}/api/v1${anchorEl.getAttribute("href")?.trim()}`;
      return {
        resourceId: fetch.resource_id,
        code,
        title,
        matchApiUrl: href,
        fetchApiUrl: href,
      };
    });

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: descriptions.length,
      },
    });

    const prevDescriptions = await prisma.description.findMany({
      where: {
        fund_id: fundId,
      },
    });

    const newDescriptions = descriptions.filter((f) => !prevDescriptions.some((pf) => pf.code === f.code));

    let newDescriptionsCounter = 0;
    const newDescriptionsChunks = chunk(newDescriptions, 100);

    for (const newDescriptionsChunk of newDescriptionsChunks) {
      console.log(
        `ARCHIUM: fetchFundDescriptions: newDescriptions progress (${++newDescriptionsCounter}/${
          newDescriptionsChunks.length
        })`
      );
      try {
        const newDescriptionsCreated = await prisma.description.createManyAndReturn({
          data: newDescriptionsChunk.map((f) => ({
            code: f.code,
            title: f.title,
            fund_id: fundId,
          })),
          skipDuplicates: true,
        });

        await prisma.match.createMany({
          data: newDescriptionsCreated.map((newDescription) => {
            const item = newDescriptionsChunk.find((d) => d.code === newDescription.code);
            return {
              resource_id: item?.resourceId || "",
              archive_id: archiveId,
              fund_id: fundId,
              description_id: newDescription.id,
              api_url: item?.matchApiUrl || "",
            };
          }),
        });

        await prisma.fetch.createMany({
          data: newDescriptionsCreated.map((newDescription) => {
            const item = newDescriptionsChunk.find((d) => d.code === newDescription.code);
            return {
              resource_id: item?.resourceId || "",
              archive_id: archiveId,
              fund_id: fundId,
              description_id: newDescription.id,
              api_url: item?.matchApiUrl || "",
              api_params: stringifyDBParams({ Limit: 9999, Page: 1 }),
            };
          }),
        });

        const newDescriptionsCreatedChunks = chunk(newDescriptionsCreated, 10);

        for (const newDescriptionCreatedChunk of newDescriptionsCreatedChunks) {
          await Promise.all(
            newDescriptionCreatedChunk.map(async (newDescriptionCreated) =>
              fetchDescriptionCases(archiveId, fundId, newDescriptionCreated.id)
            )
          );
        }
      } catch (error) {
        console.error("ARCHIUM: fetchFundDescriptions: newDescriptions", error, { newDescriptionsChunk });
      }
    }

    if (fetch.last_count !== descriptions.length) {
      await prisma.fetch.update({
        where: {
          id: fetch.id,
        },
        data: {
          last_count: descriptions.length,
        },
      });
    }

    return {
      total: descriptions.length,
      added: newDescriptions.length,
    };
  } catch (error) {
    console.error("ARCHIUM: fetchFundDescriptions", error, { archiveId, fundId });
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
    };
  }
};
