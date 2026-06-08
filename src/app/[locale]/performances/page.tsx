export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PerformancesPageContent } from "@/app/_localized/directory-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localeAlternates, performancesPath } from "@/i18n/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.pages.performances.title,
    description: dictionary.pages.performances.meta,
    alternates: {
      canonical: performancesPath(locale),
      languages: localeAlternates(performancesPath),
    },
  };
}

export default async function LocalizedPerformancesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <PerformancesPageContent locale={locale as Locale} />;
}
