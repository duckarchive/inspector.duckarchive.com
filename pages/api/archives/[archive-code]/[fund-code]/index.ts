import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

export type GetFundResponse = Prisma.FundGetPayload<{
  include: {
    descriptions: {
      select: {
        id: true;
        code: true;
        title: true;
        matches: {
          select: {
            updated_at: true;
            children_count: true;
            resource_id: true;
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
  const isAuth = await isAuthorized(req);
  if (!isAuth) {
    return res.status(200).json({ code: "Тебе ж попросили, як людину – не парсити" } as any);
  }
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
                children_count: true,
                resource_id: true,
              },
            },
          },
        },
      },
    });
    if (fund) {
      res.json(fund);
    } else {
      res.status(404).end();
    }
  }
}
