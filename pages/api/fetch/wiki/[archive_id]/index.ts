import { NextApiRequest, NextApiResponse } from "next";
import { fetchWiki } from "..";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
  
      const data = await fetchWiki({
        archive_id: archiveId,
        fund_id: null,
        description_id: null,
      });
  
      res.status(200).json(data);
    } catch (error: Error | any) {
      res.status(500).json({ error: error?.message });
    }
  } else {
    res.status(405);
  }
}
