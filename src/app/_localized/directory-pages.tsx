export const dynamic = "force-dynamic";

import { ArticleDirectory } from "@/components/article-directory";
import { ComposerDirectory } from "@/components/composer-directory";
import { PageShell } from "@/components/page-shell";
import { PerformanceDirectory } from "@/components/performance-directory";
import { WorkDirectory } from "@/components/work-directory";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getArticleDirectoryData, getComposerDirectoryData, getPerformanceDirectoryData, getWorkDirectoryData } from "@/lib/data";

export async function ComposersPageContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { composers, workCounts, periods, countries } = await getComposerDirectoryData(locale);

  return (
    <PageShell {...dictionary.pages.composers}>
      <ComposerDirectory composers={composers} workCounts={workCounts} periods={periods} countries={countries} locale={locale} />
    </PageShell>
  );
}

export async function WorksPageContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { works, composers, genres, periods } = await getWorkDirectoryData(locale);

  return (
    <PageShell {...dictionary.pages.works}>
      <WorkDirectory works={works} composers={composers} genres={genres} periods={periods} locale={locale} />
    </PageShell>
  );
}

export async function PerformancesPageContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { performances, composers, cities, venues } = await getPerformanceDirectoryData(locale);

  return (
    <PageShell {...dictionary.pages.performances}>
      <PerformanceDirectory performances={performances} composers={composers} cities={cities} venues={venues} locale={locale} />
    </PageShell>
  );
}

export async function ArticlesPageContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { articles, categories } = await getArticleDirectoryData();

  return (
    <PageShell {...dictionary.pages.articles}>
      <ArticleDirectory articles={articles} categories={categories} locale={locale} />
    </PageShell>
  );
}

export function AboutPageContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);

  return (
    <PageShell {...dictionary.pages.about} narrow>
      <div className="prose-cantabile rounded-[2rem] border border-border bg-white/65 p-6 shadow-sm sm:p-10">
        {dictionary.about.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </PageShell>
  );
}
