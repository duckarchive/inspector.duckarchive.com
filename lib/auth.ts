import { NextApiRequest } from "next";

// ridni.org API key
const API_KEY = `API-89ef6011-a152-4296-y1b2-9bda6b0e49c5`;

export const isAuthorized = async (req: NextApiRequest) => {
  if (req.headers.authorization === `Bearer ${API_KEY}`) {
    return true;
  }
  return false;
};
