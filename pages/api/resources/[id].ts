import { Resource } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resource>) {
  const resourceId = req.query.id as string;
  // READ ONE DATA
  if (req.method === "GET") {
    const resource = await prisma.resource.findFirst({
      where: { id: resourceId },
    });
    if (resource) {
      res.json(resource);
    } else {
      res.status(404);
    }
  }
}