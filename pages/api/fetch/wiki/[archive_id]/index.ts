import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, scrapping, stringifyDBParams } from "../../../helpers";
import { fetchAllWikiPagesByPrefix } from "..";
import { chunk, setWith } from "lodash";
import { saveFundDescriptionsByCodes } from "./[fund_id]";
import { saveDescriptionCasesByCodes } from "./[fund_id]/[description_id]";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;

    const data = await fetchArchiveFunds(archiveId);

    res.status(200).json({ data });
  } else {
    res.status(405);
  }
}

const fetchArchiveFunds = async (archiveId: string) => {
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: ResourceType.WIKIPEDIA,
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
  const archivePages = await fetchAllWikiPagesByPrefix(fetch);

  const archiveTree: Record<string, Record<string, Record<string, {}>>> = {};

  archivePages.forEach((page) => {
    const parts = page.split("/").slice(1);
    if (parts.length && !["Д", "Р", "П"].includes(parts[0])) {
      setWith(archiveTree, parts, {}, Object);
    } else {
      console.log(`Skipping page: ${page}`);
    }
  });

  const fundsCodes = Object.keys(archiveTree);

  // const prevFunds = await prisma.fund.findMany({
  //   where: {
  //     archive_id: archiveId,
  //   },
  // });

  // const newFundsCodes = fundsCodes.filter((fc) => !prevFunds.some((pf) => pf.code === fc));

  const savedFunds = await saveArchiveFundsByCodes(fundsCodes, fetch);

  for (const [fundCode, fundFetch] of Object.entries(savedFunds)) {
    const descriptionsCodes = Object.keys(archiveTree[fundCode]);
    const savedDescriptions = await saveFundDescriptionsByCodes(descriptionsCodes, fundFetch);

    for (const [descriptionCode, descriptionFetch] of Object.entries(savedDescriptions)) {
      const casesCodes = Object.keys(archiveTree[fundCode][descriptionCode]);
      await saveDescriptionCasesByCodes(casesCodes, descriptionFetch);
    }
  }

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: fundsCodes.length,
    },
  });

  return archiveTree;
};

export const saveArchiveFundsByCodes = async (newFundsCodes: string[], fetch: Fetch) => {
  const result: Record<string, Fetch> = {};
  const { q } = parseDBParams(fetch.api_params);
  let newFundsCounter = 0;
  const newFundsCodesChunks = chunk(newFundsCodes, 25);
  for (const newFundsCodesChunk of newFundsCodesChunks) {
    try {
      const newFundsChunkWithTitle = await Promise.all(
        newFundsCodesChunk.map(async (fc) => {
          console.log(
            `WIKI: saveArchiveFundsByCodes: newFunds progress (${++newFundsCounter}/${newFundsCodes.length})`
          );
          const parsed = await scrapping(
            {
              ...fetch,
              api_params: stringifyDBParams({
                action: "parse",
                page: `${q}/${fc}`,
                props: "text",
                format: "json",
              }),
            },
            { selector: "#header_section_text", responseKey: "parse.text.*" }
          );
          const title = parsed[0].innerText.split(". ").slice(1).join(". ");
          return {
            code: parseCode(fc),
            title,
            archive_id: fetch.archive_id as string,
          };
        }, {})
      );

      const newFundsCreated = await prisma.fund.createManyAndReturn({
        data: newFundsChunkWithTitle,
        skipDuplicates: true,
      });

      await prisma.match.createMany({
        data: newFundsCreated.map((newFundCreated) => ({
          resource_id: fetch.resource_id,
          archive_id: fetch.archive_id,
          fund_id: newFundCreated.id,
          api_url: fetch.api_url,
        })),
      });

      const newFundsCreatedFetches = await prisma.fetch.createManyAndReturn({
        data: newFundsCreated.map((newFundCreated) => ({
          resource_id: fetch.resource_id,
          archive_id: fetch.archive_id,
          fund_id: newFundCreated.id,
          api_url: fetch.api_url,
          api_params: stringifyDBParams({ q: `${q}/${newFundCreated.code}` }),
        })),
      });

      newFundsCreatedFetches.forEach((newFundsCreatedFetch, i) => {
        const code = newFundsCodesChunk.find((f) => parseCode(f) === newFundsCreated[i].code) || "";
        result[code] = newFundsCreatedFetch;
      });
    } catch (error) {
      console.error("WIKI: saveArchiveFundsByCodes: newFunds", error, { newFundsCodesChunk });
    }
  }

  return result;
};

// const visited = new Set<string>();
// const crawl = async (page: string): Promise<void> => {
//   if (visited.has(page)) {
//     return;
//   }

//   visited.add(page);
//   console.log(`Visiting: ${page}`);

//   const content = await fetchPageContent(page);
//   if (content) {
//     console.log(`Content of ${page}:\n${content}\n`);
//   }

//   // Recursively fetch linked pages if needed
//   // const linkedPages = extractLinkedPages(content);
//   // for (const linkedPage of linkedPages) {
//   //     await crawl(linkedPage);
//   // }
// };
