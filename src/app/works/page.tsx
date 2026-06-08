export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { WorksPageContent } from "@/app/_localized/directory-pages";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const dictionary = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dictionary.pages.works.title,
  description: dictionary.pages.works.meta,
};

export default async function WorksPage() {
  return <WorksPageContent locale={defaultLocale} />;
}
