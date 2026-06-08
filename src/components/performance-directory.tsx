"use client";

import { useMemo, useState } from "react";
import type { Composer, Performance } from "@/data/types";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { matchesQuery } from "@/lib/search";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { PerformanceCard } from "./performance-card";
import { SearchBox } from "./search-box";

function inDateRange(startsAt: string, range: string) {
  if (!range) return true;
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "7") return start <= now + 7 * day;
  if (range === "30") return start <= now + 30 * day;
  if (range === "90") return start <= now + 90 * day;
  return true;
}

export function PerformanceDirectory({
  performances,
  composers,
  cities,
  venues,
  locale,
  dictionary,
}: {
  performances: Performance[];
  composers: Composer[];
  cities: string[];
  venues: string[];
  locale?: Locale;
  dictionary?: Dictionary;
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [composerId, setComposerId] = useState("");
  const [venue, setVenue] = useState("");
  const activeLocale = locale ?? defaultLocale;
  const t = dictionary ?? getDictionary(activeLocale);

  const composerMap = useMemo(() => new Map(composers.map((composer) => [composer.id, composer])), [composers]);
  const composerOptions = composers.map((composer) => ({ label: composer.nameCn, value: composer.id }));
  const dateOptions = [
    { value: "7", label: t.filters.next7Days },
    { value: "30", label: t.filters.next30Days },
    { value: "90", label: t.filters.next90Days },
  ];

  const filtered = useMemo(
    () =>
      performances.filter((performance) => {
        const programComposers = performance.program.map((item) => item.composerId ? composerMap.get(item.composerId) : undefined);
        return (
          (!city || performance.city === city) &&
          (!venue || performance.venue === venue) &&
          (!composerId || performance.program.some((item) => item.composerId === composerId)) &&
          inDateRange(performance.startsAt, dateRange) &&
          matchesQuery([
            performance.title,
            performance.city,
            performance.venue,
            ...performance.artists,
            ...performance.program.map((item) => item.displayTitle),
            ...programComposers.flatMap((composer) => [composer?.nameCn, composer?.name]),
          ], query)
        );
      }),
    [city, composerId, composerMap, dateRange, performances, query, venue],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm md:grid-cols-5">
        <SearchBox value={query} onChange={setQuery} label={t.filters.performanceSearch} placeholder={t.filters.performancePlaceholder} />
        <FilterSelect value={city} onChange={setCity} label={t.filters.city} allLabel={t.filters.allCities} options={cities} />
        <FilterSelect value={dateRange} onChange={setDateRange} label={t.filters.date} allLabel={t.filters.allDates} options={dateOptions} />
        <FilterSelect value={composerId} onChange={setComposerId} label={t.filters.composer} allLabel={t.filters.allComposers} options={composerOptions} />
        <FilterSelect value={venue} onChange={setVenue} label={t.filters.venue} allLabel={t.filters.allVenues} options={venues} />
      </div>
      <p className="text-sm text-muted">{t.counts.performances(filtered.length)}</p>
      {filtered.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((performance) => (
            <PerformanceCard key={performance.id} performance={performance} locale={activeLocale} dictionary={t} />
          ))}
        </div>
      ) : (
        <EmptyState title={t.empty.title} description={t.empty.description} />
      )}
    </div>
  );
}
