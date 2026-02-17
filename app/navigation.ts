import type { _Translator } from "next-intl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNav = (t: _Translator<Record<string, any>, "navigation">) => [
  {
    label: t("search"),
    path: "/search",
  },
  {
    label: t("archives"),
    path: "/archives",
  },
  {
    label: t("resources"),
    path: "/resources",
  },
  {
    label: t("daily-updates"),
    path: "/daily-updates",
  },
  {
    label: t("stats"),
    path: "/stats",
  },
];
