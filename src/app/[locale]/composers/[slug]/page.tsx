export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComposerDetailPageContent } from "@/app/_localized/detail-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { composerPath, localeAlternates } from "@/i18n/routes";
import { getComposerBySlug } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const composer = await getComposerBySlug(slug);

  if (!composer) return { title: locale === "zh-CN" ? "作曲家未找到" : "Composer not found" };

  return {
    title: locale === "zh-CN" ? `${composer.nameCn} ${composer.name} - 代表作、生平与近期演出` : `${composer.name} - Works, biography, and concerts`,
    description: composer.shortBio,
    alternates: {
      canonical: composerPath(locale, slug),
      languages: localeAlternates((item) => composerPath(item, slug)),
    },
    openGraph: {
      title: `${composer.nameCn} ${composer.name}`,
      description: composer.shortBio,
      type: "profile",
    },
  };
}

export default async function LocalizedComposerDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  return <ComposerDetailPageContent locale={locale as Locale} slug={slug} />;
}
