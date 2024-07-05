import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { parseCode, parseTitle, scrapping, stringifyDBParams } from "../../../../helpers";
import { chunk } from "lodash";
import { fetchDescriptionCases } from "./[description_id]";

const prisma = new PrismaClient();

export type ArchiumFetchFundResponse = {
  total: number;
  added: number;
  removed: number;
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
          data: newDescriptionsCreated.map((newDescription, i) => ({
            resource_id: newDescriptionsChunk[i].resourceId,
            archive_id: archiveId,
            fund_id: fundId,
            description_id: newDescription.id,
            api_url: newDescriptionsChunk[i].matchApiUrl,
          })),
        });

        await prisma.fetch.createMany({
          data: newDescriptionsCreated.map((newDescription, i) => ({
            resource_id: newDescriptionsChunk[i].resourceId,
            archive_id: archiveId,
            fund_id: fundId,
            description_id: newDescription.id,
            api_url: newDescriptionsChunk[i].fetchApiUrl,
            api_params: stringifyDBParams({ Limit: 9999, Page: 1 }),
          })),
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

    const removedDescriptions = prevDescriptions.filter((pd) => !descriptions.some((d) => d.code === pd.code));

    let removedDescriptionsCounter = 0;
    const removedDescriptionsChunks = chunk(removedDescriptions, 10);

    for (const removedDescriptionsChunk of removedDescriptionsChunks) {
      await Promise.all(
        removedDescriptionsChunk.map(async (d) => {
          console.log(
            `ARCHIUM: fetchFundDescriptions: removedDescriptions progress (${++removedDescriptionsCounter}/${
              removedDescriptions.length
            })`
          );
          try {
            await prisma.case.deleteMany({
              where: {
                description_id: d.id,
              },
            });

            await prisma.match.deleteMany({
              where: {
                description_id: d.id,
              },
            });

            await prisma.fetch.deleteMany({
              where: {
                description_id: d.id,
              },
            });

            await prisma.description.delete({
              where: {
                id: d.id,
              },
            });
          } catch (error) {
            console.error("ARCHIUM: fetchFundDescriptions: removedDescriptions", error, { d });
          }
        })
      );
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
      removed: removedDescriptions.length,
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
      removed: 0,
    };
  }
};
