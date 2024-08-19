export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Інспектор",
  url: process.env.WEB_APP_URL,
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
