import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, scrapping, stringifyDBParams } from "../../../../helpers";
import { fetchAllWikiPagesByPrefix } from "../..";
import { chunk, set, setWith } from "lodash";
import { saveDescriptionCasesByCodes } from "./[description_id]";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;
    const fundId = req.query.fund_id as string;

    const data = await fetchFundDescriptions(archiveId, fundId);

    res.status(200).json({ data });
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
  const fundPages = await fetchAllWikiPagesByPrefix(fetch);

  const fundTree: Record<string, Record<string, Record<string, {}>>> = {};

  fundPages.forEach((page) => {
    const parts = page
      .split("/")
      .slice(1)
      .map((p) => parseCode(p));
    if (parts.length && !["Д", "Р", "П"].includes(parts[0])) {
      setWith(fundTree, parts, {}, Object);
    } else {
      console.log(`Skipping page: ${page}`);
    }
  });

  const descriptionsCodes = Object.keys(fundTree);
  // const prevDescriptions = await prisma.description.findMany({
  //   where: {
  //     fund_id: fundId,
  //   },
  // });

  // const newDescriptionsCodes = descriptionsCodes.filter((dc) => !prevDescriptions.some((pd) => pd.code === dc));

  const savedDescriptions = await saveFundDescriptionsByCodes(descriptionsCodes, fetch);

  for (const [descriptionCode, descriptionFetch] of Object.entries(savedDescriptions)) {
    const cases = Object.keys(fundTree[descriptionCode]);
    await saveDescriptionCasesByCodes(cases, descriptionFetch);
  }

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: descriptionsCodes.length,
    },
  });

  return fundTree;
};

export const saveFundDescriptionsByCodes = async (newDescriptionsCodes: string[], fetch: Fetch) => {
  const result: Record<string, Fetch> = {};
  const { q } = parseDBParams(fetch.api_params);
  let newDescriptionsCounter = 0;
  const newDescriptionsCodesChunks = chunk(newDescriptionsCodes, 25);

  for (const newDescriptionsCodesChunk of newDescriptionsCodesChunks) {
    try {
      const newDescriptionsChunkWithTitle = await Promise.all(
        newDescriptionsCodesChunk.map(async (fc) => {
          console.log(
            `WIKI: saveFundDescriptionsByCodes: newDescriptions progress (${++newDescriptionsCounter}/${
              newDescriptionsCodes.length
            })`
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
            code: fc,
            title,
            fund_id: fetch.fund_id as string,
          };
        }, {})
      );

      const newDescriptionsCreated = await prisma.description.createManyAndReturn({
        data: newDescriptionsChunkWithTitle,
        skipDuplicates: true,
      });

      await prisma.match.createMany({
        data: newDescriptionsCreated.map((newDescriptionCreated) => ({
          resource_id: fetch.resource_id,
          archive_id: fetch.archive_id,
          fund_id: fetch.fund_id,
          description_id: newDescriptionCreated.id,
          api_url: fetch.api_url,
        })),
      });

      const newDescriptionsCreatedFetches = await prisma.fetch.createManyAndReturn({
        data: newDescriptionsCreated.map((newDescriptionCreated) => ({
          resource_id: fetch.resource_id,
          archive_id: fetch.archive_id,
          fund_id: fetch.fund_id,
          description_id: newDescriptionCreated.id,
          api_url: fetch.api_url,
          api_params: stringifyDBParams({ q: `${q}/${newDescriptionCreated.code}` }),
        })),
      });

      newDescriptionsCreatedFetches.forEach((newDescriptionsCreatedFetch, i) => {
        result[newDescriptionsCreated[i].code] = newDescriptionsCreatedFetch;
      });
    } catch (error) {
      console.error("WIKI: saveFundDescriptionsByCodes: newDescriptions", error, { newDescriptionsCodesChunk });
    }
  }

  return result;
};
