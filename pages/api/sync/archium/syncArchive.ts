import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { parseDBParams } from "../../helpers";
import { parse } from "node-html-parser";
import { syncFund } from "./syncFund";
import { fetchFunds } from "./fetchFunds";

const DOM_QUERY = "div.single-data > p > a > span";
const DOM_PARSER = (el: string) => +el.split(" справ")[0].split(", ")[1];

const prisma = new PrismaClient();

export const syncArchive = async (
  resourceId: string
): Promise<FullSyncArchiumResponse> => {
  const match = await prisma.match.findFirst({
    where: {
      resource_id: resourceId,
      archive_id: {
        not: null,
      },
      fund_id: null,
      description_id: null,
      case_id: null,
    },
  });

  if (!match || !match.archive_id) {
    throw new Error("Match not found");
  }

  const { api_headers, api_method, api_params, api_url, archive_id } = match;

  const {
    data: { View },
  } = await axios.request({
    url: api_url,
    method: api_method || "GET",
    headers: parseDBParams(api_headers),
    params: parseDBParams(api_params),
  });

  const dom = parse(View);

  const count = [...dom.querySelectorAll(DOM_QUERY)]
    .map((el) => el.innerText)
    .map(DOM_PARSER)
    .filter(Boolean)
    .reduce((prev, el) => (prev += el), 0);

  const prevResult = await prisma.result.findFirst({
    where: {
      match_id: match.id,
      error: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const { created_at } = await prisma.result.create({
    data: {
      match_id: match.id,
      count,
      error: null,
    },
  });

  await prisma.archive.update({
    where: {
      id: archive_id,
    },
    data: {
      count,
    },
  });

  if (prevResult) {
    const diff = count - prevResult.count;

    if (diff) {
      const fundMatches = await prisma.match.findMany({
        where: {
          resource_id: resourceId,
          archive_id: archive_id,
          fund_id: {
            not: null,
          },
          description_id: null,
          case_id: null,
        },
      });

      const syncedFunds = await Promise.all(
        fundMatches.map((f) => syncFund(f, count))
      );

      const calculatedDiff = syncedFunds.reduce(
        (prev, el) => (prev += el.total),
        0
      );

      if (calculatedDiff !== count) {
        console.log("New fund added for archive", archive_id);

        const funds = await fetchFunds(resourceId);

        return {
          sync: {
            created_at,
            match_id: match.id,
            total: count,
            diff,
          },
          fetch: funds,
        };
      }
    }

    return {
      sync: {
        created_at,
        match_id: match.id,
        total: count,
        diff,
      },
    };
  }

  return {
    sync: {
      created_at,
      match_id: match.id,
      total: count,
      diff: 0,
    },
  };
};
