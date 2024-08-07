import { Case, Match } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../../db";

export type GetCaseResponse = {
  title: Case["title"];
  matches: Match[]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetCaseResponse>) {
  const archiveCode = req.query["archive-code"] as string;
  const fundCode = req.query["fund-code"] as string;
  const descriptionCode = req.query["description-code"] as string;
  const caseCode = req.query["case-code"] as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const caseItem = await prisma.case.findFirst({
      where: {
        description: {
          code: descriptionCode,
          fund: {
            code: fundCode,
            archive: {
              code: archiveCode,
            },
          },
        },
        code: caseCode,
      }
    });
    if (caseItem) {
      const matches = await prisma.match.findMany({
        where: {
          case_id: caseItem.id,
          children_count: {
            gt: 0,
          },
        }
      });
      res.setHeader('Cache-Control', 'public, max-age=10800');
      res.json({
        title: caseItem.title,
        matches,
      });
    } else {
      res.status(404);
    }
  }
}
