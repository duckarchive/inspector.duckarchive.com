import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getArchives } from "@/data/archives";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const archives = await getArchives();
  return [
    {
      url: `${siteConfig.url}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: `${siteConfig.url}/search`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: `${siteConfig.url}/archives`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.url}/stats`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/daily-updates`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...archives.map((archive) => ({
      url: `${siteConfig.url}/archives/${archive.code}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
