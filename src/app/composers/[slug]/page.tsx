export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ComposerDetailPageContent } from "@/app/_localized/detail-pages";
import { defaultLocale } from "@/i18n/config";
import { getComposerBySlug } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const composer = await getComposerBySlug(slug);

  if (!composer) return { title: "作曲家未找到" };

  return {
    title: `${composer.nameCn} ${composer.name} - 代表作、生平与近期演出`,
    description: composer.shortBio,
    openGraph: {
      title: `${composer.nameCn} ${composer.name}`,
      description: composer.shortBio,
      type: "profile",
    },
  };
}

export default async function ComposerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ComposerDetailPageContent locale={defaultLocale} slug={slug} />;
}
