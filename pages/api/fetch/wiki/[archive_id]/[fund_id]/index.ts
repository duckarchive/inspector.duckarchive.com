import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, parseTitle, scrapping, stringifyDBParams } from "../../../../helpers";
import { fetchAllWikiPagesByPrefix } from "../..";
import { setWith } from "lodash";
import { saveDescriptionCases } from "./[description_id]";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;
    const fundId = req.query.fund_id as string;

    const data = await fetchFundDescriptions(archiveId, fundId);

    res.status(200).json(data);
  } else {
    res.status(405);
  }
}

const fetchFundDescriptions = async (archiveId: string, fundId: string) => {
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: ResourceType.WIKIPEDIA,
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
  const descriptionPages = await fetchAllWikiPagesByPrefix(fetch);

  const descriptionTree: Record<string, Record<string, Record<string, {}>>> = {};

  descriptionPages.forEach((page) => {
    const parts = page
      .split("/")
      .slice(1)
      .map((p) => parseCode(p));
    if (parts.length && !["Д", "Р", "П"].includes(parts[0])) {
      setWith(descriptionTree, parts, {}, Object);
    } else {
      console.log(`Skipping page: ${page}`);
    }
  });

  const descriptionsCodes = Object.keys(descriptionTree);

  const savedDescriptions = await saveFundDescriptions(archiveId, fundId, descriptionsCodes, fetch);

  for (const [descriptionCode, descriptionFetch] of Object.entries(savedDescriptions)) {
    const cases = Object.keys(descriptionTree[descriptionCode]);
    await saveDescriptionCases(archiveId, fundId, descriptionFetch.description_id as string, cases, descriptionFetch);
  }

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: descriptionsCodes.length,
    },
  });

  return descriptionTree;
};


export const saveFundDescriptions = async (archiveId: string, fundId: string, descriptionCodes: string[], fetch: Fetch) => {
  const result: Record<string, Fetch> = {};
  const { q } = parseDBParams(fetch.api_params);
  const prevDescriptions = await prisma.description.findMany({
    where: {
      fund_id: fundId,
    },
  });

  // list of synced descriptions that already exist in the database
  const existedDescriptions = prevDescriptions.filter((description) => descriptionCodes.some((code) => parseCode(code) === description.code));

  // list of new description codes
  const newDescriptionCodes = descriptionCodes.filter((code) => !existedDescriptions.some((prevDescription) => prevDescription.code === parseCode(code)));

  // extend with title from wiki
  const newDescriptions = await Promise.all(
    newDescriptionCodes.map(async (fc) => {
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
      const title = parseTitle(parsed[0].innerText.split(". ").slice(1).join(". "));
      return {
        code,
        title,
        fund_id: fetch.fund_id as string,
      };
    })
  );

  // save new descriptions to the database
  const createdDescriptions = await prisma.description.createManyAndReturn({
    data: newDescriptions,
    skipDuplicates: true,
  });

  const descriptions = [...existedDescriptions, ...createdDescriptions];

  // list of matches to create
  const matchesToCreate = descriptions.map((description) => ({
    resource_id: fetch.resource_id,
    archive_id: archiveId,
    fund_id: fundId,
    description_id: description.id,
    api_url: fetch.api_url,
  }));

  // save matches for synced descriptions
  await prisma.match.createMany({
    data: matchesToCreate,
  });

  // list of fetches to create
  const fetchesToCreate = descriptions.map((description) => {
    const code = descriptionCodes.find((f) => parseCode(f) === description.code) || "";
    return {
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: fundId,
      description_id: description.id,
      api_url: fetch.api_url,
      api_params: stringifyDBParams({ q: `${q}/${code}` }),
    };
  });

  // save fetches for synced descriptions
  const createdFetches = await prisma.fetch.createManyAndReturn({
    data: fetchesToCreate,
  });

  createdFetches.forEach((createdFetch, i) => {
    const code = descriptionCodes.find((f) => parseCode(f) === descriptions[i].code) || "";
    result[code] = createdFetch;
  });

  return result;
};
