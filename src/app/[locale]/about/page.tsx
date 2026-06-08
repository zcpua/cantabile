import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutPageContent } from "@/app/_localized/directory-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { aboutPath, localeAlternates } from "@/i18n/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.pages.about.title,
    description: dictionary.pages.about.meta,
    alternates: {
      canonical: aboutPath(locale),
      languages: localeAlternates(aboutPath),
    },
  };
}

export default async function LocalizedAboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <AboutPageContent locale={locale as Locale} />;
}
