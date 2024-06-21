import { PrismaClient, Resource } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resource[]>) {
  // READ ALL DATA
  if (req.method === 'GET') {
    const resources = await prisma.resource.findMany();
    res.json(resources);
  } else {
    res.status(405);
  }
}