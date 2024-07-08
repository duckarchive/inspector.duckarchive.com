import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { chunk } from "lodash";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { archiveCode, fundCode, descriptionCode, caseCode } = req.body;

    const query = {
      archiveCode,
      fundCode,
      descriptionCode,
      caseCode,
    };

    const matches =await prisma.match.findMany({
      where: {
        archive: {
          code: query.archiveCode,
        },
        fund: {
          code: query.fundCode,
        },
        description: {
          code: query.descriptionCode,
        },
        case: {
          code: query.caseCode,
        },
      },
      take: 10,
    });

    res.status(200).json(matches);
  } else {
    res.status(405);
  }
}