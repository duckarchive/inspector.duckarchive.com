import { NextApiRequest, NextApiResponse } from "next";
import { initLog } from "../../../../logger";
import { fetchArchium } from "../..";

const logger = initLog("FETCH|ARCHIUM");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const archiveId = req.query.archive_id as string;
      const fundId = req.query.fund_id as string;

      logger.info(`Step 0: Fetching ${archiveId}/${fundId}`);
      const result = await fetchArchium({
        archive_id: archiveId,
        fund_id: fundId,
        description_id: null,
      });

      res.json(result);
    } catch (error) {
      logger.error("Failed request", { error });
      res.status(500);
    }
  } else {
    res.status(405);
  }
}
