import { getRequestConfig } from "next-intl/server";
// import { cookies } from "next/headers";

export const SUPPORTED_LOCALES = ["en", "uk"];

export default getRequestConfig(async () => {
  // const c = cookies();
  // const cookieLocale = c.get("NEXT_LOCALE")?.value || c.get("locale")?.value;
  const cookieLocale = "uk";

  const localeWithRegion = cookieLocale;
  const raw = localeWithRegion?.split("-")[0] || "uk";
  const locale = SUPPORTED_LOCALES.includes(raw) ? raw : "uk";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
