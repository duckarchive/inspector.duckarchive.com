import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { DuckUser, fetchDuckUser, getDuckUser } from "@/lib/user";

/**
 * Resolve the current Duck user from the NextAuth session cookie.
 * Used for server-rendered pages where there is no Authorization header.
 */
export const getSessionDuckUser = async (): Promise<DuckUser | null> => {
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return null;
  }
  return fetchDuckUser(token);
};

/**
 * Resolve the current Duck user from either the Authorization header
 * (API/extension callers) or the NextAuth session cookie (browser UI).
 */
export const resolveDuckUser = async (): Promise<DuckUser | null> => {
  const headerUser = await getDuckUser();
  if (headerUser) {
    return headerUser;
  }
  return getSessionDuckUser();
};
