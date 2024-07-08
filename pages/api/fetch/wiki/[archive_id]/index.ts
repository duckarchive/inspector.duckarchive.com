import { Fetch, Fund, PrismaClient, ResourceType } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, parseTitle, scrapping, stringifyDBParams } from "../../../helpers";
import { fetchAllWikiPagesByPrefix } from "..";
import { chunk, setWith } from "lodash";
import { saveFundDescriptions } from "./[fund_id]";
import { saveDescriptionCases } from "./[fund_id]/[description_id]";
import { fetchWiki } from "../general";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
  
      const data = await fetchWiki({
        archive_id: archiveId,
        fund_id: null,
        description_id: null,
      });
  
      res.status(200).json(data);
    } catch (error: Error | any) {
      res.status(500).json({ error: error?.message });
    }
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
  const id2code = await saveArchiveFunds(archiveId, fundCodes, fetch);

  const fundFetches = await prisma.fetch.findMany({
    where: {
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: {
        not: null,
      },
      description_id: null,
      case_id: null,
    },
  });

  for (const fundFetch of fundFetches) {
    const fundCode = id2code[fundFetch.fund_id as string];
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

  // list of matches that already exist in the database
  const prevFundMatches = await prisma.match.findMany({
    where: {
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: {
        not: null,
      },
      description_id: null,
      case_id: null,
    },
  });

  // list of matches to create
  const matchesToCreate = funds
    .filter((fund) => !prevFundMatches.some((prevMatch) => prevMatch.fund_id === fund.id))
    .map((fund) => ({
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: fund.id,
      api_url: fetch.api_url,
    }));

  // save matches for synced funds
  await prisma.match.createMany({
    data: matchesToCreate,
  });

  // list of fetches that already exist in the database
  const prevFetches = await prisma.fetch.findMany({
    where: {
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: {
        not: null,
      },
      description_id: null,
      case_id: null,
    },
  });

  // list of fetches to create
  const fetchesToCreate = funds
    .filter((fund) => !prevFetches.some((prevFetch) => prevFetch.fund_id === fund.id))
    .map((fund) => {
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
  await prisma.fetch.createMany({
    data: fetchesToCreate,
  });

  const fundCodesMap: Record<string, string> = {};

  fundCodes.forEach((code) => {
    const parsed = parseCode(code);
    const fundId = funds.find((f) => f.code === parsed)?.id;
    fundCodesMap[fundId || ""] = code;
  });

  return fundCodesMap;
};
