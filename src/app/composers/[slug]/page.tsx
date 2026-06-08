import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComposerCard } from "@/components/composer-card";
import { PageShell } from "@/components/page-shell";
import { PerformanceCard } from "@/components/performance-card";
import { SectionHeading } from "@/components/section-heading";
import { Timeline } from "@/components/timeline";
import { WorkCard } from "@/components/work-card";
import { composers } from "@/data/composers";
import { getComposerBySlug, getComposerWorkCount, getPerformancesForComposer, getRelatedComposers, getWorkById, getWorksByComposerId } from "@/lib/data";
import { formatYearRange } from "@/lib/format-date";

export function generateStaticParams() {
  return composers.map((composer) => ({ slug: composer.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const composer = getComposerBySlug(slug);

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
  const composer = getComposerBySlug(slug);

  if (!composer) notFound();

  const works = getWorksByComposerId(composer.id);
  const starterWorks = composer.starterWorkIds.map(getWorkById).filter((work) => work !== undefined);
  const performances = getPerformancesForComposer(composer.id);
  const related = getRelatedComposers(composer.id);

  return (
    <PageShell eyebrow={composer.period} title={composer.nameCn} description={composer.shortBio}>
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="cantabile-card h-fit">
          <div className="flex h-40 items-center justify-center rounded-3xl border border-gold/50 bg-gold/10 font-serif text-7xl text-burgundy">
            {composer.nameCn.slice(0, 1)}
          </div>
          <p className="mt-6 text-xl italic text-muted">{composer.name}</p>
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">生卒年</dt><dd className="font-medium text-ink">{formatYearRange(composer.birthYear, composer.deathYear)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">国家</dt><dd className="font-medium text-ink">{composer.country}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">代表作</dt><dd className="font-medium text-ink">{works.length} 首</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {composer.styleTags.map((tag) => <span key={tag} className="rounded-full bg-burgundy/10 px-3 py-1 text-xs text-burgundy">{tag}</span>)}
          </div>
        </aside>
        <div className="space-y-12">
          <section className="prose-cantabile rounded-[2rem] border border-border bg-white/60 p-6 sm:p-8">
            <h2 className="font-serif text-3xl font-semibold text-ink">简介</h2>
            <p>{composer.bio}</p>
          </section>
          <section>
            <SectionHeading eyebrow="Timeline" title="生平时间线" />
            <Timeline items={composer.timeline} />
          </section>
        </div>
      </div>

      <section className="mt-14">
        <SectionHeading eyebrow="Works" title="代表作品" description="从这些作品开始理解这位作曲家的声音。" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => <WorkCard key={work.id} work={work} composer={composer} />)}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading eyebrow="Starter Path" title="推荐聆听顺序" />
        <ol className="grid gap-4 md:grid-cols-3">
          {starterWorks.map((work, index) => (
            <li key={work.id} className="cantabile-card">
              <p className="eyebrow">No. {index + 1}</p>
              <Link className="mt-3 block font-serif text-2xl font-semibold text-ink hover:text-burgundy" href={`/works/${work.slug}`}>{work.titleCn}</Link>
              <p className="mt-3 text-sm leading-6 text-muted">{work.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {performances.length ? (
        <section className="mt-14">
          <SectionHeading eyebrow="Concerts" title="相关近期演出" />
          <div className="grid gap-5 lg:grid-cols-2">
            {performances.map((performance) => <PerformanceCard key={performance.id} performance={performance} />)}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-14">
          <SectionHeading eyebrow="Related" title="相似作曲家" />
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((item) => <ComposerCard key={item.id} composer={item} workCount={getComposerWorkCount(item.id)} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
