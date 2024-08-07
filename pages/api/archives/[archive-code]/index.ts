import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../db";

export type GetArchiveResponse = Prisma.ArchiveGetPayload<{
  include: {
    funds: {
      select: {
        id: true;
        code: true;
        title: true;
        matches: {
          select: {
            updated_at: true,
            last_count: true;
            children_count: true;
            resource_id: true;
          };
        };
      };
    };
  };
}>

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetArchiveResponse>
) {
  const archiveCode = req.query["archive-code"] as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const archive = await prisma.archive.findFirst({
      where: {
        code: archiveCode,
      },
      include: {
        funds: {
          select: {
            id: true,
            code: true,
            title: true,
            matches: {
              where: {
                description_id: null,
                case_id: null,
              },
              select: {
                updated_at: true,
                last_count: true,
                children_count: true,
                resource_id: true,
              }
            },
          },
        },
      }
    });
    if (archive) {
      res.setHeader('Cache-Control', 'public, max-age=10800');
      res.json(archive);
    } else {
      res.status(404);
    }
  }
}
