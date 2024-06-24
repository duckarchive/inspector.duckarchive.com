import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "node-html-parser";
import axios, { Axios, AxiosRequestConfig } from "axios";
import { parseDBParams } from "../../helpers";

interface SyncArchiumResponse {
  created_at: Date;
  match_id: string;
  total: number;
  diff: number;
  error?: string;
}

const prisma = new PrismaClient();

const syncFromArchium = async (
  resourceId: string,
  matchId: string,
  reqConfig: AxiosRequestConfig,
  domQuery: string,
  parser: (inp: string) => number,
  diffCb?: (...args: string[]) => Promise<any>
) => {
  const {
    data: { View },
  } = await axios.request(reqConfig);

  const dom = parse(View);

  const count = [...dom.querySelectorAll(domQuery)]
    .map((el) => el.innerText)
    .map(parser)
    .filter(Boolean)
    .reduce((prev, el) => (prev += el), 0);

  const prevResult = await prisma.result.findFirst({
    where: {
      match_id: matchId,
      error: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const { created_at } = await prisma.result.create({
    data: {
      match_id: matchId,
      count,
      error: null,
    },
  });

  if (prevResult) {
    const diff = count - prevResult.count;

    await diffCb?.(resourceId);

    return {
      created_at,
      match_id: matchId,
      total: count,
      diff,
    };
  }

  return {
    created_at,
    match_id: matchId,
    total: count,
    diff: 0,
  };
};

const syncArchive = async (resourceId: string): Promise<SyncArchiumResponse> => {
  const archiveMatch = await prisma.match.findFirst({
    where: {
      resource_id: resourceId,
      archive_id: {
        not: null,
      },
      fund_id: null,
      description_id: null,
      case_id: null,
    },
    include: {
      archive: true,
    },
  });

  if (!archiveMatch || !archiveMatch.archive_id) {
    throw new Error("Match not found");
  }

  return await syncFromArchium(
    resourceId,
    archiveMatch.id,
    {
      url: archiveMatch.api_url,
      method: archiveMatch.api_method || "GET",
      headers: parseDBParams(archiveMatch.api_headers),
      params: parseDBParams(archiveMatch.api_params),
    },
    "div.single-data > p > a > span",
    (el) => +el.split(" справ")[0].split(", ")[1],
    (...args) => syncFonds(args[0], archiveMatch.archive_id as string)
  );
};

const syncFonds = async (resourceId: string, archiveId: string) => {
  const fundMatches = await prisma.match.findMany({
    where: {
      resource_id: resourceId,
      archive_id: archiveId,
      fund_id: {
        not: null,
      },
      description_id: null,
      case_id: null,
    },
    include: {
      fund: true,
    },
  });

  return await Promise.all(
    fundMatches.map(
      async ({ id, api_url, api_method, api_headers, api_params, fund_id }) => {
        return syncFromArchium(
          resourceId,
          id,
          {
            url: api_url,
            method: api_method || "GET",
            headers: parseDBParams(api_headers),
            params: parseDBParams(api_params),
          },
          "div.single-data > p > a > span",
          (el) => +el.split(" справ")[0].split(", ")[1],
          (...args) => syncDescriptions(args[0], archiveId, fund_id as string)
        );
      }
    )
  );
};

const syncDescriptions = async (resourceId: string, archiveId: string, fundId: string) => {
  const descriptionMatches = await prisma.match.findMany({
    where: {
      resource_id: resourceId,
      archive_id: archiveId,
      fund_id: fundId,
      description_id: {
        not: null,
      },
      case_id: null,
    },
    include: {
      description: true,
    },
  });

  return await Promise.all(
    descriptionMatches.map(
      async ({ id, api_url, api_method, api_headers, api_params, description_id }) => {
        return syncFromArchium(
          resourceId,
          id,
          {
            url: api_url,
            method: api_method || "GET",
            headers: parseDBParams(api_headers),
            params: parseDBParams(api_params),
          },
          "div.single-data > p > a > span",
          (el) => +el.split(" справ")[0].split(", ")[1]
        );
      }
    )
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncArchiumResponse>
) {
  const resourceId = req.query.id as string;
  if (req.method === "GET") {
    const archiveSyncResult = await syncArchive(resourceId);

    res.json(archiveSyncResult);
    // const results: SyncArchiumResponse[] = await Promise.all(
    //   archiumMatches.map(
    //     async ({ id, api_url, api_method, api_headers, api_params }) => {
    //       try {
    //         const {
    //           data: { View },
    //         } = await axios.request({
    //           url: api_url,
    //           method: api_method || "GET",
    //           headers: parseDBParams(api_headers),
    //           params: parseDBParams(api_params),
    //         });

    //         const root = parse(View);

    //         const totalCases = [
    //           ...root.querySelectorAll("div.single-data > p > a > span"),
    //         ]
    //           .map((el) => el.innerText)
    //           .map((el) => +el.split(" справ")[0].split(", ")[1])
    //           .filter(Boolean)
    //           .reduce((prev, el) => (prev += el), 0);

    //         const prevResult = await prisma.result.findFirst({
    //           where: {
    //             match_id: id,
    //             error: null,
    //           },
    //           orderBy: {
    //             created_at: "desc",
    //           },
    //         });

    //         const { created_at } = await prisma.result.create({
    //           data: {
    //             match_id: id,
    //             count: totalCases,
    //             error: null,
    //           },
    //         });

    //         if (prevResult) {
    //           return {
    //             created_at,
    //             match_id: id,
    //             total: totalCases,
    //             diff: totalCases - prevResult.count,
    //           };

    //         }

    //         return {
    //           created_at,
    //           match_id: id,
    //           total: totalCases,
    //           diff: 0,
    //         };
    //       } catch (error: any) {
    //         console.error(error);

    //         const { created_at } = await prisma.result.create({
    //           data: {
    //             match_id: id,
    //             count: 0,
    //             error: error.message,
    //           },
    //         });

    //         return {
    //           created_at,
    //           match_id: id,
    //           total: 0,
    //           diff: 0,
    //           error: error.message,
    //         };
    //       }
    //     }
    //   )
    // );
  } else {
    res.status(405);
  }
}
