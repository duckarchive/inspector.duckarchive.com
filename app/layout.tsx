import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import Navbar from "@/components/navbar";
import GoogleAnalytics from "@/components/ga";
import PageViewTracker from "@/components/page-view-tracker";
import { Suspense } from "react";
import Loader from "@/components/loader";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url || ""),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    images: "/og-image.png",
    type: "website",
    url: "/",
  },
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="uk">
      <head />
      <GoogleAnalytics />
      <PageViewTracker />
      <body className={clsx("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col h-screen">
            <Suspense fallback={<Loader />}>
              <Navbar />
              <main className="container mx-auto max-w-7xl pt-6 px-6 flex-grow flex flex-col">{children}</main>
            </Suspense>
          </div>
        </Providers>
      </body>
    </html>
  );
}
