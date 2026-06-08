"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/data/types";
import { matchesQuery } from "@/lib/search";
import { ArticleCard } from "./article-card";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { SearchBox } from "./search-box";

export function ArticleDirectory({ articles, categories }: { articles: Article[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

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
        <SearchBox value={query} onChange={setQuery} label="搜索专题" placeholder="贝多芬、音乐会、印象主义..." />
        <FilterSelect value={category} onChange={setCategory} label="分类" allLabel="全部分类" options={categories} />
      </div>
      <p className="text-sm text-muted">找到 {filtered.length} 篇专题</p>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
