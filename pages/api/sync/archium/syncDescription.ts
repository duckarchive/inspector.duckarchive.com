import { Match, PrismaClient } from "@prisma/client";
import axios from "axios";
import { parseDBParams } from "../../helpers";
import { parse } from "node-html-parser";

const DOM_QUERY =
  "div.main-content > div.items-wrapper > div.container > div.loading-part > div.row > div.right > a";
const DOM_PARSER = (el: string) => +el.split(" справ")[0].split(", ")[1];

const prisma = new PrismaClient();

export const syncDescription = async ({
  id,
  api_url,
  api_method,
  api_headers,
  api_params,
  fund_id,
  description_id
}: Match) => {
  if (!description_id) {
    throw new Error("No description_id");
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

  const count = [...dom.querySelectorAll(DOM_QUERY)].filter(Boolean).length;

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

  await prisma.description.update({
    where: {
      id: description_id,
    },
    data: {
      count,
    },
  });

  if (prevResult) {
    const diff = count - prevResult.count;
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
