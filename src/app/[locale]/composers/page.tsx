export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComposersPageContent } from "@/app/_localized/directory-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { composersPath, localeAlternates } from "@/i18n/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.pages.composers.title,
    description: dictionary.pages.composers.meta,
    alternates: {
      canonical: composersPath(locale),
      languages: localeAlternates(composersPath),
    },
  };
}

export default async function LocalizedComposersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <ComposersPageContent locale={locale as Locale} />;
}
