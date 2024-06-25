import { NextApiRequest, NextApiResponse } from "next";
import { syncArchive } from "./syncArchive";
import { Archive } from "@prisma/client";

export type ArchiumArchiveSyncResponse = Archive;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ArchiumArchiveSyncResponse>
) {
  const archiveId = req.query.archive_id as string;
  if (req.method === "GET") {
    const archiveSyncResult = await syncArchive(archiveId);

    res.json(archiveSyncResult);
  } else {
    res.status(405);
  }
}
