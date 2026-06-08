export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/app/_localized/home-page";
import { site } from "@/data/site";
import { isLocale, ogLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { homePath, localeAlternates } from "@/i18n/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);

  return {
    title: dictionary.site.name,
    description: dictionary.site.description,
    alternates: {
      canonical: homePath(locale),
      languages: localeAlternates(homePath),
    },
    openGraph: {
      title: dictionary.site.name,
      description: dictionary.site.description,
      url: new URL(homePath(locale), site.url).toString(),
      siteName: dictionary.site.name,
      type: "website",
      locale: ogLocale(locale),
    },
  };
}

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <HomePage locale={locale as Locale} />;
}
