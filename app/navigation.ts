import type { _Translator } from "next-intl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNav = (t: _Translator<Record<string, any>, "navigation">) => [
  {
    label: t("online-copy-search"),
    path: "/online-copy-search",
  },
  {
    label: t("search"),
    path: "/search",
  },
  {
    label: t("resources"),
    path: "/resources",
  },
];
