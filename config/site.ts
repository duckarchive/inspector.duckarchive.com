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
      label: "Статистика",
      href: "/stats",
    },
    {
      label: "Про проєкт",
      href: "/docs",
    }
  ],
  links: {
    telegram: "https://t.me/spravnakachka",
  },
};
