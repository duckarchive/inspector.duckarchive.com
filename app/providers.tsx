"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { PropsWithChildren, useEffect } from "react";
import useNoRussians from "@/hooks/useNoRussians";
import { DonationProvider } from "@/providers/donation";
import { ToastProvider } from "@heroui/toast";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { NextIntlClientProvider } from "next-intl";

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const ForeignUserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  useNoRussians();
  return children;
};

interface ProvidersProps {
  session?: Session;
  i18nMessages: Record<string, unknown>;
  i18nLocale: string;
}

export const Providers: React.FC<PropsWithChildren<ProvidersProps>> = ({ children, session, i18nMessages, i18nLocale }) => {
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
    <SessionProvider session={session} refetchOnWindowFocus refetchInterval={5 * 60}>
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider defaultTheme="dark" attribute="class">
          <NextIntlClientProvider locale={i18nLocale} messages={i18nMessages} timeZone="UTC">
            <DonationProvider>
              <ToastProvider />
              <ForeignUserProvider>{children}</ForeignUserProvider>
            </DonationProvider>
          </NextIntlClientProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
};
