"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useContentTranslation } from "@/providers/content-translation";

interface TranslatableTextProps {
  /** Catalog text in the original script. */
  children: string;
  className?: string;
}

/**
 * Swaps catalog text for a machine translation while translation is enabled,
 * and shows the original otherwise — one line either way, no layout shift.
 * The original stays reachable as the element's tooltip, since it is the
 * citable record and the translation is only a reading aid.
 */
const TranslatableText: React.FC<TranslatableTextProps> = ({ children, className }) => {
  const t = useTranslations("content-translation");
  const { status, translate } = useContentTranslation();
  const [translated, setTranslated] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "on" || !children.trim()) {
      setTranslated(null);
      return;
    }

    let isCurrent = true;
    translate(children)
      .then((result) => {
        if (isCurrent) setTranslated(result);
      })
      .catch(() => {
        if (isCurrent) setTranslated(null);
      });

    return () => {
      isCurrent = false;
    };
  }, [children, status, translate]);

  if (!translated) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={className} lang="en" title={`${t("original")}: ${children}`}>
      {translated}
    </span>
  );
};

export default TranslatableText;
