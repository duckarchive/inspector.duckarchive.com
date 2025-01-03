export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Інспектор",
  url: "https://inspector.duckarchive.com",
  description: "Пошук справ українських архівів онлайн",
  navItems: [
    {
      label: "Пошук",
      href: "/search",
    },
    {
      label: "Архіви",
      href: "/archives",
    },
    // {
    //   label: "Джерела",
    //   href: "/resources",
    // },
    {
      label: "Звіт за день",
      href: "/daily-updates",
    },
    {
      label: "Статистика",
      href: "/stats",
    },
    {
      label: "Документація",
      href: "https://duckarchive.com/docs/inspector",
    },
  ],
  links: {
    telegram: "https://t.me/spravnakachka",
  },
};
