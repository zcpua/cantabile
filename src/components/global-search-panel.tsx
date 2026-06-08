"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Article, Composer, Performance, Work } from "@/data/types";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { articlePath as localizedArticlePath, composerPath as localizedComposerPath, performancesPath as localizedPerformancesPath, workPath as localizedWorkPath } from "@/i18n/routes";
import { articlePath, composerPath, workPath } from "@/lib/routes";
import { matchesQuery } from "@/lib/search";
import { SearchBox } from "./search-box";

export function GlobalSearchPanel({
  composers,
  works,
  performances,
  articles,
  locale,
  dictionary,
}: {
  composers: Composer[];
  works: Work[];
  performances: Performance[];
  articles: Article[];
  locale?: Locale;
  dictionary?: Dictionary;
}) {
  const [query, setQuery] = useState("");
  const activeLocale = locale ?? defaultLocale;
  const t = dictionary ?? getDictionary(activeLocale);

  const results = useMemo(() => {
    if (!query.trim()) {
      return { composers: [], works: [], performances: [], articles: [] };
    }

    return {
      composers: composers
        .filter((composer) => matchesQuery([composer.nameCn, composer.name, composer.country, composer.period, composer.shortBio], query))
        .slice(0, 4),
      works: works
        .filter((work) => matchesQuery([work.titleCn, work.title, work.genre, work.period, work.description], query))
        .slice(0, 4),
      performances: performances
        .filter((performance) =>
          matchesQuery([performance.title, performance.city, performance.venue, ...performance.artists, ...performance.program.map((item) => item.displayTitle)], query),
        )
        .slice(0, 3),
      articles: articles
        .filter((article) => matchesQuery([article.title, article.excerpt, article.category, article.content], query))
        .slice(0, 3),
    };
  }, [articles, composers, performances, query, works]);

  const total = results.composers.length + results.works.length + results.performances.length + results.articles.length;
  const composerHref = (slug: string) => locale ? localizedComposerPath(locale, slug) : composerPath(slug);
  const workHref = (slug: string) => locale ? localizedWorkPath(locale, slug) : workPath(slug);
  const articleHref = (slug: string) => locale ? localizedArticlePath(locale, slug) : articlePath(slug);
  const performancesHref = locale ? localizedPerformancesPath(locale) : "/performances";

  return (
    <div className="rounded-[2rem] border border-border bg-white/75 p-4 shadow-xl shadow-burgundy/5 sm:p-6">
      <SearchBox value={query} onChange={setQuery} label={t.search.globalLabel} placeholder={t.search.globalPlaceholder} />
      {query.trim() ? (
        <div className="mt-6 space-y-5">
          {total ? <p className="text-sm text-muted">{t.search.foundEntries(total)}</p> : <p className="text-sm text-muted">{t.search.noResults}</p>}
          <SearchGroup title={t.search.groups.composers} items={results.composers.map((item) => ({ href: composerHref(item.slug), title: item.nameCn, meta: item.name }))} />
          <SearchGroup title={t.search.groups.works} items={results.works.map((item) => ({ href: workHref(item.slug), title: item.titleCn, meta: item.title }))} />
          <SearchGroup title={t.search.groups.performances} items={results.performances.map((item) => ({ href: performancesHref, title: item.title, meta: `${item.city} · ${item.venue}` }))} />
          <SearchGroup title={t.search.groups.articles} items={results.articles.map((item) => ({ href: articleHref(item.slug), title: item.title, meta: item.category }))} />
        </div>
      ) : null}
    </div>
  );
}

function SearchGroup({ title, items }: { title: string; items: { href: string; title: string; meta: string }[] }) {
  if (!items.length) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={`${title}-${item.title}`} href={item.href} className="rounded-2xl border border-border bg-ivory/70 p-3 transition hover:border-gold hover:bg-white">
            <span className="block font-medium text-ink">{item.title}</span>
            <span className="mt-1 block text-xs text-muted">{item.meta}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
