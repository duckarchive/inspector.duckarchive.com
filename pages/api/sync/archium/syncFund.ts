import { Match, PrismaClient } from "@prisma/client";
import axios from "axios";
import { parseDBParams } from "../../helpers";
import { parse } from "node-html-parser";
import { syncDescription } from "./syncDescription";

const DOM_QUERY =
  "div.main-content > div.container > div > div.right.text-right > a";
const DOM_PARSER = (el: string) => +el.split(" справ")[0].split(", ")[1];

const prisma = new PrismaClient();

export const syncFund = async (
  {
    id,
    api_url,
    api_method,
    api_headers,
    api_params,
    fund_id,
    archive_id,
    resource_id,
  }: Match,
  targetTotal: number
) => {
  if (!fund_id) {
    throw new Error("No fund_id");
  }

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
      match_id: id,
      error: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const { created_at } = await prisma.result.create({
    data: {
      match_id: id,
      count: count,
      error: null,
    },
  });

  await prisma.fund.update({
    where: {
      id: fund_id,
    },
    data: {
      count,
    },
  });

  if (prevResult) {
    const diff = count - prevResult.count;

    if (diff) {
      const descriptionMatches = await prisma.match.findMany({
        where: {
          resource_id,
          archive_id,
          fund_id,
          description_id: {
            not: null,
          },
          case_id: null,
        },
      });

      const syncedDescriptions = await Promise.all(
        descriptionMatches.map(syncDescription)
      );

      const calculatedDiff = syncedDescriptions.reduce(
        (prev, el) => (prev += el.total),
        0
      );

      if (calculatedDiff < targetTotal) {
        console.log("New description added for fund", fund_id);
      }
    }
    return {
      created_at,
      match_id: id,
      total: count,
      diff: diff,
    };
  }

  return {
    created_at,
    match_id: id,
    total: count,
    diff: 0,
  };
};
