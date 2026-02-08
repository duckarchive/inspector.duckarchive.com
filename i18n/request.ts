import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["uk", "en", "es", "it", "pl", "ro", "cz"];
export const DEFAULT_LOCALE = "uk";

export default getRequestConfig(async () => {
  return {
    locale: DEFAULT_LOCALE,
    messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
  };
});
