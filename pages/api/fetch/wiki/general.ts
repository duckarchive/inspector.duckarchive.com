import { PrismaClient, ResourceType, Prisma, Fetch, Fund } from "@prisma/client";
import { parseCode, parseDBParams, parseTitle, scrapping, stringifyDBParams } from "../../helpers";
import { HTMLElement } from "node-html-parser";
import { fetchAllWikiPagesByPrefix } from ".";
import { chunk, setWith } from "lodash";
import { logger } from "../../logger";

const prisma = new PrismaClient();

interface Ids {
  archive_id: string;
  fund_id: string | null;
  description_id: string | null;
}

const resource = ResourceType.WIKIPEDIA;
const log = (message: any) => logger.log({ level: "info", label: `${resource}|FETCH`, message });

export const fetchWiki = async (ids: Ids) => {
  // step 1: find fetch
  log("Step 1: Started");
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
    log("Step 1: Failed: Fetch not found");
    throw new Error("Fetch not found");
  }

  try {
    // step 2: scrapping by fetch
    log(`Step 2: Scrapping ${fetch.id}`);
    const pages = await fetchAllWikiPagesByPrefix(fetch);

    const tree: Record<string, any> = {};

    pages.forEach((page) => {
      const parts = page.split("/").slice(1);
      if (parts.length && !["Д", "Р", "П"].includes(parts[0])) {
        setWith(tree, parts, {}, Object);
      } else {
        log(`Step 2: Ignored page: ${page}`);
      }
    });

    const codes = Object.keys(tree);

    log(`Step 3: Saving items of: ${pages[0]}`);
    await saveWiki(ids, codes, fetch, tree);

    return tree;
  } catch (error) {
    console.error(resource, "Fetch failed", error);

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

export const saveWiki = async (ids: Ids, codes: string[], fetch: Fetch, tree: Record<string, any>) => {
  const instanceType = ids.fund_id ? "Fund" : ids.description_id ? "Description" : "Case";
  const { q } = parseDBParams(fetch.api_params);
  const { archive_id, fund_id, description_id } = ids;

  interface Item {
    id?: string;
    code: string;
    title: string | null;
  }

  let prevItems: Item[] = [];
  if (fund_id && description_id) {
    // cases
    prevItems = await prisma.case.findMany({
      where: {
        description_id,
      },
    });
  } else if (fund_id) {
    // descriptions
    prevItems = await prisma.description.findMany({
      where: {
        fund_id,
      },
    });
  } else if (archive_id) {
    // funds
    prevItems = await prisma.fund.findMany({
      where: {
        archive_id,
      },
    });
  }

  // list of synced funds that already exist in the database
  const existedItems = prevItems.filter((pi) => codes.some((code) => parseCode(code) === pi.code));

  // list of new items codes
  const newCodes = codes.filter((code) => !existedItems.some((ei) => ei.code === parseCode(code)));

  log(`Step 4: ${instanceType}s count: ${newCodes.length}/${existedItems.length}`);

  // extend with title from wiki
  const newItems: Item[] = [];

  const newCodesChunks = chunk(newCodes, 50);
  let newCodesCounter = 0;
  for (const newCodesChunk of newCodesChunks) {
    log(`Step 5*: Fetching ${instanceType}s titles: ${++newCodesCounter}/${newCodesChunks.length}`);
    await Promise.all(
      newCodesChunk.map(async (fc) => {
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
        newItems.push({
          code,
          title,
        });
      })
    );
  }

  // save new funds to the database
  let createdItems: Item[] = [];
  if (fund_id && description_id) {
    // cases
    createdItems = await prisma.case.createManyAndReturn({
      data: newItems.map((item) => ({ ...item, description_id })),
      skipDuplicates: true,
    });
  } else if (fund_id) {
    // descriptions
    createdItems = await prisma.description.createManyAndReturn({
      data: newItems.map((item) => ({ ...item, fund_id })),
      skipDuplicates: true,
    });
  } else if (archive_id) {
    // funds
    createdItems = await prisma.fund.createManyAndReturn({
      data: newItems.map((item) => ({ ...item, archive_id })),
      skipDuplicates: true,
    });
  }

  const items = [...existedItems, ...createdItems];
  const itemIdToCodeMap: Record<string, string> = {};

  log(`Step 6: ${instanceType}s total: ${items.length}`);

  codes.forEach((code) => {
    const parsed = parseCode(code);
    const itemId = items.find((f) => f.code === parsed)?.id;
    itemIdToCodeMap[itemId || ""] = code;
  });

  let prevMatchesWhereConfig = {};
  if (fund_id && description_id) {
    // cases
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
    prevMatchesWhereConfig = {
      archive_id,
      fund_id,
      description_id: {
        not: null,
      },
      case_id: null,
    };
  } else if (archive_id) {
    // funds
    prevMatchesWhereConfig = {
      fund_id: {
        not: null,
      },
      description_id: null,
      case_id: null,
    };
  }
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
    api_url: fetch.api_url,
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
        api_params: stringifyDBParams({
          q: `${q}/${itemIdToCodeMap[item.id || ""]}`,
        }),
        url: `https://uk.wikisource.org/wiki/${q}/${itemIdToCodeMap[item.id || ""]}`,
      }),
  }));

  log(`Step 7: Saving ${instanceType}s matches: ${matchesToCreate.length}`);
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
      const code = itemIdToCodeMap[item.id || ""];
      return {
        resource_id: fetch.resource_id,
        archive_id,
        api_url: fetch.api_url,
        api_params: stringifyDBParams({ q: `${q}/${code}` }),
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

    log(`Step 8: Saving ${instanceType}s fetches: ${fetchesToCreate.length}`);
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

  log(`Step 9: ${instanceType}s fetches from db: ${itemFetches.length}`);

  for (const itemFetch of itemFetches) {
    const parent_id = itemFetch.case_id || itemFetch.description_id || itemFetch.fund_id;
    const code = itemIdToCodeMap[parent_id as string];
    const itemCodes = Object.keys(tree[code]);

    if (itemCodes.length) {
      log(`Step 10*: Saving items of: ${code}`);
      await saveWiki(
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
        itemCodes,
        itemFetch,
        tree[code]
      );
    }
  }

  log(`Step 11: Saving fetch result of ${fetch.id}`);
  await prisma.fetchResult.create({
    data: {
      fetch_id: fetch.id,
      count: items.length,
    },
  });

  return items.length;
};
