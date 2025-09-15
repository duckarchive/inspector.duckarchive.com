export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "title",
  url: "https://inspector.duckarchive.com",
  description: "description",
  navItems: [
    {
      label: "inspector",
      children: [
        {
          label: "main",
          href: "https://inspector.duckarchive.com/",
        },
        {
          label: "search",
          href: "https://inspector.duckarchive.com/search",
        },
        {
          label: "archives",
          href: "https://inspector.duckarchive.com/archives",
        },
        {
          label: "resources",
          href: "https://inspector.duckarchive.com/resources",
        },
        {
          label: "daily-updates",
          href: "https://inspector.duckarchive.com/daily-updates",
        },
        {
          label: "stats",
          href: "https://inspector.duckarchive.com/stats",
        },
      ],
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
