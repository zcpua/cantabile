import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PerformanceDirectory } from "@/components/performance-directory";
import { composers } from "@/data/composers";
import { performances } from "@/data/performances";
import { uniqueCities, uniqueVenues } from "@/lib/filters";

export const metadata: Metadata = {
  title: "近期演出",
  description: "查看近期古典音乐演出，按城市、日期、作曲家、场馆和关键词筛选。",
};

export default function PerformancesPage() {
  return (
    <PageShell eyebrow="Concert Calendar" title="近期演出" description="第一版使用精选样例数据，展示未来接入真实演出源后的浏览体验。">
      <PerformanceDirectory performances={performances} composers={composers} cities={uniqueCities(performances)} venues={uniqueVenues(performances)} />
    </PageShell>
  );
}
