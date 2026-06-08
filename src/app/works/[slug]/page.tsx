export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { WorkDetailPageContent } from "@/app/_localized/detail-pages";
import { defaultLocale } from "@/i18n/config";
import { getWorkDetailData } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getWorkDetailData(slug);

  if (!data) return { title: "作品未找到" };

  const { work, composer } = data;

  return {
    title: `${work.titleCn} ${work.title} - ${composer?.nameCn ?? "古典音乐作品"}`,
    description: work.description,
    openGraph: {
      title: `${work.titleCn} ${work.title}`,
      description: work.description,
      type: "article",
    },
  };
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <WorkDetailPageContent locale={defaultLocale} slug={slug} />;
}
