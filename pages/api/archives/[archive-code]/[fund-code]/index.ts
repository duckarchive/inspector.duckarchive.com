import { Prisma, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export type GetFundResponse = Prisma.FundGetPayload<{
  include: {
    descriptions: {
      select: {
        id: true;
        code: true;
        title: true;
        matches: {
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
      };
    };
  };
}>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetFundResponse>
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
      include: {
        descriptions: {
          select: {
            id: true,
            code: true,
            title: true,
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
