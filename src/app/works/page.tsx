import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { WorkDirectory } from "@/components/work-directory";
import { composers } from "@/data/composers";
import { works } from "@/data/works";
import { uniqueGenres, uniqueWorkPeriods } from "@/lib/filters";

export const metadata: Metadata = {
  title: "作品",
  description: "浏览古典音乐代表作品，按作曲家、体裁、时期和关键词筛选。",
};

export default function WorksPage() {
  return (
    <PageShell eyebrow="Works Catalogue" title="作品" description="从交响曲、协奏曲、钢琴小品到芭蕾音乐，建立自己的聆听路线。">
      <WorkDirectory works={works} composers={composers} genres={uniqueGenres(works)} periods={uniqueWorkPeriods(works)} />
    </PageShell>
  );
}
