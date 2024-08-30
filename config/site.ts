export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Інспектор",
  url: "https://inspector.duckarchive.com",
  description: "Пошук справ українських архівів онлайн",
  navItems: [
    {
      label: "Архіви",
      href: "/archives",
    },
    {
      label: "Джерела",
      href: "/resources",
    },
    {
      label: "Статистика",
      href: "/stats",
    },
    {
      label: "Проєкти",
      href: "/universe",
    }
  ],
  links: {
    telegram: "https://t.me/spravnakachka",
  },
};
