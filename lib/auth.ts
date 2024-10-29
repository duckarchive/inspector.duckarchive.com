import { NextApiRequest } from "next";

// ridni.org API key
const API_KEY = `API-89ef6011-a152-4296-y1b2-9bda6b0e49c5`;

export const isAuthorized = async (req: NextApiRequest) => {
  if (req.headers.authorization === `Bearer ${API_KEY}`) {
    return true;
  }
  return false;
}

export const authorizeGoogle = async (req: NextApiRequest) => {
  if (req.headers.authorization) {
    try {
      // get the token from the header and verify it with https://www.googleapis.com/oauth2/v3/userinfo
      // if the token is valid, return user info
      // if the token is invalid, return false
      const token = req.headers.authorization.split(" ")[1];
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      return false;
    }
  }
  return false;
}