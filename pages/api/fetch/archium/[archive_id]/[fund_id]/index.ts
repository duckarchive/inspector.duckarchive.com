import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parse } from "node-html-parser";
import { parseCode, parseDBParams, parseTitle } from "../../../../helpers";
import { chunk } from "lodash";

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

  try {
    const { data: View } = await axios.request({
      url: fetch.api_url,
      method: fetch.api_method || "GET",
      headers: parseDBParams(fetch.api_headers),
      params: parseDBParams(fetch.api_params),
    });

    const dom = parse(View);
    const BASE_URL = new URL(fetch.api_url).origin;
    const descriptions = [...dom.querySelectorAll(DOM_QUERY)].filter(Boolean).map((anchorEl) => {
      const title = parseTitle(anchorEl.innerText);
      const code = parseCode(title.replace(/опис/gi, ""));
      const href = anchorEl.getAttribute("href")?.trim();
      return {
        resourceId: fetch.resource_id,
        code,
        title,
        matchApiUrl: `${BASE_URL}/api/v1${href}`,
        fetchApiUrl: `${BASE_URL}${href}`,
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

    for (const chunk of newDescriptionsChunks) {
      console.log(
        `ARCHIUM: fetchFundDescriptions: newDescriptions progress (${++newDescriptionsCounter}/${
          newDescriptionsChunks.length
        })`
      );
      try {
        const newDescriptions = await prisma.description.createManyAndReturn({
          data: chunk.map((f) => ({
            code: f.code,
            title: f.title,
            fund_id: fundId,
          })),
          skipDuplicates: true,
        });

        await prisma.match.createMany({
          data: newDescriptions.map((newDescription, i) => ({
            resource_id: chunk[i].resourceId,
            archive_id: archiveId,
            fund_id: fundId,
            description_id: newDescription.id,
            api_url: chunk[i].matchApiUrl,
            api_params: "Limit:9999,Page:1",
          })),
        });

        await prisma.fetch.createMany({
          data: newDescriptions.map((newDescription, i) => ({
            resource_id: chunk[i].resourceId,
            archive_id: archiveId,
            fund_id: fundId,
            description_id: newDescription.id,
            api_url: chunk[i].fetchApiUrl,
            api_params: "Limit:9999,Page:1",
          })),
        });
      } catch (error) {
        console.error("ARCHIUM: fetchFundDescriptions: newDescriptions", error, { chunk });
      }
    }

    const removedDescriptions = prevDescriptions.filter((pd) => !descriptions.some((d) => d.code === pd.code));

    let removedDescriptionsCounter = 0;
    const removedDescriptionsChunks = chunk(removedDescriptions, 10);

    for (const chunk of removedDescriptionsChunks) {
      await Promise.all(
        chunk.map(async (d) => {
          console.log(
            `ARCHIUM: fetchFundDescriptions: removedDescriptions progress (${++removedDescriptionsCounter}/${
              removedDescriptions.length
            })`
          );
          try {
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

            await prisma.case.deleteMany({
              where: {
                description_id: d.code,
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
