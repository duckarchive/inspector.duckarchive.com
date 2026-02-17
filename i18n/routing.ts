import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/constants";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: SUPPORTED_LOCALES,

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed", // Ukrainian (default) doesn't get prefix, others get /en/, /es/, etc.
  pathnames: {
    // Optional: Add custom path patterns for specific routes if needed
  },
});
