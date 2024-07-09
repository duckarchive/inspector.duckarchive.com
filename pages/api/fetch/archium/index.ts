import { PrismaClient, ResourceType, Fetch } from "@prisma/client";
import { parseCode, parseTitle, scrapping, stringifyDBParams } from "../../helpers";
import { initLog } from "../../logger";
import { HTMLElement } from "node-html-parser";
// import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const resource = ResourceType.ARCHIUM;
const logger = initLog("FETCH|ARCHIUM");

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method === "GET") {
//     try {
//       const archiveFetches = await prisma.fetch.findMany({
//         where: {
//           resource: {
//             type: resource,
//           },
//           archive_id: {
//             not: null,
//           },
//           fund_id: null,
//           description_id: null,
//           case_id: null,
//         },
//       });
//       const result = [];

//       for (const fetch of archiveFetches) {
//         logger.info(`Step 0*: Fetching ${fetch.id}`);
//         const tree = await fetchWiki({
//           archive_id: fetch.archive_id as string,
//           fund_id: null,
//           description_id: null,
//         });

//         result.push(tree);
//       }

//       res.status(200).json(result);
//     } catch (error: Error | any) {
//       logger.error("Failed request", error);
//       res.status(500).json({ error: error?.message });
//     }
//   } else {
//     res.status(405);
//   }
// }

interface Ids {
  archive_id: string;
  fund_id: string | null;
  description_id: string | null;
}

export const fetchArchium = async (ids: Ids) => {
  // step 1: find fetch
  logger.info("Step 1: Started");
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: resource,
      },
      archive_id: ids.archive_id,
      fund_id: ids.fund_id,
      description_id: ids.description_id,
      case_id: null,
    },
  });

  if (!fetch) {
    throw new Error("Fetch not found");
  }

  try {
    const result = await saveArchium(ids, fetch);

    return result;
  } catch (error) {
    logger.error("Failed to fetch", { error });

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: 0,
        error: error?.toString().slice(0, 200) || "Unknown error",
      },
    });

    throw error;
  }
};

export const saveArchium = async (ids: Ids, fetch: Fetch) => {
  const { archive_id, fund_id, description_id } = ids;
  const BASE_URL = new URL(fetch.api_url).origin;
  // Limit:9999,Page:1,SortField:FondNumber,SortOrder:asc
  const DEFAULT_API_PARAMS = {
    Limit: 9999,
    Page: 1,
  };

  interface Item {
    id?: string;
    code: string;
    title: string | null;
    api_url?: string;
  }
  let instanceType = "";
  let scrappingParams;
  let html2item: (el: HTMLElement) => Item;
  let prevItems: Item[] = [];
  let prevMatchesWhereConfig = {};
  if (fund_id && description_id) {
    // cases
    instanceType = "case";
    scrappingParams = {
      selector: "div.row.with-border-bottom",
      responseKey: "View",
    };
    html2item = (el: HTMLElement) => {
      const [codeEl, titleEl] = el.querySelectorAll("a");
      const code = parseCode(codeEl.innerText.replace(/справа/gi, ""));
      const title = parseTitle(titleEl.innerText);
      const href = `${BASE_URL}${codeEl.getAttribute("href")?.replace("files", "file-viewer").trim()}`;
      return {
        code,
        title,
        api_url: href,
      };
    };
    prevItems = await prisma.case.findMany({
      where: {
        description_id,
      },
    });
    prevMatchesWhereConfig = {
      archive_id,
      fund_id,
      description_id,
      case_id: {
        not: null,
      },
    };
  } else if (fund_id) {
    // descriptions
    instanceType = "description";
    scrappingParams = {
      selector: "div.container > div.row.with-border-bottom.thin-row > div.left > a",
    };
    html2item = (el: HTMLElement) => {
      const title = parseTitle(el.innerText);
      const code = parseCode(title.replace(/опис/gi, ""));
      const href = `${BASE_URL}/api/v1${el.getAttribute("href")?.trim()}`;
      return {
        code,
        title,
        api_url: href,
      };
    };
    prevItems = await prisma.description.findMany({
      where: {
        fund_id,
      },
    });
    prevMatchesWhereConfig = {
      archive_id,
      fund_id,
      description_id: {
        not: null,
      },
      case_id: null,
    };
  } else {
    // funds
    instanceType = "fund";
    scrappingParams = {
      selector: "table.fond-groups > tbody > tr",
      responseKey: "View",
    };
    html2item = (el: HTMLElement) => {
      const [codeEl, titleEl] = el.querySelectorAll("td");
      const title = parseTitle(titleEl.innerText);
      const code = parseCode(codeEl.innerText);
      const href = `${BASE_URL}${titleEl.getAttribute("href")?.trim()}`;
      return {
        code,
        title,
        api_url: href,
      };
    };
    prevItems = await prisma.fund.findMany({
      where: {
        archive_id,
      },
    });
    prevMatchesWhereConfig = {
      fund_id: {
        not: null,
      },
      description_id: null,
      case_id: null,
    };
  }

  const parsed = await scrapping(fetch, scrappingParams);
  const scrappedItems = parsed.map(html2item);

  // list of synced items that already exist in the database
  const existedItems = prevItems.filter((pi) => scrappedItems.some((si) => si.code === pi.code));

  // list of new items codes
  const newItems = scrappedItems.filter((si) => !existedItems.some((ei) => ei.code === si.code));

  logger.info(`Step 4: ${instanceType}s count: ${newItems.length}/${existedItems.length}`);

  // save new funds to the database
  let createdItems: Item[] = [];
  if (fund_id && description_id) {
    // cases
    createdItems = await prisma.case.createManyAndReturn({
      data: newItems.map(({ api_url, ...item }) => ({ ...item, description_id })),
      skipDuplicates: true,
    });
  } else if (fund_id) {
    // descriptions
    createdItems = await prisma.description.createManyAndReturn({
      data: newItems.map(({ api_url, ...item }) => ({ ...item, fund_id })),
      skipDuplicates: true,
    });
  } else if (archive_id) {
    // funds
    createdItems = await prisma.fund.createManyAndReturn({
      data: newItems.map(({ api_url, ...item }) => ({ ...item, archive_id })),
      skipDuplicates: true,
    });
  }

  const items = [...existedItems, ...createdItems];
  // const itemIdToCodeMap: Record<string, string> = {};

  logger.info(`Step 6: ${instanceType}s total: ${items.length}`);

  // codes.forEach((code) => {
  //   const parsed = parseCode(code);
  //   const itemId = items.find((f) => f.code === parsed)?.id;
  //   itemIdToCodeMap[itemId || ""] = code;
  // });

  // list of matches that already exist in the database
  const prevMatches = await prisma.match.findMany({
    where: {
      resource_id: fetch.resource_id,
      archive_id,
      ...prevMatchesWhereConfig,
    },
  });

  let itemsWithExistedMatches: Item[] = [];

  if (fund_id && description_id) {
    // cases
    itemsWithExistedMatches = items.filter((item) => !prevMatches.some((prevMatch) => prevMatch.case_id === item.id));
  } else if (fund_id) {
    // descriptions
    itemsWithExistedMatches = items.filter(
      (item) => !prevMatches.some((prevMatch) => prevMatch.description_id === item.id)
    );
  } else {
    // funds
    itemsWithExistedMatches = items.filter((item) => !prevMatches.some((prevMatch) => prevMatch.fund_id === item.id));
  }

  // list of matches to create
  const matchesToCreate = itemsWithExistedMatches.map((item) => ({
    resource_id: fetch.resource_id,
    api_url: item.api_url || '',
    api_params: stringifyDBParams(DEFAULT_API_PARAMS),
    archive_id,
    // funds
    fund_id: item.id,
    // descriptions
    ...(fund_id && {
      fund_id: fund_id,
      description_id: item.id,
    }),
    // cases
    ...(fund_id &&
      description_id && {
        fund_id: fund_id,
        description_id: description_id,
        case_id: item.id,
        url: item.api_url,
      }),
  }));

  logger.info(`Step 7: Saving ${instanceType}s matches: ${matchesToCreate.length}`);
  // save matches for synced funds
  await prisma.match.createMany({
    data: matchesToCreate,
  });

  const prevFetchesWhereConfig = { ...prevMatchesWhereConfig };
  // not create fetches for cases
  if (!description_id) {
    // list of fetches that already exist in the database
    const prevFetches = await prisma.fetch.findMany({
      where: {
        resource_id: fetch.resource_id,
        archive_id,
        ...prevFetchesWhereConfig,
      },
    });

    let itemsWithExistedFetches: Item[] = [];

    if (fund_id && description_id) {
      // cases
      itemsWithExistedFetches = items.filter((item) => !prevFetches.some((prevMatch) => prevMatch.case_id === item.id));
    } else if (fund_id) {
      // descriptions
      itemsWithExistedFetches = items.filter(
        (item) => !prevFetches.some((prevMatch) => prevMatch.description_id === item.id)
      );
    } else {
      // funds
      itemsWithExistedFetches = items.filter((item) => !prevFetches.some((prevMatch) => prevMatch.fund_id === item.id));
    }

    // list of fetches to create
    const fetchesToCreate = itemsWithExistedFetches.map((item) => {
      return {
        resource_id: fetch.resource_id,
        api_url: item.api_url || '',
        api_params: stringifyDBParams(DEFAULT_API_PARAMS),
        archive_id,
        // funds
        fund_id: item.id,
        // descriptions
        ...(fund_id && {
          fund_id: fund_id,
          description_id: item.id,
        }),
        // cases
        ...(fund_id &&
          description_id && {
            fund_id: fund_id,
            description_id: description_id,
            case_id: item.id,
          }),
      };
    });

    logger.info(`Step 8: Saving ${instanceType}s fetches: ${fetchesToCreate.length}`);
    // save fetches for synced funds
    await prisma.fetch.createMany({
      data: fetchesToCreate,
    });
  }

  // list of updated fetches
  const itemFetches = await prisma.fetch.findMany({
    where: {
      resource_id: fetch.resource_id,
      archive_id,
      ...prevFetchesWhereConfig,
    },
  });

  logger.info(`Step 9: ${instanceType}s fetches from db: ${itemFetches.length}`);

  for (const itemFetch of itemFetches) {
    const parent_id = itemFetch.description_id || itemFetch.fund_id;
    if (parent_id) {
      logger.info(`Step 10*: Saving items of: ${parent_id}`);
      await saveArchium(
        {
          archive_id: archive_id,
          // funds
          fund_id: itemFetch.fund_id as string,
          description_id: null,
          // descriptions
          ...(fund_id && {
            fund_id: fund_id,
            description_id: itemFetch.description_id as string,
            case_id: null,
          }),
        },
        itemFetch,
      );
    }
  }

  logger.info(`Step 11: Saving fetch result of ${fetch.id}`);
  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: items.length,
    },
  });

  return items.length;
};
