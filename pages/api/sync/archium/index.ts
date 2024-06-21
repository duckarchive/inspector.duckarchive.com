import { Archive, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "node-html-parser";
import axios from "axios";
import { parseDBParams } from "../../helpers";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<(Archive & { total: number })[]>
) {
  // READ ALL DATA
  if (req.method === "GET") {
    const archiumMatches = await prisma.match.findMany({
      where: {
        resource_id: {
          in: ["3cc6ab5e-6bc3-4775-808b-d7e918687ec5", "5abef7c0-6b5b-43a5-9271-232b1e24266a"]
        },
        archive_id: {
          not: null,
        },
      },
      include: {
        archive: true,
      },
    });

    const archivesWithTotals = await Promise.all(
      archiumMatches.map(async ({ archive, api_url, api_method, api_headers, api_params }) => {
        if (!archive) {
          throw new Error("Archive not found");
        }
        const {
          data: { View }
        } = await axios.request({
          url: api_url,
          method: api_method || "GET",
          headers: parseDBParams(api_headers),
          params: parseDBParams(api_params),
        });

        const root = parse(View);

        const totalCases = [
          ...root.querySelectorAll(
            "div.single-data > p > a > span"
          ),
        ]
          .map((el) => el.innerText)
          .map((el) => +el.split(" справ")[0].split(", ")[1])
          .filter(Boolean)
          .reduce((prev, el) => (prev += el), 0);

        return {
          ...archive,
          total: totalCases,
        };
      })
    );

    res.json(archivesWithTotals);
  } else {
    res.status(405);
  }
}
