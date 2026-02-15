import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import GoogleAnalytics from "@/components/ga";
import { PropsWithChildren, Suspense } from "react";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { DuckLoader } from "@duckarchive/framework";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/i18n/constants";
import Book1Img from "@/public/images/book-1.png";
import Book2Img from "@/public/images/book-2.png";
import CameraImg from "@/public/images/camera.png";
import CertificateImg from "@/public/images/certificate.png";
import DocsImg from "@/public/images/docs.png";
import FeatherImg from "@/public/images/feather.png";
import LicenseImg from "@/public/images/license.png";
import NewspaperImg from "@/public/images/newspaper.png";
import OldImageImg from "@/public/images/old-image.png";
import PapirusImg from "@/public/images/papirus.png";
import PCImg from "@/public/images/pc.png";
import SandClockImg from "@/public/images/sandclock.png";

const bgImages = [
  Book1Img,
  Book2Img,
  CameraImg,
  CertificateImg,
  DocsImg,
  FeatherImg,
  LicenseImg,
  NewspaperImg,
  OldImageImg,
  PapirusImg,
  PCImg,
  SandClockImg,
];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  const baseUrl = siteConfig.url || "";

  // Generate hreflang links for all supported languages
  const hreflangs = SUPPORTED_LOCALES.map((loc) => ({
    hrefLang: loc,
    href: loc === DEFAULT_LOCALE ? baseUrl : `${baseUrl}/${loc}`,
  }));

  // Generate canonical URL
  let canonicalUrl = "/";
  if (locale && locale !== DEFAULT_LOCALE) {
    canonicalUrl = `/${locale}`;
  }

  return {
    metadataBase: new URL(baseUrl || ""),
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangs.reduce(
        (acc, hreflang) => {
          acc[hreflang.hrefLang] = hreflang.href;
          return acc;
        },
        {} as Record<string, string>,
      ),
    },
    openGraph: {
      images: "/og-image.jpg",
      type: "website",
      url: canonicalUrl,
    },
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
  };
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

  const bgImagesWithPositions = bgImages
    .map((img) => {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      return `url(${img.src}) ${x}% ${y}% no-repeat`;
    })
    .join(",");

  return (
    <html suppressHydrationWarning lang={locale} className="overflow-y-hidden">
      <head />
      <GoogleAnalytics />
      <body
        className={clsx("min-h-screen bg-background font-sans antialiased", fontSans.variable)}
        style={{
          background: bgImagesWithPositions,
          backgroundSize: "100px",
        }}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col h-screen overflow-y-scroll">
            <NextIntlClientProvider locale={locale} messages={messages}>
              <Suspense fallback={<DuckLoader />}>{children}</Suspense>
            </NextIntlClientProvider>
          </div>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
