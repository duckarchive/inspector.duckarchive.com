import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

const SUPPORTED_LOCALES = ["en", "uk"];

export default getRequestConfig(async () => {
  const h = headers();
  const cookieLocale = h.get("cookie")?.match(/NEXT_LOCALE=([^;]+)/)?.[1] || h.get("cookie")?.match(/locale=([^;]+)/)?.[1];
  const headerLocale = h.get("accept-language")?.split(",")[0];

  const localeWithRegion = cookieLocale || headerLocale;
  const raw = localeWithRegion?.split("-")[0] || "uk";
  const locale = SUPPORTED_LOCALES.includes(raw) ? raw : "uk";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
