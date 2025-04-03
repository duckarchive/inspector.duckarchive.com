"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { PropsWithChildren, useEffect } from "react";
import useNoRussians from "@/hooks/useNoRussians";
import { DonationProvider } from "@/providers/donation";

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const ForeignUserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  useNoRussians();
  return children;
};

interface ProvidersProps {
  themeProps?: ThemeProviderProps;
}

export const Providers: React.FC<PropsWithChildren<ProvidersProps>> = ({ children, themeProps }) => {
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
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <DonationProvider>
          <ForeignUserProvider>{children}</ForeignUserProvider>
        </DonationProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
};
