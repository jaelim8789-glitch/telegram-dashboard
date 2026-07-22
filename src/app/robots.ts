import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: ["/admin/", "/workspace/private/", "/api/"],
    },
    sitemap: "https://app.telemon.online/sitemap.xml",
  };
}
