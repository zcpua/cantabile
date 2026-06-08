import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { PerformanceCard } from "@/components/performance-card";
import { SectionHeading } from "@/components/section-heading";
import { WorkCard } from "@/components/work-card";
import { works } from "@/data/works";
import { getComposerById, getPerformancesForWork, getWorkBySlug, getWorksByComposerId } from "@/lib/data";
import { composerPath } from "@/lib/routes";

export function generateStaticParams() {
  return works.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = getWorkBySlug(slug);
  const composer = work ? getComposerById(work.composerId) : undefined;

  if (!work) return { title: "作品未找到" };

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
  const work = getWorkBySlug(slug);

  if (!work) notFound();

  const composer = getComposerById(work.composerId);
  const performances = getPerformancesForWork(work.id);
  const siblingWorks = getWorksByComposerId(work.composerId).filter((item) => item.id !== work.id).slice(0, 3);

  return (
    <PageShell eyebrow={work.genre} title={work.titleCn} description={work.description} narrow>
      <div className="cantabile-card">
        <p className="font-serif text-2xl italic text-muted">{work.title}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted">
          {composer ? <Link className="rounded-full bg-burgundy/10 px-3 py-1 font-medium text-burgundy" href={composerPath(composer.slug)}>{composer.nameCn}</Link> : null}
          {work.year ? <span className="rounded-full border border-border px-3 py-1">{work.year}</span> : null}
          <span className="rounded-full border border-border px-3 py-1">{work.period}</span>
        </div>
        {work.movements?.length ? (
          <div className="mt-8">
            <h2 className="font-serif text-2xl font-semibold text-ink">乐章结构</h2>
            <ol className="mt-4 space-y-2 text-muted">
              {work.movements.map((movement, index) => <li key={movement}>{index + 1}. {movement}</li>)}
            </ol>
          </div>
        ) : null}
        <div className="mt-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">推荐聆听</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {work.listeningLinks.map((item) => (
              <a key={item.platform} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-burgundy hover:border-gold" href={item.url} target="_blank" rel="noreferrer">
                {item.platform}
              </a>
            ))}
          </div>
        </div>
      </div>

      {performances.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="Concerts" title="近期包含该作品的演出" />
          <div className="grid gap-5">
            {performances.map((performance) => <PerformanceCard key={performance.id} performance={performance} />)}
          </div>
        </section>
      ) : null}

      {siblingWorks.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="More" title={`继续听 ${composer?.nameCn ?? "同一作曲家"}`} />
          <div className="grid gap-5 md:grid-cols-3">
            {siblingWorks.map((item) => <WorkCard key={item.id} work={item} composer={composer} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
