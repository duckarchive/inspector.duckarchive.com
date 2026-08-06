"use client";

import { useEffect } from "react";

/**
 * Keeps <html lang> in sync on client-side locale switches. The root layout
 * (which owns the <html> tag) sits above the [locale] segment and never
 * re-renders on soft navigation, so its lang attribute goes stale otherwise.
 * useNoRussians watches this attribute via a MutationObserver.
 */
const LangSync: React.FC<{ locale: string }> = ({ locale }) => {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
};

export default LangSync;
