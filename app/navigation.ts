import type { _Translator } from "next-intl";

interface NavItem {
  label: string;
  path: string;
  is_authorized?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNav = (t: _Translator<Record<string, any>, "navigation">, isAdmin = false): NavItem[] => [
  {
    label: t("search"),
    path: "/search",
  },
  {
    label: t("archives"),
    path: "/archives",
  },
  {
    label: t("online-copy-search"),
    path: "/online-copy-search",
  },
  {
    label: t("catalog"),
    path: "/catalog",
  },
  {
    label: t("resources"),
    path: "/resources",
  },
  // Editor is uk-only and admin-gated; label is hardcoded (no i18n).
  ...(isAdmin ? [{ label: "Редактор", path: "/editor" }] : []),
];
