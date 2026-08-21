import { siteConfig } from "@/config/site";

/**
 * schema.org structured data describing the public read-only JSON API, for AI
 * agents and other automated clients that parse application/ld+json rather
 * than (or in addition to) reading public/llms.txt. Rendered once in the root
 * layout via a <script type="application/ld+json"> tag.
 */
export const apiJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Duck Inspector Archive Catalog API",
  description:
    "Public, read-only JSON API for Ukrainian archival records (archive → fond → inventory → file), with links to scans hosted on other services.",
  url: siteConfig.url,
  isAccessibleForFree: true,
  creator: {
    "@type": "Organization",
    name: "Duck Inspector",
    url: siteConfig.url,
  },
  distribution: [
    {
      "@type": "DataDownload",
      name: "Search files",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/search`,
    },
    {
      "@type": "DataDownload",
      name: "List archives",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/archives`,
    },
    {
      "@type": "DataDownload",
      name: "Search authors",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/authors`,
    },
    {
      "@type": "DataDownload",
      name: "Get archive and its fonds",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/catalog/{archive-code}`,
    },
    {
      "@type": "DataDownload",
      name: "Get fond and its inventories",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/catalog/{archive-code}/{fond-code}`,
    },
    {
      "@type": "DataDownload",
      name: "Get inventory and its files",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/catalog/{archive-code}/{fond-code}/{inventory-code}`,
    },
    {
      "@type": "DataDownload",
      name: "Get a single file",
      encodingFormat: "application/json",
      contentUrl: `${siteConfig.url}/api/catalog/{archive-code}/{fond-code}/{inventory-code}/{file-code}`,
    },
  ],
  additionalProperty: [
    {
      "@type": "PropertyValue",
      name: "rateLimit",
      value: "5 requests per 10 seconds per client",
    },
    {
      "@type": "PropertyValue",
      name: "agentInstructions",
      value: `${siteConfig.url}/llms.txt`,
    },
  ],
};
