import type { MetadataRoute } from "next";
import { getSitemapData, type SitemapData } from "@/sanity/lib/queries";

export const revalidate = 3600;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://headlinethread.co.in").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let data: SitemapData = { articles: [], categories: [] };
  try {
    data = await getSitemapData();
  } catch {}

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    ...data.categories.map((category) => ({
      url: `${siteUrl}/categories/${category.slug.current}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...data.articles.map((article) => ({
      url: `${siteUrl}/articles/${article.slug.current}`,
      lastModified: new Date(article.updatedAt || article.publishedAt || Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
