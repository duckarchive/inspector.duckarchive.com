import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/constants";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: SUPPORTED_LOCALES,

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed", // Ukrainian (default) doesn't get prefix, others get /en/, /es/, etc.

  // Locale resolution order: URL prefix → NEXT_LOCALE cookie → Accept-Language → uk.
  // next-intl's default cookie is session-only; a maxAge makes a chosen locale
  // survive browser restarts, so returning visitors skip re-detection.
  // DuckNav's SelectLocale writes the same cookie on manual switches
  // (soft navigations bypass the middleware's cookie sync).
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
  pathnames: {
    // Optional: Add custom path patterns for specific routes if needed
  },
});
