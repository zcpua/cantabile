export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleDetailPageContent } from "@/app/_localized/detail-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { articlePath, localeAlternates } from "@/i18n/routes";
import { getArticleBySlug } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticleBySlug(slug);

  if (!article) return { title: locale === "zh-CN" ? "专题未找到" : "Guide not found" };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: articlePath(locale, slug),
      languages: localeAlternates((item) => articlePath(item, slug)),
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
    },
  };
}

export default async function LocalizedArticleDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  return <ArticleDetailPageContent locale={locale as Locale} slug={slug} />;
}
