import { User } from "duck-inspector-schema";
import prisma from "./db";
import { NextApiRequest } from "next";

// ridni.org API key
const API_KEY = `API-89ef6011-a152-4296-y1b2-9bda6b0e49c5`;

export const isAuthorized = async (req: NextApiRequest) => {
  if (req.headers.authorization === `Bearer ${API_KEY}`) {
    return true;
  }
  return false;
};


interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

export const authorizeGoogle = async (req: NextApiRequest): Promise<User | false> => {
  if (req.headers.authorization) {
    try {
      // get the token from the header and verify it with https://www.googleapis.com/oauth2/v3/userinfo
      // if the token is valid, return user info
      // if the token is invalid, return false
      const token = req.headers.authorization.toString().split(" ")[1];
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const googleUserInfo: GoogleUserInfo = await response.json();
        const user = await prisma.user.findFirst({
          where: {
            id: googleUserInfo.sub,
          },
        });

        if (!user) {
          const newUser = await prisma.user.create({
            data: {
              id: googleUserInfo.sub,
              email: googleUserInfo.email,
            },
          });

          return newUser;
        } else {
          if (user?.is_banned) {
            return false;
          }

          return user;
        }
      }
    } catch (e) {
      return false;
    }
  }
  return false;
};

