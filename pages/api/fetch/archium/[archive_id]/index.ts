import { NextApiRequest, NextApiResponse } from "next";
import { fetchArchium } from "..";
import { initLog } from "../../../logger";

const logger = initLog("FETCH|ARCHIUM");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;

      logger.info(`Step 0: Fetching ${archiveId}`);
      const result = await fetchArchium({
        archive_id: archiveId,
        fund_id: null,
        description_id: null,
      });

      res.json(result);
    } catch (error: Error | any) {
      logger.error("Failed request", error);
      res.status(500).json({ error: error?.message });
    }
  } else {
    res.status(405);
  }
}
