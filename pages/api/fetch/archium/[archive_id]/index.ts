import { NextApiRequest, NextApiResponse } from "next";
import { Prisma, PrismaClient, ResourceType } from "@prisma/client";
import { parseCode, parseTitle, scrapping, stringifyDBParams } from "../../../helpers";
import { chunk } from "lodash";
import { fetchFundDescriptions } from "./[fund_id]";
import { fetchStrategy } from "../../strategy";

const prisma = new PrismaClient();

export type ArchiumFetchArchiveResponse = {
  total: number;
  added: number;
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
  const result = await fetchStrategy({
    instance: Prisma.ModelName.Fund,
    resource: ResourceType.ARCHIUM,
    archive_id: archiveId,
    fund_id: null,
    description_id: null,
    case_id: null,
    selector: "table.fond-groups > tbody > tr",
    responseKey: "View",
    api_params: stringifyDBParams({
      Limit: 9999,
      Page: 1,
    }),
    processScrappedData: (data) =>
      data
        .map((el) => el.querySelectorAll("td"))
        .map(([code, title]) => ({
          code: parseCode(code.innerText),
          title: parseTitle(title.innerText),
          api_url: title.querySelector("a")?.getAttribute("href")?.trim(),
        })),
    getPrevItems: async () => {
      return prisma.fund.findMany({
        where: {
          archive_id: archiveId,
        },
      });
    },
    saveNewItems: async (items) => {
      return prisma.fund.createManyAndReturn({
        data: items.map((f) => ({
          code: f.code,
          title: f.title,
          archive_id: archiveId,
        })),
        skipDuplicates: true,
      });
    },
  });

  return {
    total: 0,
    added: 0
  };
};
