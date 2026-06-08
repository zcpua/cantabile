import type { MetadataRoute } from "next";
import { articles } from "@/data/articles";
import { composers } from "@/data/composers";
import { site } from "@/data/site";
import { works } from "@/data/works";
import { articlePath, composerPath, routes, workPath } from "@/lib/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [routes.home, routes.composers, routes.works, routes.performances, routes.articles, routes.about].map((path) => ({
    url: new URL(path, site.url).toString(),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === routes.home ? 1 : 0.8,
  }));

  const composerRoutes = composers.map((composer) => ({
    url: new URL(composerPath(composer.slug), site.url).toString(),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const workRoutes = works.map((work) => ({
    url: new URL(workPath(work.slug), site.url).toString(),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  const articleRoutes = articles.map((article) => ({
    url: new URL(articlePath(article.slug), site.url).toString(),
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...composerRoutes, ...workRoutes, ...articleRoutes];
}
