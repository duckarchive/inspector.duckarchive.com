"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

export const SessionExpiryWatcher: React.FC = () => {
  const { data } = useSession();
  const error = (data as { error?: string } | null)?.error;

  useEffect(() => {
    if (error === "AccessTokenExpired") {
      signOut();
    }
  }, [error]);

  return null;
};
