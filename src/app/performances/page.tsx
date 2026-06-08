export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PerformancesPageContent } from "@/app/_localized/directory-pages";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const dictionary = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dictionary.pages.performances.title,
  description: dictionary.pages.performances.meta,
};

export default async function PerformancesPage() {
  return <PerformancesPageContent locale={defaultLocale} />;
}
