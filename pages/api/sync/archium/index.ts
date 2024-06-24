import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "node-html-parser";
import axios from "axios";
import { parseDBParams } from "../../helpers";

const ARCHIUM_RESOURCES = [
  "5abef7c0-6b5b-43a5-9271-232b1e24266a",
  "3cc6ab5e-6bc3-4775-808b-d7e918687ec5",
  "58c8d14e-36a6-4ea4-8429-92688451d223",
  "d07f3552-19b7-4aaf-bb7a-c10888f6a95f",
  "c8a60530-c59c-4ef1-8860-7a364c462d26",
  "8b2e5d9a-4369-47c0-bb2b-eb2e8252009d",
  "ac4d6a76-4cdc-4382-ba7d-aeb42e9ef737",
  "b73cfbed-3dde-439f-9f7b-acb0e4b31b70",
  "4dca72d1-7be6-40d0-b1ae-9d51d1e976fe",
];

interface SyncArchiumResponse {
  match_id: string;
  total: number;
  diff: number;
}

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncArchiumResponse[]>
) {
  if (req.method === "GET") {
    const archiumMatches = await prisma.match.findMany({
      where: {
        resource_id: {
          in: ARCHIUM_RESOURCES,
        },
        archive_id: {
          not: null,
        },
      },
      include: {
        archive: true,
      },
    });

    const results: SyncArchiumResponse[] = await Promise.all(
      archiumMatches.map(
        async ({ id, api_url, api_method, api_headers, api_params }) => {
          try {
            const {
              data: { View },
            } = await axios.request({
              url: api_url,
              method: api_method || "GET",
              headers: parseDBParams(api_headers),
              params: parseDBParams(api_params),
            });

            const root = parse(View);

            const totalCases = [
              ...root.querySelectorAll("div.single-data > p > a > span"),
            ]
              .map((el) => el.innerText)
              .map((el) => +el.split(" справ")[0].split(", ")[1])
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

            await prisma.result.create({
              data: {
                match_id: id,
                count: totalCases,
                error: null,
              },
            });

            if (prevResult) {
              return {
                match_id: id,
                total: totalCases,
                diff: totalCases - prevResult.count,
              };

            }

            return {
              match_id: id,
              total: totalCases,
              diff: 0,
            };
          } catch (error: any) {
            console.error(error);
            return {
              match_id: id,
              total: 0,
              diff: 0,
            };
          }
        }
      )
    );

    res.json(results);
  } else {
    res.status(405);
  }
}
