import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://telemon.online";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/admin/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
