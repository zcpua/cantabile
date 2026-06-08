export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ComposersPageContent } from "@/app/_localized/directory-pages";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const dictionary = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dictionary.pages.composers.title,
  description: dictionary.pages.composers.meta,
};

export default async function ComposersPage() {
  return <ComposersPageContent locale={defaultLocale} />;
}
