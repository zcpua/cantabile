export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import { ComposerCard } from "@/components/composer-card";
import { GlobalSearchPanel } from "@/components/global-search-panel";
import { PerformanceCard } from "@/components/performance-card";
import { SectionHeading } from "@/components/section-heading";
import { WorkCard } from "@/components/work-card";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { composersPath, performancesPath, worksPath, articlesPath } from "@/i18n/routes";
import { getHomePageData } from "@/lib/data";

export async function HomePage({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { articles, composers, performances, works, featuredComposers, featuredWorks, upcoming, beginnerArticles, composerWorkCounts } = await getHomePageData();

  return (
    <main className="flex-1">
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="eyebrow">{dictionary.home.eyebrow}</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight tracking-tight text-ink sm:text-7xl">
            {dictionary.home.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{dictionary.home.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-burgundy/20 transition hover:bg-ink" href={composersPath(locale)}>
              {dictionary.home.browseComposers}
            </Link>
            <Link className="rounded-full border border-border bg-white/60 px-5 py-3 text-sm font-semibold text-ink transition hover:border-gold" href={performancesPath(locale)}>
              {dictionary.home.viewPerformances}
            </Link>
          </div>
        </div>
        <GlobalSearchPanel composers={composers} works={works} performances={performances} articles={articles} locale={locale} />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading {...dictionary.home.sections.composers} href={composersPath(locale)} linkLabel={dictionary.home.sections.composers.link} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredComposers.map((composer) => (
            <ComposerCard key={composer.id} composer={composer} workCount={composerWorkCounts[composer.id] ?? 0} locale={locale} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading {...dictionary.home.sections.performances} href={performancesPath(locale)} linkLabel={dictionary.home.sections.performances.link} />
        <div className="grid gap-5 lg:grid-cols-3">
          {upcoming.map((performance) => (
            <PerformanceCard key={performance.id} performance={performance} locale={locale} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading {...dictionary.home.sections.works} href={worksPath(locale)} linkLabel={dictionary.home.sections.works.link} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredWorks.map((work) => (
            <WorkCard key={work.id} work={work} composer={composers.find((composer) => composer.id === work.composerId)} locale={locale} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 pb-20 sm:px-8">
        <SectionHeading {...dictionary.home.sections.articles} href={articlesPath(locale)} linkLabel={dictionary.home.sections.articles.link} />
        <div className="grid gap-5 md:grid-cols-3">
          {beginnerArticles.map((article) => (
            <ArticleCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      </section>
    </main>
  );
}
