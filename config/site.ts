export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Качиний Інспектор ― пошук справ українських архівів онлайн",
  url: "https://inspector.duckarchive.com",
  description:
    "Сервіс для пошуку справ українських архівів, що доступні онлайн. Введіть реквізити справи в просте вікно пошуку, та отримайте посилання на джерело.",
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
    sponsor: "https://donate.stripe.com/dR629v5uRcj42Qg8wx",
  },
};
