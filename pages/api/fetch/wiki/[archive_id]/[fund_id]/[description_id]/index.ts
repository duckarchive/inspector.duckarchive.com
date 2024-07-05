import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, scrapping, stringifyDBParams } from "../../../../../helpers";
import { fetchAllWikiPagesByPrefix } from "../../..";
import { chunk, setWith } from "lodash";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;
    const fundId = req.query.fund_id as string;
    const descriptionId = req.query.description_id as string;

    const data = await fetchDescriptionCases(archiveId, fundId, descriptionId);

    res.status(200).json({ data });
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

  const casesCodes = Object.keys(descriptionTree);
  // const prevCases = await prisma.case.findMany({
  //   where: {
  //     description_id: descriptionId,
  //   },
  // });

  // const newCasesCodes = descriptionsCodes.filter((dc) => !prevCases.some((pd) => pd.code === dc));

  await saveDescriptionCasesByCodes(casesCodes, fetch);

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: casesCodes.length,
    },
  });

  return descriptionTree;
};

export const saveDescriptionCasesByCodes = async (newCasesCodes: string[], fetch: Fetch) => {
  const { q } = parseDBParams(fetch.api_params);
  let newCasesCounter = 0;
  const newCasesCodesChunks = chunk(newCasesCodes, 25);

  for (const newCasesCodesChunk of newCasesCodesChunks) {
    try {
      const newCasesChunkWithTitle = await Promise.all(
        newCasesCodesChunk.map(async (fc) => {
          console.log(`WIKI: saveDescriptionCasesByCodes: newCases progress (${++newCasesCounter}/${newCasesCodes.length})`);
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
            code: fc,
            title,
            description_id: fetch.description_id as string,
          };
        }, {})
      );

      const newCasesCreated = await prisma.case.createManyAndReturn({
        data: newCasesChunkWithTitle,
        skipDuplicates: true,
      });

      await prisma.match.createMany({
        data: newCasesCreated.map((newCaseCreated) => ({
          resource_id: fetch.resource_id,
          archive_id: fetch.archive_id,
          fund_id: fetch.fund_id,
          description_id: fetch.description_id,
          case_id: newCaseCreated.id,
          api_url: fetch.api_url,
        })),
      });
    } catch (error) {
      console.error("WIKI: saveDescriptionCasesByCodes: newCases", error, { newCasesCodesChunk });
    }
  }

  return true;
};
