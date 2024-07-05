import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, parseTitle, scrapping, stringifyDBParams } from "../../../../../helpers";
import { fetchAllWikiPagesByPrefix } from "../../..";
import { chunk, setWith } from "lodash";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;
    const fundId = req.query.fund_id as string;
    const descriptionId = req.query.description_id as string;

    const data = await fetchDescriptionCases(archiveId, fundId, descriptionId);

    res.status(200).json(data);
  } else {
    res.status(405);
  }
}

const fetchDescriptionCases = async (archiveId: string, fundId: string, descriptionId: string) => {
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: ResourceType.WIKIPEDIA,
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
  const casePages = await fetchAllWikiPagesByPrefix(fetch);

  const caseTree: Record<string, Record<string, Record<string, {}>>> = {};

  casePages.forEach((page) => {
    const parts = page
      .split("/")
      .slice(1)
      .map((p) => parseCode(p));
    if (parts.length && !["Д", "Р", "П"].includes(parts[0])) {
      setWith(caseTree, parts, {}, Object);
    } else {
      console.log(`Skipping page: ${page}`);
    }
  });

  const casesCodes = Object.keys(caseTree);

  await saveDescriptionCases(archiveId, fundId, descriptionId, casesCodes, fetch);

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: casesCodes.length,
    },
  });

  return caseTree;
};

export const saveDescriptionCases = async (
  archiveId: string,
  fundId: string,
  descriptionId: string,
  caseCodes: string[],
  fetch: Fetch
) => {
  const { q } = parseDBParams(fetch.api_params);
  const prevCases = await prisma.case.findMany({
    where: {
      description_id: descriptionId,
    },
  });

  // list of synced cases that already exist in the database
  const existedCases = prevCases.filter((caseItem) => caseCodes.some((code) => parseCode(code) === caseItem.code));

  // list of new case codes
  const newCaseCodes = caseCodes.filter((code) => !existedCases.some((prevCase) => prevCase.code === parseCode(code)));

  // extend with title from wiki
  const newCases = await Promise.all(
    newCaseCodes.map(async (fc) => {
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
        description_id: fetch.description_id as string,
      };
    })
  );

  // save new cases to the database
  const createdCases = await prisma.case.createManyAndReturn({
    data: newCases,
    skipDuplicates: true,
  });

  const cases = [...existedCases, ...createdCases];

  // list of matches to create
  const matchesToCreate = cases.map((caseItem) => {
    const rawCode = caseCodes.find((code) => parseCode(code) === caseItem.code);
    return {
      resource_id: fetch.resource_id,
      archive_id: archiveId,
      fund_id: fundId,
      description_id: descriptionId,
      case_id: caseItem.id,
      api_url: fetch.api_url,
      url: `https://uk.wikisource.org/wiki/${q}${rawCode ? `/${rawCode}` : ""}`,
    };
  });

  // save matches for synced cases
  await prisma.match.createMany({
    data: matchesToCreate,
  });

  return true;
};
