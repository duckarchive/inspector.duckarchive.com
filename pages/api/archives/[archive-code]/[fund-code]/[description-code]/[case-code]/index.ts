import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const archiveCode = req.query["archive-code"] as string;
  const fundCode = req.query["fund-code"] as string;
  const descriptionCode = req.query["description-code"] as string;
  const caseCode = req.query["case-code"] as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const match = await prisma.match.findFirst({
      where: {
        archive: {
          code: archiveCode,
        },
        fund: {
          code: fundCode,
        },
        description: {
          code: descriptionCode,
        },
        case: {
          code: caseCode,
        },
      },
      select: {
        id: true,
        resource: {
          select: {
            code: true,
            title: true,
          },
        },
        archive: {
          select: { code: true },
        },
      },
    });
    if (match) {
      res.json(match);
    } else {
      res.status(404);
    }
  }
}
