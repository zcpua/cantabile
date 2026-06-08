export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlesPageContent } from "@/app/_localized/directory-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { articlesPath, localeAlternates } from "@/i18n/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.pages.articles.title,
    description: dictionary.pages.articles.meta,
    alternates: {
      canonical: articlesPath(locale),
      languages: localeAlternates(articlesPath),
    },
  };
}

export default async function LocalizedArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <ArticlesPageContent locale={locale as Locale} />;
}
