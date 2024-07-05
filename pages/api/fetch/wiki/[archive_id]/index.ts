import { Fetch, Fund, PrismaClient, ResourceType } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, parseTitle, promiseChunk, scrapping, stringifyDBParams } from "../../../helpers";
import { fetchAllWikiPagesByPrefix } from "..";
import { chunk, setWith } from "lodash";
import { saveFundDescriptions } from "./[fund_id]";
import { saveDescriptionCases } from "./[fund_id]/[description_id]";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;

    const data = await fetchArchiveFunds(archiveId);

    res.status(200).json(data);
  } else {
    res.status(405);
  }
}

export const fetchArchiveFunds = async (archiveId: string) => {
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
      console.log(`WIKI: fetchArchiveFunds: skipping page: ${page}`);
    }
  });

  const fundCodes = Object.keys(archiveTree);

  console.log(`WIKI: fetchArchiveFunds: saveArchiveFunds: ${archivePages[0]}`);
  const savedFunds = await saveArchiveFunds(archiveId, fundCodes, fetch);

  for (const [fundCode, fundFetch] of Object.entries(savedFunds)) {
    console.log(`WIKI: fetchArchiveFunds: saveFundDescriptions: ${fundCode}`);
    const descriptionsCodes = Object.keys(archiveTree[fundCode]);
    if (descriptionsCodes.length) {
      const savedDescriptions = await saveFundDescriptions(
        archiveId,
        fundFetch.fund_id as string,
        descriptionsCodes,
        fundFetch
      );

      for (const [descriptionCode, descriptionFetch] of Object.entries(savedDescriptions)) {
        console.log(`WIKI: fetchArchiveFunds: saveDescriptionCases: ${descriptionCode}`);
        const casesCodes = Object.keys(archiveTree[fundCode][descriptionCode]);
        if (casesCodes.length) {
          await saveDescriptionCases(
            archiveId,
            fundFetch.fund_id as string,
            descriptionFetch.description_id as string,
            casesCodes,
            descriptionFetch
          );
        }
      }
    }
  }

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: fundCodes.length,
    },
  });

  return archiveTree;
};

export const saveArchiveFunds = async (archiveId: string, fundCodes: string[], fetch: Fetch) => {
  const result: Record<string, Fetch> = {};
  const { q } = parseDBParams(fetch.api_params);
  const prevFunds = await prisma.fund.findMany({
    where: {
      archive_id: archiveId,
    },
  });

  // list of synced funds that already exist in the database
  const existedFunds = prevFunds.filter((fund) => fundCodes.some((code) => parseCode(code) === fund.code));

  // list of new fund codes
  const newFundCodes = fundCodes.filter((code) => !existedFunds.some((prevFund) => prevFund.code === parseCode(code)));

  // extend with title from wiki
  const newFunds: Pick<Fund, "code" | "title" | "archive_id">[] = [];

  const newFundCodesChunks = chunk(newFundCodes, 50);
  let newFundCodesCounter = 0;
  for (const newFundCodesChunk of newFundCodesChunks) {
    console.log(`saveArchiveFunds: fetching titles: ${++newFundCodesCounter}/${newFundCodesChunks.length}`);
    await Promise.all(
      newFundCodesChunk.map(async (fc) => {
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
        const code = parseCode(fc);
        const title = parseTitle(parsed[0]?.innerText.split(". ").slice(1).join(". "));
        newFunds.push({
          code,
          title,
          archive_id: fetch.archive_id as string,
        });
      })
    );
  }

  // save new funds to the database
  const createdFunds = await prisma.fund.createManyAndReturn({
    data: newFunds,
    skipDuplicates: true,
  });

  const funds = [...existedFunds, ...createdFunds];

  // list of matches to create
  const matchesToCreate = funds.map((fund) => ({
    resource_id: fetch.resource_id,
    archive_id: archiveId,
    fund_id: fund.id,
    api_url: fetch.api_url,
  }));

  // save matches for synced funds
  await prisma.match.createMany({
    data: matchesToCreate,
  });

  // list of fetches to create
  const fetchesToCreate = funds.map((fund) => {
    const code = fundCodes.find((f) => parseCode(f) === fund.code) || "";
    return {
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: fund.id,
      api_url: fetch.api_url,
      api_params: stringifyDBParams({ q: `${q}/${code}` }),
    };
  });

  // save fetches for synced funds
  const createdFetches = await prisma.fetch.createManyAndReturn({
    data: fetchesToCreate,
  });

  createdFetches.forEach((createdFetch, i) => {
    const code = fundCodes.find((f) => parseCode(f) === funds[i].code) || "";
    result[code] = createdFetch;
  });

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
