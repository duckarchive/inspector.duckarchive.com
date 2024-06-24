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
  // READ ONE DATA
  if (req.method === "GET") {
    const description = await prisma.description.findFirst({
      where: {
        fund: {
          code: fundCode,
          archive: {
            code: archiveCode,
          },
        },
        code: descriptionCode,
      },
      select: {
        id: true,
        code: true,
        title: true,
        cases: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });
    if (description) {
      res.json(description);
    } else {
      res.status(404);
    }
  }
}
