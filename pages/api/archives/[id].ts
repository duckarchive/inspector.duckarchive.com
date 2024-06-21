import { Archive, PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Archive>) {
  const taskId = req.query.id as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const archive = await prisma.archive.findFirst({
      where: { id: taskId },
    });
    if (archive) {
      res.json(archive);
    } else {
      res.status(404);
    }
  }
}