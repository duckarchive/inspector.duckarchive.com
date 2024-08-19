export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Інспектор",
  url: "https://duck-inspector.vercel.app",
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
    }
  ],
  links: {
    telegram: "https://t.me/spravnakachka",
  },
};
