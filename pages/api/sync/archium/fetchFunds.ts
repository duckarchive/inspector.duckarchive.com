import { PrismaClient, ResourceType } from "@prisma/client";
import axios from "axios";
import { parseDBParams } from "../../helpers";
import { parse } from "node-html-parser";

const DOM_QUERY = "table.fond-groups > tbody > tr";

const prisma = new PrismaClient();

export const fetchFunds = async (
  archiveId: string
): Promise<FetchArchiumResponse> => {
  const fetch = await prisma.fetch.findFirst({
    where: {
      resource: {
        type: ResourceType.ARCHIUM,
      },
      archive_id: archiveId,
      fund_id: null,
      description_id: null,
      case_id: null,
    },
  });

  if (!fetch || !fetch.archive_id) {
    throw new Error("Fetch not found");
  }

  const { api_headers, api_method, api_params, api_url } = fetch;

  const {
    data: { View },
  } = await axios.request({
    url: api_url,
    method: api_method || "GET",
    headers: parseDBParams(api_headers),
    params: parseDBParams(api_params),
  });

  const dom = parse(View);

  const BASE_URL = fetch.api_url.split("/api")[0];
  const funds = [...dom.querySelectorAll(DOM_QUERY)]
    .filter(Boolean)
    .map((el) => el.querySelectorAll("td"))
    .map(([code, title]) => ({
      code: code.innerText.trim(),
      title: title.innerText.trim().slice(0, 200),
      matchApiUrl: BASE_URL + title.querySelector("a")?.getAttribute("href")?.trim(),
    }));

  const prevFonds = await prisma.fund.findMany({
    where: {
      archive_id: fetch.archive_id,
    },
  });

  const newFunds = funds.filter(
    (f) => !prevFonds.some((pf) => pf.code === f.code)
  );

  await Promise.all(
    newFunds.map(async (f) => {
      if (fetch.archive_id) {
        const newFund = await prisma.fund.create({
          data: {
            archive_id: fetch.archive_id,
            code: f.code,
            title: f.title,
          },
        });

        await prisma.fetch.create({
          data: {
            resource_id: fetch.resource_id,
            archive_id: newFund.archive_id,
            fund_id: newFund.id,
            api_url: f.matchApiUrl,
            api_headers: null,
            api_params: "Limit:9999,Page:1",
          },
        });
      }
    })
  );

  const removedFunds = prevFonds.filter(
    (pf) => !funds.some((f) => f.code === pf.code)
  );

  await Promise.all(
    removedFunds.map(async (f) => {
      await prisma.fund.delete({
        where: {
          id: f.id,
        },
      });

      await prisma.fetch.deleteMany({
        where: {
          fund_id: f.code,
        },
      });
    })
  );


  return {
    created_at: new Date(),
    match_id: fetch.id,
    total: funds.length,
    added: newFunds.length,
    removed: removedFunds.length,
  };
};
