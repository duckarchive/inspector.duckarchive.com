export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Інспектор",
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
      label: "Продукти",
      href: "/duck-universe",
    },
  ],
  links: {
    docs: "https://nextui.org",
    telegram: "https://t.me/spravnakachka",
  },
};
