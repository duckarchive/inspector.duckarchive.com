import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async () => {
  const h = headers();
  const cookieLocale = h.get("cookie")?.match(/NEXT_LOCALE=([^;]+)/)?.[1] || h.get("cookie")?.match(/locale=([^;]+)/)?.[1];
  const headerLocale = h.get("accept-language")?.split(",")[0];

  const localeWithRegion = cookieLocale || headerLocale;
  const locale = localeWithRegion?.split("-")[0] || "uk";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
