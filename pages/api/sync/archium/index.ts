import { Archive, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "node-html-parser";
import axios from "axios";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<(Archive & { total: number })[]>
) {
  // READ ALL DATA
  if (req.method === "GET") {
    const dakroArchiumMatches = await prisma.match.findMany({
      where: {
        resource_id: "f8af462b-2fd9-48e0-867c-41557d3bdbd2",
        archive_id: {
          not: null,
        },
      },
      include: {
        archive: true,
      },
    });

    const archivesWithTotals = await Promise.all(
      dakroArchiumMatches.map(async ({ archive }) => {
        if (!archive) {
          throw new Error("Archive not found");
        }
        const {
          data: { View }
        } = await axios.get(`http://archium.krop.archives.gov.ua/api/v1/fond-groups/?Limit=10&Page=1`);

        const root = parse(View);

        const dakroTotal = [
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
          total: dakroTotal,
        };
      })
    );

    res.json(archivesWithTotals);
  } else {
    res.status(405);
  }
}
