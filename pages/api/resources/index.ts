import { Resource } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../db";


export type GetAllResourcesResponse = (Resource & { _count: { matches: number } })[];

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetAllResourcesResponse>) {
  // READ ALL DATA
  if (req.method === "GET") {
    const resources = await prisma.resource.findMany({
      include: {
        _count: {
          select: {
            matches: {
              where: {
                case_id: {
                  not: null,
                },
                children_count: {
                  gt: 0,
                },
              },
            },
          },
        },
      },
    });
    res.setHeader('Cache-Control', 'public, max-age=864000');
    res.json(resources);
  } else {
    res.status(405);
  }
}
