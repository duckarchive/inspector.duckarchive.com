import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { parseCode, parseTitle, scrapping } from "../../../../../helpers";
import { chunk } from "lodash";

const prisma = new PrismaClient();

export type ArchiumFetchDescriptionResponse = {
  total: number;
  added: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ArchiumFetchDescriptionResponse>) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;
      const descriptionId = req.query.description_id as string;

      const result = await fetchDescriptionCases(archiveId, fundId, descriptionId);

      res.json(result);
    } catch (error) {
      console.error("ARCHIUM: Fetch fund handler", error, req.query);
      res.status(500);
    }
  } else {
    res.status(405);
  }
}

export const fetchDescriptionCases = async (archiveId: string, fundId: string, descriptionId: string) => {
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      archive_id: archiveId,
      fund_id: fundId,
      description_id: descriptionId,
      case_id: null,
    },
  });

  if (!fetch) {
    throw new Error("Fetch not found");
  }

  try {
    const parsed = await scrapping(fetch, {
      selector: "div.row.with-border-bottom",
      responseKey: "View",
    });

    const BASE_URL = new URL(fetch.api_url).origin;
    const cases = parsed
      .map((el) => el.querySelectorAll("a"))
      .map(([codeEl, titleEl]) => {
        const code = parseCode(codeEl.innerText.replace(/справа/gi, ""));
        const title = parseTitle(titleEl.innerText);
        const href = `${BASE_URL}${codeEl.getAttribute("href")?.replace("files", "file-viewer").trim()}`;
        return {
          resourceId: fetch.resource_id,
          code,
          title,
          matchApiUrl: href,
        };
      });

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: cases.length,
      },
    });

    const prevCases = await prisma.case.findMany({
      where: {
        description_id: descriptionId,
      },
    });

    const newCases = cases.filter((f) => !prevCases.some((pf) => pf.code === f.code));

    let newCasesCounter = 0;
    const newCasesChunks = chunk(newCases, 100);

    for (const newCasesChunk of newCasesChunks) {
      console.log(`ARCHIUM: fetchDescriptionCases: newCases progress (${++newCasesCounter}/${newCasesChunks.length})`);
      try {
        const newCases = await prisma.case.createManyAndReturn({
          data: newCasesChunk.map((f) => ({
            code: f.code,
            title: f.title,
            description_id: descriptionId,
          })),
          skipDuplicates: true,
        });

        await prisma.match.createMany({
          data: newCases.map((newCase) => {
            const item = newCasesChunk.find((d) => d.code === newCase.code);
            return {
              resource_id: item?.resourceId || "",
              archive_id: archiveId,
              fund_id: fundId,
              description_id: descriptionId,
              case_id: newCase.id,
              api_url: item?.matchApiUrl || "",
              url: item?.matchApiUrl || "",
            };
          }),
        });
      } catch (error) {
        console.error("ARCHIUM: fetchDescriptionCases: newCases", error, { newCasesChunk });
      }
    }

    if (fetch.last_count !== cases.length) {
      await prisma.fetch.update({
        where: {
          id: fetch.id,
        },
        data: {
          last_count: cases.length,
        },
      });
    }

    return {
      total: cases.length,
      added: newCases.length,
    };
  } catch (error) {
    console.error("ARCHIUM: fetchDescriptionCases", error, { archiveId, fundId, descriptionId });
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
