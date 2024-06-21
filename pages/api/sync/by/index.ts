import { Archive, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<(Archive & { total: number })[]>
) {
  // READ ALL DATA
  if (req.method === "GET") {
    const byMatchesForArchives = await prisma.match.findMany({
      where: {
        resource_id: "c6b5cb31-c81e-4d6f-bd07-204605b52029",
        archive_id: {
          not: null,
        },
      },
      include: {
        archive: true,
      },
    });

    const archivesWithTotals = await Promise.all(
      byMatchesForArchives.map(async ({ api_criteria, archive }) => {
        if (!archive) {
          throw new Error("Archive not found");
        }
        const { data } = await axios.get(`https://babynyar.org/api/archive/cases/?${api_criteria}`);

        return {
          ...archive,
          total: data.total,
        };
      })
    );

    res.json(archivesWithTotals);
  } else {
    res.status(405);
  }
}
