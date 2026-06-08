"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/data/types";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { matchesQuery } from "@/lib/search";
import { ArticleCard } from "./article-card";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { SearchBox } from "./search-box";

export function ArticleDirectory({ articles, categories, locale, dictionary }: { articles: Article[]; categories: string[]; locale?: Locale; dictionary?: Dictionary }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const activeLocale = locale ?? defaultLocale;
  const t = dictionary ?? getDictionary(activeLocale);

  const filtered = useMemo(
    () =>
      articles.filter(
        (article) =>
          (!category || article.category === category) &&
          matchesQuery([article.title, article.excerpt, article.category, article.content], query),
      ),
    [articles, category, query],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm sm:grid-cols-2">
        <SearchBox value={query} onChange={setQuery} label={t.filters.articleSearch} placeholder={t.filters.articlePlaceholder} />
        <FilterSelect value={category} onChange={setCategory} label={t.filters.category} allLabel={t.filters.allCategories} options={categories} />
      </div>
      <p className="text-sm text-muted">{t.counts.articles(filtered.length)}</p>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState title={t.empty.title} description={t.empty.description} />
      )}
    </div>
  );
}
