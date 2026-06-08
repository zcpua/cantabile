import type { Metadata } from "next";
import { ComposerDirectory } from "@/components/composer-directory";
import { PageShell } from "@/components/page-shell";
import { composers } from "@/data/composers";
import { getComposerWorkCount } from "@/lib/data";
import { uniqueComposerPeriods, uniqueCountries } from "@/lib/filters";

export const metadata: Metadata = {
  title: "作曲家",
  description: "浏览古典音乐作曲家，按时期、国家和关键词探索代表作品。",
};

export default function ComposersPage() {
  const workCounts = Object.fromEntries(composers.map((composer) => [composer.id, getComposerWorkCount(composer.id)]));

  return (
    <PageShell eyebrow="Composer Directory" title="作曲家" description="按音乐时期、国家和关键词筛选，快速找到你想认识的作曲家。">
      <ComposerDirectory composers={composers} workCounts={workCounts} periods={uniqueComposerPeriods(composers)} countries={uniqueCountries(composers)} />
    </PageShell>
  );
}
