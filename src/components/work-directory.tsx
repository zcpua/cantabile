"use client";

import { useMemo, useState } from "react";
import type { Composer, Work } from "@/data/types";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { matchesQuery } from "@/lib/search";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { SearchBox } from "./search-box";
import { WorkCard } from "./work-card";

export function WorkDirectory({
  works,
  composers,
  genres,
  periods,
  locale,
  dictionary,
}: {
  works: Work[];
  composers: Composer[];
  genres: string[];
  periods: string[];
  locale?: Locale;
  dictionary?: Dictionary;
}) {
  const [query, setQuery] = useState("");
  const [composerId, setComposerId] = useState("");
  const [genre, setGenre] = useState("");
  const [period, setPeriod] = useState("");
  const activeLocale = locale ?? defaultLocale;
  const t = dictionary ?? getDictionary(activeLocale);

  const composerMap = useMemo(() => new Map(composers.map((composer) => [composer.id, composer])), [composers]);
  const composerOptions = composers.map((composer) => ({ label: composer.nameCn, value: composer.id }));

  const filtered = useMemo(
    () =>
      works.filter((work) => {
        const composer = composerMap.get(work.composerId);
        return (
          (!composerId || work.composerId === composerId) &&
          (!genre || work.genre === genre) &&
          (!period || work.period === period) &&
          matchesQuery([work.titleCn, work.title, work.genre, work.period, work.description, composer?.nameCn, composer?.name], query)
        );
      }),
    [composerId, composerMap, genre, period, query, works],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm md:grid-cols-4">
        <SearchBox value={query} onChange={setQuery} label={t.filters.workSearch} placeholder={t.filters.workPlaceholder} />
        <FilterSelect value={composerId} onChange={setComposerId} label={t.filters.composer} allLabel={t.filters.allComposers} options={composerOptions} />
        <FilterSelect value={genre} onChange={setGenre} label={t.filters.genre} allLabel={t.filters.allGenres} options={genres} />
        <FilterSelect value={period} onChange={setPeriod} label={t.filters.period} allLabel={t.filters.allPeriods} options={periods} />
      </div>
      <p className="text-sm text-muted">{t.counts.works(filtered.length)}</p>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((work) => (
            <WorkCard key={work.id} work={work} composer={composerMap.get(work.composerId)} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState title={t.empty.title} description={t.empty.description} />
      )}
    </div>
  );
}
