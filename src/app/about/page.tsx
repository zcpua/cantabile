import type { Metadata } from "next";
import { AboutPageContent } from "@/app/_localized/directory-pages";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const dictionary = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dictionary.pages.about.title,
  description: dictionary.pages.about.meta,
};

export default function AboutPage() {
  return <AboutPageContent locale={defaultLocale} />;
}
