import { headers } from "next/headers";

export interface DuckUser {
  id: string;
  created_at: string;
  email: string;
  is_banned: boolean;
  is_premium: boolean;
  is_admin: boolean;
}

export const fetchDuckUser = async (token: string): Promise<DuckUser | null> => {
  try {
    const response = await fetch(`${process.env.DUCK_API_URL}/api/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (response.ok) {
      const user: DuckUser = await response.json();
      return user;
    }
  } catch (err) {
    console.error("Error fetching user", err);
  }
  return null;
};

export const getDuckUser = async () => {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  if (authorization) {
    const token = authorization.toString().split(" ")[1];
    return fetchDuckUser(token);
  }
  return null;
};