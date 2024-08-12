import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../../db";

export type GetDescriptionResponse = Prisma.DescriptionGetPayload<{
  include: {
    cases: {
      select: {
        id: true;
        code: true;
        title: true;
        matches: {
          select: {
            updated_at: true,
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
        cases: {
          select: {
            id: true,
            code: true,
            title: true,
            matches: {
              select: {
                updated_at: true,
                children_count: true,
                resource_id: true,
              }
            },
          },
        },
      },
    });
    if (description) {
      res.setHeader('Cache-Control', 'public, max-age=10800');
      res.json(description);
    } else {
      res.status(404);
    }
  }
}
