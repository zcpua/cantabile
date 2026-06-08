export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorksPageContent } from "@/app/_localized/directory-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localeAlternates, worksPath } from "@/i18n/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.pages.works.title,
    description: dictionary.pages.works.meta,
    alternates: {
      canonical: worksPath(locale),
      languages: localeAlternates(worksPath),
    },
  };
}

export default async function LocalizedWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <WorksPageContent locale={locale as Locale} />;
}
