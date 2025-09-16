"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { PropsWithChildren, useEffect } from "react";
import useNoRussians from "@/hooks/useNoRussians";
import { DonationProvider } from "@/providers/donation";
import { ToastProvider } from "@heroui/toast";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const ForeignUserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  useNoRussians();
  return children;
};

interface ProvidersProps {
  themeProps?: ThemeProviderProps;
  session?: Session;
}

export const Providers: React.FC<PropsWithChildren<ProvidersProps>> = ({ children, themeProps, session }) => {
  const router = useRouter();
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registration successful with scope: ", registration.scope))
        .catch((err) => console.log("Service Worker registration failed: ", err));
    }
  }, []);

  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider {...themeProps}>
          <DonationProvider>
            <ToastProvider />
            <ForeignUserProvider>{children}</ForeignUserProvider>
          </DonationProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
};
