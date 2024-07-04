import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { parseCode, parseDBParams, parseWikiPageTitle } from "../../../helpers";
import { fetchAllWikiPagesByPrefix } from "..";
import { set } from "lodash";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const archiveId = req.query.archive_id as string;

    const data = await fetchArchive(archiveId);

    res.status(200).json({ data });
  } else {
    res.status(405);
  }
}

const fetchArchive = async (archiveId: string) => {
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

  const archivePagesHash = {};

  archivePages
    .forEach((page) => {
      const parts = page.split("/").map((p) => parseCode(p));
      set(archivePagesHash, [...parts, "code"], {});
      // if (parts === 2) {
      //   archivePagesHash.funds.push(parseWikiPageTitle(page, "fund"));
      // } else if (parts === 3) {
      //   archivePagesHash.descriptions.push(parseWikiPageTitle(page, "description"));
      // } else if (parts === 4) {
      //   archivePagesHash.cases.push(parseWikiPageTitle(page, "case"));
      // } else {
      //   archivePagesHash.other.push(page);
      // }
    });

  // await prisma.fetchResult.create({
  //   data: {
  //     fetch_id: fetch.id,
  //     count: archivePagesHash.funds.length,
  //   },
  // });

  // const prevFunds = await prisma.fund.findMany({
  //   where: {
  //     archive_id: archiveId,
  //   },
  // });

  // const newFunds = archivePagesHash.funds.filter(
  //   (f) => !prevFunds.some((pf) => pf.code === f)
  // );

  return archivePagesHash;
};

const BASE_URL = "https://uk.wikisource.org/w/api.php";
const START_CATEGORY = "Архів:ДАКрО";

interface EmbeddedInResponse {
  continue?: {
    eicontinue: string;
    continue: string;
  };
  query: {
    embeddedin: { title: string }[];
  };
}

const fetchAllPagesByTemplate = async (templateName: string): Promise<string[]> => {
  const allPages: string[] = [];

  const fetchPages = async (eicontinue: string = ""): Promise<void> => {
    const url = `${BASE_URL}?action=query&list=embeddedin&eititle=Template:${encodeURIComponent(
      templateName
    )}&eilimit=500&format=json&formatversion=2${eicontinue ? `&eicontinue=${eicontinue}` : ""}`;
    try {
      const response = await axios.get<EmbeddedInResponse>(url);
      const pages = response.data.query.embeddedin.map((page) => page.title);
      allPages.push(...pages);

      if (response.data.continue) {
        await fetchPages(response.data.continue.eicontinue);
      }
    } catch (error) {
      console.error(`Error fetching pages: ${error}`);
    }
  };

  await fetchPages();
  return allPages;
};

interface ParseResponse {
  parse: {
    text: {
      "*": string;
    };
  };
}

const fetchPageContent = async (page: string): Promise<string | null> => {
  const url = `${BASE_URL}?action=parse&page=${encodeURIComponent(page)}&format=json`;
  const response = await axios.get<ParseResponse>(url);
  return response.data.parse.text["*"];
};

const visited = new Set<string>();
const crawl = async (page: string): Promise<void> => {
  if (visited.has(page)) {
    return;
  }

  visited.add(page);
  console.log(`Visiting: ${page}`);

  const content = await fetchPageContent(page);
  if (content) {
    console.log(`Content of ${page}:\n${content}\n`);
  }

  // Recursively fetch linked pages if needed
  // const linkedPages = extractLinkedPages(content);
  // for (const linkedPage of linkedPages) {
  //     await crawl(linkedPage);
  // }
};
