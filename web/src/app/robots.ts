import type { MetadataRoute } from "next";

const SITE = "https://wiselista.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/capture/", "/share/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
