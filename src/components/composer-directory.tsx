"use client";

import { useMemo, useState } from "react";
import type { Composer } from "@/data/types";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { matchesQuery } from "@/lib/search";
import { ComposerCard } from "./composer-card";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { SearchBox } from "./search-box";

export function ComposerDirectory({
  composers,
  workCounts,
  periods,
  countries,
  locale,
  dictionary,
}: {
  composers: Composer[];
  workCounts: Record<string, number>;
  periods: string[];
  countries: string[];
  locale?: Locale;
  dictionary?: Dictionary;
}) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [country, setCountry] = useState("");
  const activeLocale = locale ?? defaultLocale;
  const t = dictionary ?? getDictionary(activeLocale);

  const filtered = useMemo(
    () =>
      composers.filter(
        (composer) =>
          (!period || composer.period === period) &&
          (!country || composer.country === country) &&
          matchesQuery([composer.nameCn, composer.name, composer.country, composer.period, composer.shortBio, ...composer.styleTags], query),
      ),
    [composers, country, period, query],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm sm:grid-cols-3">
        <SearchBox value={query} onChange={setQuery} label={t.filters.composerSearch} placeholder={t.filters.composerPlaceholder} />
        <FilterSelect value={period} onChange={setPeriod} label={t.filters.period} allLabel={t.filters.allPeriods} options={periods} />
        <FilterSelect value={country} onChange={setCountry} label={t.filters.country} allLabel={t.filters.allCountries} options={countries} />
      </div>
      <p className="text-sm text-muted">{t.counts.composers(filtered.length)}</p>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((composer) => (
            <ComposerCard key={composer.id} composer={composer} workCount={workCounts[composer.id] ?? 0} locale={locale} dictionary={t} />
          ))}
        </div>
      ) : (
        <EmptyState title={t.empty.title} description={t.empty.description} />
      )}
    </div>
  );
}
