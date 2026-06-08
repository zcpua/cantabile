import Link from "next/link";
import { notFound } from "next/navigation";
import { ComposerCard } from "@/components/composer-card";
import { PageShell } from "@/components/page-shell";
import { PerformanceCard } from "@/components/performance-card";
import { SectionHeading } from "@/components/section-heading";
import { Timeline } from "@/components/timeline";
import { WorkCard } from "@/components/work-card";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { articlesPath, composerPath, workPath } from "@/i18n/routes";
import { getArticleDetailData, getComposerDetailData, getWorkDetailData } from "@/lib/data";
import { formatArticleDate, formatYearRange } from "@/lib/format-date";

export async function ComposerDetailPageContent({ locale, slug }: { locale: Locale; slug: string }) {
  const dictionary = getDictionary(locale);
  const data = await getComposerDetailData(slug);

  if (!data) notFound();

  const { composer, works, starterWorks, performances, related, workCounts } = data;

  return (
    <PageShell eyebrow={composer.period} title={composer.nameCn} description={composer.shortBio}>
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="cantabile-card h-fit">
          <div className="flex h-40 items-center justify-center rounded-3xl border border-gold/50 bg-gold/10 font-serif text-7xl text-burgundy">
            {composer.nameCn.slice(0, 1)}
          </div>
          <p className="mt-6 text-xl italic text-muted">{composer.name}</p>
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">{dictionary.labels.years}</dt><dd className="font-medium text-ink">{formatYearRange(composer.birthYear, composer.deathYear, dictionary.labels.present)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">{dictionary.labels.country}</dt><dd className="font-medium text-ink">{composer.country}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">{dictionary.labels.works}</dt><dd className="font-medium text-ink">{dictionary.counts.works(works.length)}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {composer.styleTags.map((tag) => <span key={tag} className="rounded-full bg-burgundy/10 px-3 py-1 text-xs text-burgundy">{tag}</span>)}
          </div>
        </aside>
        <div className="space-y-12">
          <section className="prose-cantabile rounded-[2rem] border border-border bg-white/60 p-6 sm:p-8">
            <h2 className="font-serif text-3xl font-semibold text-ink">{dictionary.labels.bio}</h2>
            <p>{composer.bio}</p>
          </section>
          <section>
            <SectionHeading eyebrow="Timeline" title={dictionary.labels.timeline} />
            <Timeline items={composer.timeline} />
          </section>
        </div>
      </div>

      <section className="mt-14">
        <SectionHeading eyebrow="Works" title={dictionary.labels.representativeWorks} description={locale === "zh-CN" ? "从这些作品开始理解这位作曲家的声音。" : "Start with these works to understand this composer's sound."} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => <WorkCard key={work.id} work={work} composer={composer} locale={locale} />)}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading eyebrow="Starter Path" title={dictionary.labels.starterPath} />
        <ol className="grid gap-4 md:grid-cols-3">
          {starterWorks.map((work, index) => (
            <li key={work.id} className="cantabile-card">
              <p className="eyebrow">No. {index + 1}</p>
              <Link className="mt-3 block font-serif text-2xl font-semibold text-ink hover:text-burgundy" href={workPath(locale, work.slug)}>{work.titleCn}</Link>
              <p className="mt-3 text-sm leading-6 text-muted">{work.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {performances.length ? (
        <section className="mt-14">
          <SectionHeading eyebrow="Concerts" title={dictionary.labels.relatedPerformances} />
          <div className="grid gap-5 lg:grid-cols-2">
            {performances.map((performance) => <PerformanceCard key={performance.id} performance={performance} locale={locale} />)}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-14">
          <SectionHeading eyebrow="Related" title={dictionary.labels.relatedComposers} />
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((item) => <ComposerCard key={item.id} composer={item} workCount={workCounts[item.id] ?? 0} locale={locale} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export async function WorkDetailPageContent({ locale, slug }: { locale: Locale; slug: string }) {
  const dictionary = getDictionary(locale);
  const data = await getWorkDetailData(slug);

  if (!data) notFound();

  const { work, composer, performances, siblingWorks } = data;

  return (
    <PageShell eyebrow={work.genre} title={work.titleCn} description={work.description} narrow>
      <div className="cantabile-card">
        <p className="font-serif text-2xl italic text-muted">{work.title}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted">
          {composer ? <Link className="rounded-full bg-burgundy/10 px-3 py-1 font-medium text-burgundy" href={composerPath(locale, composer.slug)}>{composer.nameCn}</Link> : null}
          {work.year ? <span className="rounded-full border border-border px-3 py-1">{work.year}</span> : null}
          <span className="rounded-full border border-border px-3 py-1">{work.period}</span>
        </div>
        {work.movements?.length ? (
          <div className="mt-8">
            <h2 className="font-serif text-2xl font-semibold text-ink">{dictionary.labels.movements}</h2>
            <ol className="mt-4 space-y-2 text-muted">
              {work.movements.map((movement, index) => <li key={movement}>{index + 1}. {movement}</li>)}
            </ol>
          </div>
        ) : null}
        <div className="mt-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">{dictionary.labels.listening}</h2>
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
          <SectionHeading eyebrow="Concerts" title={dictionary.labels.performancesWithWork} />
          <div className="grid gap-5">
            {performances.map((performance) => <PerformanceCard key={performance.id} performance={performance} locale={locale} />)}
          </div>
        </section>
      ) : null}

      {siblingWorks.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="More" title={dictionary.labels.continueWithComposer(composer?.nameCn ?? dictionary.labels.sameComposer)} />
          <div className="grid gap-5 md:grid-cols-3">
            {siblingWorks.map((item) => <WorkCard key={item.id} work={item} composer={composer} locale={locale} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export async function ArticleDetailPageContent({ locale, slug }: { locale: Locale; slug: string }) {
  const dictionary = getDictionary(locale);
  const data = await getArticleDetailData(slug);

  if (!data) notFound();

  const { article, relatedComposers, relatedWorks, workComposers, workCounts } = data;

  return (
    <PageShell eyebrow={article.category} title={article.title} description={article.excerpt} narrow>
      <article className="cantabile-card prose-cantabile">
        <p className="text-sm text-muted">{formatArticleDate(article.publishedAt, locale)}</p>
        {article.content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <Link className="mt-8 inline-block text-sm font-semibold text-burgundy underline-offset-4 hover:underline" href={articlesPath(locale)}>{dictionary.labels.backToArticles}</Link>
      </article>

      {relatedWorks.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="Related Works" title={dictionary.labels.relatedWorks} />
          <div className="grid gap-5 md:grid-cols-2">
            {relatedWorks.map((work) => <WorkCard key={work.id} work={work} composer={workComposers[work.id]} locale={locale} />)}
          </div>
        </section>
      ) : null}

      {relatedComposers.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="Related Composers" title={dictionary.labels.articleComposers} />
          <div className="grid gap-5 md:grid-cols-2">
            {relatedComposers.map((composer) => <ComposerCard key={composer.id} composer={composer} workCount={workCounts[composer.id] ?? 0} locale={locale} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
