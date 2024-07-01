import { Prisma, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export type GetCaseResponse = Prisma.CaseGetPayload<{
  include: {
    matches: {
      where: {
        case_id: null;
      };
      select: {
        last_count: true;
        children_count: true;
        resource: {
          select: {
            type: true;
          };
        };
      };
    };
  };
}>;

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
      },
      include: {
        matches: {
          where: {
            case_id: null,
          },
          select: {
            last_count: true,
            children_count: true,
            resource: {
              select: {
                type: true,
              },
            },
          }
        },
      },
    });
    if (caseItem) {
      res.json(caseItem);
    } else {
      res.status(404);
    }
  }
}
