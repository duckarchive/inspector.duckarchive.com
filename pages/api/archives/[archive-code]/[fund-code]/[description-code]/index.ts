import { Prisma, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export type GetDescriptionResponse = Prisma.DescriptionGetPayload<{
  include: {
    matches: {
      where: {
        case_id: null;
      };
      select: {
        updated_at: true,
        last_count: true;
        children_count: true;
        resource: {
          select: {
            type: true;
          };
        };
      };
    };
    cases: {
      select: {
        id: true;
        code: true;
        title: true;
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
      include: {
        matches: {
          where: {
            case_id: null,
          },
          select: {
            updated_at: true,
            last_count: true,
            children_count: true,
            resource: {
              select: {
                type: true,
              },
            },
          }
        },
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
