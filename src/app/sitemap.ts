import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://telemon.online";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/features`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/get-api-key`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/billing/success`, lastModified: new Date(), changeFrequency: "never", priority: 0.1 },
  ];
}
