import { Archive, PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const id = req.query.id as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const archive = await prisma.archive.findFirst({
      where: { id },
      select: {
        matches: {
          select: {
            id: true,
            resource: {
              select: { code: true, title: true },
            },
            archive: {
              select: { code: true },
            },
            fund: {
              select: { code: true },
            },
            description: {
              select: { code: true },
            },
            case: {
              select: { code: true },
            },
          },
        },
      },
    });
    if (archive) {
      res.json(archive);
    } else {
      res.status(404);
    }
  }
}
