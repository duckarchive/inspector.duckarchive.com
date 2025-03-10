import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import Navbar from "@/components/navbar";
import GoogleAnalytics from "@/components/ga";
import { PropsWithChildren, Suspense } from "react";
import Loader from "@/components/loader";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    metadataBase: new URL(siteConfig.url || ""),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      images: "/og-image.jpg",
      type: "website",
      url: "/",
    },
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const RootLayout: React.FC<PropsWithChildren> = async ({ children }) => {
  const locale = await getLocale();
  const messages = await getMessages({ locale });

  return (
    <html suppressHydrationWarning lang={locale} className="overflow-y-hidden">
      <head />
      <GoogleAnalytics />
      <body className={clsx("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col h-screen">
            <NextIntlClientProvider locale={locale} messages={messages}>
              <Suspense fallback={<Loader />}>
                <Navbar />
                <main className="container mx-auto max-w-7xl pt-6 px-6 flex-grow flex flex-col">{children}</main>
              </Suspense>
            </NextIntlClientProvider>
          </div>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
