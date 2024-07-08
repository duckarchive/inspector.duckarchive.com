import { PrismaClient, ResourceType, Prisma } from "@prisma/client";
import { parseCode, scrapping } from "../helpers";
import { HTMLElement } from "node-html-parser";

const prisma = new PrismaClient();

interface FetchStrategyParams {
  // prisma
  instance: Prisma.ModelName;

  // instance id
  archive_id: string;
  fund_id: string | null;
  description_id: string | null;
  case_id: string | null;

  // resource type
  resource: ResourceType;

  // scrapping params
  selector: string;
  responseKey?: string;

  // process scrapped data
  processScrappedData: (data: HTMLElement[]) => any[];

  // get previous items
  getPrevItems: () => Promise<any[]>;

  // save new items
  saveNewItems: (items: any[]) => Promise<any[]>;

  // default
  api_params?: string;
  api_url?: string;
}

export const fetchStrategy = async (params: FetchStrategyParams) => {
  // step 1: find fetch
  console.log(params.resource, "Step 1: Fetch started");
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: params.resource,
      },
      archive_id: params.archive_id,
      fund_id: params.fund_id,
      description_id: params.description_id,
      case_id: params.case_id,
    },
  });

  if (!fetch) {
    throw new Error("Fetch not found");
  }

  try {
    // step 2: scrapping by fetch
    console.log(params.resource, "Step 2: Scrapping", fetch.id);
    const parsed = await scrapping(fetch, {
      selector: params.selector,
      responseKey: params.responseKey,
    });

    // step 3: process scrapped data
    console.log(params.resource, "Step 3: Processing scrapped data", parsed.length);
    const scrappedItems = params.processScrappedData(parsed);

    // step 4: get previous items
    console.log(params.resource, "Step 4: Getting previous items");
    const prevItems = await params.getPrevItems();

    // step 5: compare with previous data
    console.log(params.resource, "Step 5: Comparing with previous data");
    // list of synced items that already exist in the database
    const existedItems = prevItems.filter((pi) => scrappedItems.some((si) => si.code === pi.code));
    // list of new items
    const newItems = scrappedItems.filter((si) => !existedItems.some((ei) => ei.code === si.code));

    // step 6: save new items
    console.log(params.resource, "Step 6: Saving new items", newItems.length);
    // save new funds to the database
    const savedItems = await params.saveNewItems(newItems);

    const items = [...existedItems, ...savedItems];

    // step 7: save matches and fetches
    console.log(params.resource, "Step 7: Saving matches and fetches");
    // list of matches to create
    const matchesToCreate = items.map((item) => ({
      resource_id: fetch.resource_id,
      api_url: `${new URL(fetch.api_url).origin}`,
      archive_id: params.archive_id,
      api_params: params.api_params,
      ...(params.instance === "Fund" && {
        fund_id: item.id,
      }),
      ...(params.instance === "Description" && {
        fund_id: params.fund_id,
        description_id: item.id,
      }),
      ...(params.instance === "Case" && {
        fund_id: params.fund_id,
        description_id: params.description_id,
        case_id: item.id,
      }),
    }));

    // save matches for synced funds
    await prisma.match.createMany({
      data: matchesToCreate,
      skipDuplicates: true,
    });

    // list of fetches to create
    const fetchesToCreate = items.map((item) => ({
      resource_id: fetch.resource_id,
      api_url: fetch.api_url,
      api_params: params.api_params,
      ...(params.instance === "Fund" && {
        fund_id: item.id,
      }),
      ...(params.instance === "Description" && {
        fund_id: params.fund_id,
        description_id: item.id,
      }),
      ...(params.instance === "Case" && {
        fund_id: params.fund_id,
        description_id: params.description_id,
        case_id: item.id,
      }),
    }));

    // save fetches for synced funds
    await prisma.fetch.createMany({
      data: fetchesToCreate,
      skipDuplicates: true,
    });

    // save results
    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: items.length,
      },
    });

    console.log(params.resource, "Fetch completed", fetch.id);
    return true;
  } catch (error) {
    console.error(params.resource, "Fetch failed", error);

    await prisma.fetchResult.create({
      data: {
        fetch_id: fetch.id,
        count: 0,
        error: error?.toString().slice(0, 200) || "Unknown error",
      },
    });

    return false;
  }
};
