import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../db";

export type GetArchivesOptionsResponse = {
  label: string;
  value: string;
}[];

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetArchivesOptionsResponse>) {
  // READ ALL DATA
  if (req.method === "GET") {
    const archives = await prisma.archive.findMany({
      select: {
        code: true,
        title: true,
      },
    });

    const options = archives.map((archive) => ({
      label: archive.title || archive.code,
      value: archive.code,
    }));

    res.json(options);
  } else {
    res.status(405);
  }
}
