import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { site } from "@/data/site";
import { locales } from "@/i18n/config";
import { aboutPath, articlePath, articlesPath, composerPath, composersPath, homePath, performancesPath, rootPath, workPath, worksPath } from "@/i18n/routes";
import { getSitemapData } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const { composers, works, articles } = await getSitemapData();
  const now = new Date();
  const rootRoute = {
    url: new URL(rootPath(), site.url).toString(),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 1,
  };

  const staticRoutes = locales.flatMap((locale) =>
    [homePath(locale), composersPath(locale), worksPath(locale), performancesPath(locale), articlesPath(locale), aboutPath(locale)].map((path) => ({
      url: new URL(path, site.url).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === homePath(locale) ? 0.95 : 0.8,
    })),
  );

  const composerRoutes = locales.flatMap((locale) => composers.map((composer) => ({
    url: new URL(composerPath(locale, composer.slug), site.url).toString(),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })));

  const workRoutes = locales.flatMap((locale) => works.map((work) => ({
    url: new URL(workPath(locale, work.slug), site.url).toString(),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  })));

  const articleRoutes = locales.flatMap((locale) => articles.map((article) => ({
    url: new URL(articlePath(locale, article.slug), site.url).toString(),
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })));

  return [rootRoute, ...staticRoutes, ...composerRoutes, ...workRoutes, ...articleRoutes];
}
