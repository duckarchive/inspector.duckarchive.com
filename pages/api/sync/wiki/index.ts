import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const totalCount = await main();

    res.status(200).json({ count: totalCount || 0 });
  } else {
    res.status(405);
  }
}

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

const fetchAllPagesByPrefix = async (prefix: string): Promise<string[]> => {
  const allPages: string[] = [];

  const fetchPages = async (offset: number = 0): Promise<void> => {
      const url = `${BASE_URL}?action=query&list=prefixsearch&pssearch=${encodeURIComponent(prefix)}&pslimit=500&format=json&formatversion=2${offset ? `&psoffset=${offset}` : ''}`;
      try {
          const response = await axios.get<PrefixSearchResponse>(url);
          const pages = response.data.query.prefixsearch.map(page => page.title);
          allPages.push(...pages);

          if (response.data.continue) {
              await fetchPages(response.data.continue.psoffset);
          }
      } catch (error) {
          console.error(`Error fetching pages: ${error}`);
      }
  }

  await fetchPages();
  return allPages;
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

  const fetchPages = async (eicontinue: string = ''): Promise<void> => {
      const url = `${BASE_URL}?action=query&list=embeddedin&eititle=Template:${encodeURIComponent(templateName)}&eilimit=500&format=json&formatversion=2${eicontinue ? `&eicontinue=${eicontinue}` : ''}`;
      try {
          const response = await axios.get<EmbeddedInResponse>(url);
          const pages = response.data.query.embeddedin.map(page => page.title);
          allPages.push(...pages);

          if (response.data.continue) {
              await fetchPages(response.data.continue.eicontinue);
          }
      } catch (error) {
          console.error(`Error fetching pages: ${error}`);
      }
  }

  await fetchPages();
  return allPages;
}

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
}

const main = async () => {
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
  }
  // const pages = await fetchAllPagesByPrefix("Архів:ДАКрО");
  const pages = await fetchAllPagesByTemplate("Архіви/фонд");
  const suspected = pages.filter(page => page.split('/').length >= 3);
  for (const page of pages) {
    await crawl(page);
  }

  return visited.size;
};
