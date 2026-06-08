export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticleDetailPageContent } from "@/app/_localized/detail-pages";
import { defaultLocale } from "@/i18n/config";
import { getArticleBySlug } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) return { title: "专题未找到" };

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ArticleDetailPageContent locale={defaultLocale} slug={slug} />;
}
