import { NextApiRequest, NextApiResponse } from "next";
import { syncArchive } from "../../syncArchive";
import { Fund } from "@prisma/client";

export type ArchiumSyncFundResponse = Fund;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ArchiumSyncFundResponse>
) {
  const archiveId = req.query.archive_id as string;
  if (req.method === "GET") {
    const archiveSyncResult = await syncArchive(archiveId);

    res.json(archiveSyncResult);
  } else {
    res.status(405);
  }
}
