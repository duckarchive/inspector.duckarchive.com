"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { PropsWithChildren, useEffect } from "react";
import useNoRussians from "@/hooks/useNoRussians";
import { DonationProvider } from "@/providers/donation";
import { Toast } from "@heroui/react";
import { SessionProvider } from "next-auth/react";
import { SessionExpiryWatcher } from "@/components/session-expiry-watcher";
import { Session } from "next-auth";
import { NextIntlClientProvider } from "next-intl";
import { ContentTranslationProvider } from "@/providers/content-translation";

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
      <SessionExpiryWatcher />
      <NextThemesProvider defaultTheme="dark" attribute="class">
        <NextIntlClientProvider locale={i18nLocale} messages={i18nMessages} timeZone="UTC">
          <ContentTranslationProvider>
            <DonationProvider>
              <Toast.Provider />
              <ForeignUserProvider>{children}</ForeignUserProvider>
            </DonationProvider>
          </ContentTranslationProvider>
        </NextIntlClientProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
};
