export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticlesPageContent } from "@/app/_localized/directory-pages";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const dictionary = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dictionary.pages.articles.title,
  description: dictionary.pages.articles.meta,
};

export default async function ArticlesPage() {
  return <ArticlesPageContent locale={defaultLocale} />;
}
