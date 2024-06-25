import { NextApiRequest, NextApiResponse } from "next";
import { syncArchive } from "./syncArchive";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FullSyncArchiumResponse>
) {
  const resourceId = req.query.id as string;
  if (req.method === "GET") {
    const archiveSyncResult = await syncArchive(resourceId);

    res.json(archiveSyncResult);
  } else {
    res.status(405);
  }
}
