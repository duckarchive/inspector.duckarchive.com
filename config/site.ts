export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "title",
  url: "https://inspector.duckarchive.com",
  description: "description",
  navItems: [
    {
      label: "search",
      href: "/search",
    },
    {
      label: "archives",
      href: "/archives",
    },
    // {
    //   label: "Джерела",
    //   href: "/resources",
    // },
    {
      label: "daily-updates",
      href: "/daily-updates",
    },
    {
      label: "stats",
      href: "/stats",
    },
    {
      label: "docs",
      href: "https://duckarchive.com/docs/inspector",
    },
  ],
  links: {
    telegram: "https://t.me/spravnakachka",
    sponsor: "https://donate.stripe.com/dR629v5uRcj42Qg8wx",
  },
};
