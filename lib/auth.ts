import { User } from "duck-inspector-schema";
import prisma from "./db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export const isAuthorized = async () => {
  // const headersList = await headers();
  // const authorization = headersList.get('authorization')
  // if (authorization === `Bearer ${API_KEY}`) {
  //   return true;
  // }
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

export const authorizeGoogle = async (_req: NextRequest, validateAdmin?: boolean): Promise<User | false> => {
  const headersList = await headers();
  const authorization = headersList.get('authorization');
  if (authorization) {
    try {
      // get the token from the header and verify it with https://www.googleapis.com/oauth2/v3/userinfo
      // if the token is valid, return user info
      // if the token is invalid, return false
      const token = authorization.toString().split(" ")[1];
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

          if (validateAdmin && !user.is_admin) {
            return false;
          }

          return user;
        }
      }
    } catch (err) {
      console.error("Error authorizing user", err);
      return false;
    }
  }
  return false;
};
