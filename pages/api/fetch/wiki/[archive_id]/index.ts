import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, scrapping, stringifyDBParams } from "../../../helpers";
import { fetchAllWikiPagesByPrefix } from "..";
import { chunk, set, setWith } from "lodash";

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
  const { q } = parseDBParams(fetch.api_params);
  const archivePages = await fetchAllWikiPagesByPrefix(fetch);

  const archiveTree: Record<string, Record<string, Record<string, {}>>> = {};

  archivePages.forEach((page) => {
    const parts = page
      .split("/")
      .slice(1)
      .map((p) => parseCode(p));
    if (parts.length && !["Д", "Р", "П"].includes(parts[0])) {
      setWith(archiveTree, parts, {}, Object);
    } else {
      console.log(`Skipping page: ${page}`);
    }
  });

  // await prisma.fetchResult.create({
  //   data: {
  //     fetch_id: fetch.id,
  //     count: archivePagesHash.funds.length,
  //   },
  // });

  const fundsCodes = Object.keys(archiveTree);

  const prevFunds = await prisma.fund.findMany({
    where: {
      archive_id: archiveId,
    },
  });

  const newFunds = fundsCodes.filter((fc) => !prevFunds.some((pf) => pf.code === fc));

  let newFundsCounter = 0;
  const newFundsChunks = chunk(newFunds, 100);

  for (const newFundsChunk of newFundsChunks) {
    console.log(`WIKI: fetchArchiveFunds: newFunds progress (${++newFundsCounter}/${newFundsChunks.length})`);
    try {
      const newFundsChunkWithTitle = await Promise.all(
        newFundsChunk.map(async (fc) => {
          const parsed = await scrapping(
            { ...fetch, api_params: `action:parse,page:${fc},props:text,format:json` },
            { selector: "#header_section_text" }
          );
          const title = parsed[0].innerText;
          return {
            code: fc,
            title,
            archive_id: archiveId,
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
          archive_id: archiveId,
          fund_id: newFundCreated.id,
          api_url: fetch.api_url,
        })),
      });

      await prisma.fetch.createMany({
        data: newFundsCreated.map((newFundCreated, i) => ({
          resource_id: fetch.resource_id,
          archive_id: archiveId,
          fund_id: newFundCreated.id,
          api_url: fetch.api_url,
          api_params: stringifyDBParams({ q: `${q}/${newFundCreated.code}` }),
        })),
      });

      // const newFundsCreatedChunks = chunk(newFundsCreated, 10);

      // for (const newFundCreatedChunk of newFundsCreatedChunks) {
      //   await Promise.all(
      //     newFundCreatedChunk.map(async (newFundCreated) => fetchFundDescriptions(archiveId, newFundCreated.id))
      //   );
      // }
    } catch (error) {
      console.error("WIKI: fetchArchiveFunds: newFunds", error, { newFundsChunk });
    }
  }

  return archiveTree;
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
