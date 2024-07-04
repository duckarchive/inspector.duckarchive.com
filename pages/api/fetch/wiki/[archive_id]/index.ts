import { Fetch, PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { parseDBParams, parseWikiPageTitle } from "../../../helpers";

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

  const archivePages = await fetchAllPages(fetch);

  const archivePagesHash: Record<string, string[]> = {
    funds: [],
    descriptions: [],
    cases: [],
    other: [],
  };

  archivePages.map((page) => {
    const parts = page.split("/").length;
    if (parts === 2) {
      archivePagesHash.funds.push(page);
    } else if (parts === 3) {
      archivePagesHash.descriptions.push(page);
    } else if (parts === 4) {
      archivePagesHash.cases.push(page);
    } else {
      archivePagesHash.other.push(page);
    }
  });

  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: archivePagesHash.funds.length,
    },
  });

  const prevFunds = await prisma.fund.findMany({
    where: {
      archive_id: archiveId,
    },
  });

  const newFunds = archivePagesHash.funds.filter(
    (f) => !prevFunds.some((pf) => pf.code === parseWikiPageTitle(f, "fund"))
  );

  return archivePagesHash;
};

const fetchAllPages = async ({ api_url, api_headers, api_method, api_params }: Fetch) => {
  const allPages: string[] = [];
  const fetchPages = async (offset: number = 0): Promise<void> => {
    try {
      const response = await axios.request<PrefixSearchResponse>({
        url: api_url,
        method: api_method || "GET",
        headers: parseDBParams(api_headers),
        params: {
          ...parseDBParams(api_params),
          psoffset: offset || undefined,
        },
      });
      const pages = response.data.query.prefixsearch.map((page) => page.title);
      allPages.push(...pages);

      if (response.data.continue) {
        await fetchPages(response.data.continue.psoffset);
      }
    } catch (error) {
      console.error(`Error fetching pages: ${error}`);
    }
  };

  await fetchPages();
  return allPages;
};

const BASE_URL = "https://uk.wikisource.org/w/api.php";
const START_CATEGORY = "Архів:ДАКрО";

interface PrefixSearchResponse {
  continue?: {
    psoffset: number;
    continue: string;
  };
  query: {
    prefixsearch: { title: string }[];
  };
}

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
