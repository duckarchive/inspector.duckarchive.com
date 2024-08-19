import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

export type GetDescriptionResponse = Prisma.DescriptionGetPayload<{
  include: {
    cases: {
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
  res: NextApiResponse
) {
  const isAuth = await isAuthorized(req);
  if (!isAuth) {
    return res.status(200).json({ code: "Тебе ж попросили, як людину – не парсити" } as any);
  }
  const archiveCode = req.query["archive-code"] as string;
  const fundCode = req.query["fund-code"] as string;
  const descriptionCode = req.query["description-code"] as string;
  const page = parseInt(req.query["page"] as string) || 0;
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
      }
    });

    if (!description) {
      res.status(404).end();
      return;
    }

    const cases = await prisma.case.findMany({
      where: {
        description_id: description.id,
      },
      select: {
        id: true,
        code: true,
        title: true,
        matches: {
          select: {
            updated_at: true,
            children_count: true,
            resource_id: true,
          },
        },
      },
      skip: page * 10000,
      take: 10000,
    });
  
    res.json({
      ...description,
      cases,
    });
  }
}
