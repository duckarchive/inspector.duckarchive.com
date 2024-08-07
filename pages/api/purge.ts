import { purgeCache } from "@netlify/functions";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler (_req: NextApiRequest, res: NextApiResponse) {
  console.log("Purging everything");

  await purgeCache({
    token: process.env.NETLIFY_PERSONAL_TOKEN,
    siteID: process.env.NETLIFY_SITE_ID,
  });

  return res.status(200).json({ message: "Purged everything" });
};
