import { PrismaClient, Archive } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Archive[]>) {
  // READ ALL DATA
  if (req.method === 'GET') {
    const tasks = await prisma.archive.findMany();
    res.json(tasks);
  } else {
    res.status(405);
  }
}