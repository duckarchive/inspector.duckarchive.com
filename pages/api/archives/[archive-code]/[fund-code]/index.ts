import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const archiveCode = req.query["archive-code"] as string;
  const fundCode = req.query["fund-code"] as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const fund = await prisma.fund.findFirst({
      where: {
        archive: {
          code: archiveCode,
        },
        code: fundCode,
      },
      select: {
        id: true,
        code: true,
        title: true,
        descriptions: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });
    if (fund) {
      res.json(fund);
    } else {
      res.status(404);
    }
  }
}
