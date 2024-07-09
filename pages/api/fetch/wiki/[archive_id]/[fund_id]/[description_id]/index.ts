import { NextApiRequest, NextApiResponse } from "next";
import { fetchWiki } from "../../..";
import { initLog } from "../../../../../logger";

const logger = initLog("FETCH|WIKI");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {  
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;
      const descriptionId = req.query.description_id as string;
  
      logger.info(`Step 0: Fetching ${archiveId}/${fundId}/${descriptionId}`);
      const data = await fetchWiki({
        archive_id: archiveId,
        fund_id: fundId,
        description_id: descriptionId,
      });
  
      res.status(200).json(data);
    } catch (error: Error | any) {
      logger.error("Failed request", error);
      res.status(500).json({ error: error?.message });
    }
  } else {
    res.status(405);
  }
}
