export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkDetailPageContent } from "@/app/_localized/detail-pages";
import { isLocale, type Locale } from "@/i18n/config";
import { localeAlternates, workPath } from "@/i18n/routes";
import { getWorkDetailData } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getWorkDetailData(slug);

  if (!data) return { title: locale === "zh-CN" ? "作品未找到" : "Work not found" };

  const { work, composer } = data;

  return {
    title: locale === "zh-CN" ? `${work.titleCn} ${work.title} - ${composer?.nameCn ?? "古典音乐作品"}` : `${work.title} - ${composer?.name ?? "Classical work"}`,
    description: work.description,
    alternates: {
      canonical: workPath(locale, slug),
      languages: localeAlternates((item) => workPath(item, slug)),
    },
    openGraph: {
      title: `${work.titleCn} ${work.title}`,
      description: work.description,
      type: "article",
    },
  };
}

export default async function LocalizedWorkDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  return <WorkDetailPageContent locale={locale as Locale} slug={slug} />;
}
